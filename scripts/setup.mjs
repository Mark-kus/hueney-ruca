import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { checkEnv, loadEnv } from "./check-env.mjs";

/**
 * Setup idempotente de Hueney Ruca.
 *   node scripts/setup.mjs [--dry-run]
 *
 * 1. Valora variables de entorno
 * 2. Crea buckets de storage si faltan
 * 3. Asegura el catálogo de roles
 * 4. Crea/actualiza el superadmin (ADMIN_EMAIL / ADMIN_PASSWORD)
 * 5. Sincroniza products + prices de Stripe con la tabla `rooms`
 */

const DRY_RUN = process.argv.includes("--dry-run");
const errors = [];
const changes = [];

loadEnv();
const { ok, missing } = checkEnv("setup");
if (!ok) {
  console.error(`\n[setup] FALTAN VARIABLES OBLIGATORIAS:\n${missing.join("\n")}\n`);
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function done(msg) {
  console.log(`  ok   ${msg}`);
}
function act(msg) {
  console.log(`  ${DRY_RUN ? "dry  " : "do   "} ${msg}`);
  if (!DRY_RUN) changes.push(msg);
}
function warn(msg) {
  console.log(`  warn ${msg}`);
}
function fail(step, err) {
  const msg = `${step}: ${err?.message || err}`;
  console.error(`  ERR  ${msg}`);
  errors.push(msg);
}

// ---------------------------------------------------------------
// 1. Storage buckets
// ---------------------------------------------------------------
async function ensureBuckets() {
  console.log("\n[setup] storage buckets");
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    for (const id of ["cabanas_gallery", "avatars", "hueney_ruca"]) {
      if (buckets.some((b) => b.id === id)) {
        done(`bucket "${id}" ya existe`);
      } else {
        act(`crear bucket público "${id}"`);
        if (!DRY_RUN) {
          const { error } = await supabase.storage.createBucket(id, { public: true });
          if (error) throw error;
        }
      }
    }
  } catch (err) {
    fail("buckets", err);
  }
}

// ---------------------------------------------------------------
// 2. roles
// ---------------------------------------------------------------
async function ensureRoles() {
  console.log("[setup] roles");
  const wanted = [
    { name: "usuario", type: 1 },
    { name: "admin", type: 2 },
    { name: "superadmin", type: 3 },
  ];
  try {
    const { data: existing, error } = await supabase.from("roles").select("id, type");
    if (error) throw error;
    const missing = wanted.filter((w) => !existing.some((e) => e.type === w.type));
    if (!missing.length) {
      done("catálogo de roles completo");
      return;
    }
    act(`insertar roles: ${missing.map((m) => m.name).join(", ")}`);
    if (!DRY_RUN) {
      const { error } = await supabase.from("roles").insert(missing);
      if (error) throw error;
    }
  } catch (err) {
    fail(`roles (¿corriste npm run db:migrate? — ${err.message})`, err);
  }
}

// ---------------------------------------------------------------
// 3. Superadmin
// ---------------------------------------------------------------
async function ensureAdmin() {
  console.log("[setup] superadmin");
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    warn("ADMIN_EMAIL / ADMIN_PASSWORD no definidos — skip");
    return;
  }
  try {
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) throw listError;
    let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      act(`crear usuario ${email} (sin confirmación de email)`);
      if (!DRY_RUN) {
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (error) throw error;
        user = data.user;
      }
    } else {
      done(`usuario ${email} ya existe (password intacto)`);
      if (!user.user_metadata) user.user_metadata = {};
    }

    const authId = user?.id;
    if (DRY_RUN && !authId) {
      act("asignar role=3 al perfil del superadmin");
      return;
    }
    if (!authId) return;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_id", authId)
      .maybeSingle();
    if (profileError) throw profileError;

    if (!profile) {
      act("crear perfil faltante con role=3");
      if (!DRY_RUN) {
        const { error } = await supabase
          .from("profiles")
          .insert({ auth_id: authId, email, role: 3, full_name: email.split("@")[0] });
        if (error) throw error;
      }
    } else if (profile.role !== 3) {
      act(`actualizar role ${profile.role} -> 3`);
      if (!DRY_RUN) {
        const { error } = await supabase
          .from("profiles")
          .update({ role: 3 })
          .eq("id", profile.id);
        if (error) throw error;
      }
    } else {
      done("perfil con role=3 OK");
    }
  } catch (err) {
    fail("admin", err);
  }
}

// ---------------------------------------------------------------
// 4. Stripe: products + prices <-> rooms
// ---------------------------------------------------------------
const roomMeta = (room) => ({
  type: String(room.type),
  rooms: String(room.rooms),
  capacity: String(room.capacity),
  beds: String(room.beds),
  price_metadata: String(room.price),
});

