import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(process.cwd());

/**
 * Carga .env / .env.local sin dependencias externas.
 * No pisa variables ya presentes en process.env.
 */
export function loadEnv(dir = ROOT) {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(dir, file);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
  return process.env;
}

const VAR = "variable";
const RULES = {
  dev: {
    required: [
      ["NEXT_PUBLIC_SUPABASE_URL", "Supabase > Project Settings > API > Project URL"],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase > Project Settings > API > anon public"],
    ],
    optional: [
      ["STRIPE_SECRET_KEY", "Stripe > Developers > API keys"],
      ["NEXT_PUBLIC_STRIPE_KEY", "Stripe > Developers > API keys"],
      ["NEXT_PUBLIC_EMAIL_PUBLIC_KEY", "EmailJS"],
      ["NEXT_PUBLIC_EMAIL_SERVICE_ID", "EmailJS"],
      ["NEXT_PUBLIC_EMAIL_TEMPLATE_GENERIC", "EmailJS"],
      ["NEXT_PUBLIC_EMAIL_TEMPLATE_CONTACT", "EmailJS"],
    ],
  },
  build: {
    required: [
      ["NEXT_PUBLIC_SUPABASE_URL", "Supabase > Project Settings > API > Project URL"],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase > Project Settings > API > anon public"],
    ],
    optional: [
      ["STRIPE_SECRET_KEY", "Stripe (los precios se cargan en runtime, no en build)"],
    ],
  },
  setup: {
    required: [
      ["NEXT_PUBLIC_SUPABASE_URL", "Supabase > Project Settings > API > Project URL"],
      ["SUPABASE_SERVICE_ROLE_KEY", "Supabase > Project Settings > API > service_role"],
    ],
    optional: [
      ["STRIPE_SECRET_KEY", "sync de productos/precios de cabañas (opcional)"],
      ["ADMIN_EMAIL", "bootstrap del usuario superadmin (opcional)"],
      ["ADMIN_PASSWORD", "bootstrap del usuario superadmin (opcional)"],
    ],
  },
  migrate: {
    required: [["SUPABASE_PROJECT_REF", "ref del proyecto Supabase (https://<REF>.supabase.co)"]],
    optional: [
      ["SUPABASE_ACCESS_TOKEN", "token de la CLI (supabase login)"],
      ["SUPABASE_DB_PASSWORD", "password de la base (Dashboard > Settings > Database)"],
      ["SUPABASE_DB_URL", "o URL directa postgresql://... como alternativa al password"],
    ],
  },
};

/**
 * Valida variables de entorno para un contexto.
 * @param {"dev"|"build"|"setup"|"migrate"} context
 * @returns {{ok: boolean, missing: Array, warnings: Array}}
 */
export function checkEnv(context) {
  loadEnv();
  const rules = RULES[context];
  if (!rules) throw new Error(`contexto desconocido: ${context}`);

  const missing = [];
  const warnings = [];

  for (const [name, hint] of rules.required) {
    if (!process.env[name]) missing.push(`  - ${name}  (${hint})`);
  }
  for (const [name, hint] of rules.optional) {
    if (!process.env[name]) warnings.push(`  - ${name}  (${hint})`);
  }

  return { ok: missing.length === 0, missing, warnings };
}

function main() {
  const context = process.argv[2] || "dev";
  if (!RULES[context]) {
    console.error(`Uso: node scripts/check-env.mjs [${Object.keys(RULES).join("|")}]`);
    process.exit(2);
  }
  const { ok, missing, warnings } = checkEnv(context);

  if (warnings.length) {
    console.log(`\n[${context}] opcionales sin definir:`);
    console.log(warnings.join("\n"));
  }
  if (!ok) {
    console.error(`\n[${context}] FALTAN VARIABLES OBLIGATORIAS:`);
    console.error(missing.join("\n"));
    console.error("\nCopiá .env.example a .env y completá los valores.\n");
    process.exit(1);
  }
  console.log(`\n[${context}] variables de entorno OK\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