async function ensurePrice(stripe, room, product) {
  const target = Math.round(Number(room.price) * 100);
  let price = null;
  if (product.default_price) {
    price =
      typeof product.default_price === "string"
        ? await stripe.prices.retrieve(product.default_price)
        : product.default_price;
  }
  if (price && price.active && price.unit_amount === target && price.currency === "ars") {
    return null;
  }
  act(
    `room "${room.name}": precio ${price ? `${price.unit_amount / 100} -> ` : ""}${room.price} ARS/noche`
  );
  if (DRY_RUN) return null;
  const newPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: target,
    currency: "ars",
  });
  await stripe.products.update(product.id, { default_price: newPrice.id });
  if (price && price.active) await stripe.prices.update(price.id, { active: false });
  return newPrice.id;
}

async function syncStripe() {
  console.log("[setup] stripe");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    warn("STRIPE_SECRET_KEY no definido — skip");
    return;
  }

  let rooms;
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, description, price, type, rooms, capacity, beds, stripe_product_id, deleted_at")
      .is("deleted_at", null)
      .order("id");
    if (error) throw error;
    rooms = data;
  } catch (err) {
    fail(`rooms (¿corriste npm run db:migrate? — ${err.message})`, err);
    return;
  }

  try {
    const stripe = new Stripe(key);
    const products = [];
    for await (const p of stripe.products.list({ limit: 100 })) products.push(p);
    const byId = new Map(products.map((p) => [p.id, p]));
    const byName = new Map();
    for (const p of products) if (!byName.has(p.name) || p.active) byName.set(p.name, p);

    const roomIdsByName = new Set(rooms.map((r) => r.name));
    const adopted = new Set();
    const dbUpdates = [];

    for (const room of rooms) {
      try {
        let product =
          (room.stripe_product_id && byId.get(room.stripe_product_id)) || null;

        if (!product) {
          const candidate = byName.get(room.name);
          if (candidate && !adopted.has(candidate.id)) {
            product = candidate;
            adopted.add(product.id);
            act(`room "${room.name}": adoptar product existente ${product.id}`);
            dbUpdates.push({ id: room.id, stripe_product_id: product.id });
          }
        } else {
          adopted.add(product.id);
        }

        if (!product) {
          act(`room "${room.name}": crear product + price (${room.price} ARS)`);
          if (DRY_RUN) continue;
          product = await stripe.products.create({
            name: room.name,
            description: room.description || "",
            metadata: roomMeta(room),
          });
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(Number(room.price) * 100),
            currency: "ars",
          });
          await stripe.products.update(product.id, { default_price: price.id });
          dbUpdates.push({ id: room.id, stripe_product_id: product.id });
          continue;
        }

        // sincronizar name / description / metadata / active / price
        const updates = {};
        if (product.name !== room.name) {
          updates.name = room.name;
        }
        if ((product.description || "") !== (room.description || "")) {
          updates.description = room.description || "";
        }
        if (!product.active) updates.active = true;
        const meta = roomMeta(room);
        const metaDiff = Object.entries(meta).some(([k, v]) => product.metadata?.[k] !== v);
        if (metaDiff) updates.metadata = meta;

        if (Object.keys(updates).length) {
          act(`room "${room.name}": actualizar product (${Object.keys(updates).join(", ")})`);
          if (!DRY_RUN) await stripe.products.update(product.id, updates);
        }

        await ensurePrice(stripe, room, product);
      } catch (err) {
        fail(`room "${room.name}"`, err);
      }
    }

    const orphans = products.filter(
      (p) => p.active && !roomIdsByName.has(p.name) && !adopted.has(p.id)
    );
    if (orphans.length) {
      warn(
        `products activos sin cabaña asociada (no se tocaron): ${orphans
          .map((p) => `${p.name} (${p.id})`)
          .join(", ")}`
      );
    }

    if (dbUpdates.length) {
      act(`guardar stripe_product_id en ${dbUpdates.length} room(s)`);
      if (!DRY_RUN) {
        for (const u of dbUpdates) {
          const { error } = await supabase
            .from("rooms")
            .update({ stripe_product_id: u.stripe_product_id })
            .eq("id", u.id);
          if (error) fail(`rooms#${u.id}`, error);
        }
      }
    }

    if (!orphans.length && !dbUpdates.length) done("products/precios sincronizados");
  } catch (err) {
    fail("stripe", err);
  }
}

// ---------------------------------------------------------------
async function main() {
  console.log(`\n[setup] inicio${DRY_RUN ? " (dry-run: no se escribe nada)" : ""}`);

  await ensureBuckets();
  await ensureRoles();
  await ensureAdmin();
  await syncStripe();

  console.log("");
  if (errors.length) {
    console.error(`[setup] ${errors.length} error(es):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  if (DRY_RUN) {
    console.log("[setup] dry-run terminado (sin cambios aplicados)\n");
  } else if (changes.length) {
    console.log(`[setup] ${changes.length} cambio(s) aplicados\n`);
  } else {
    console.log("[setup] todo ya estaba configurado\n");
  }
}

main();
