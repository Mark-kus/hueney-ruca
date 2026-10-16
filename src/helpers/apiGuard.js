import { createServerClient } from "@supabase/ssr";

/**
 * Guardas de autenticación para las API routes.
 *
 * La app escribe en Supabase desde el navegador con la anon key, por lo que
 * estas guardas son la única verificación de permisos del lado del servidor
 * para las rutas de escritura (no confían en ids enviados por el cliente).
 */

function parseCookies(header = "") {
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf("=");
      return {
        name: idx === -1 ? part : part.slice(0, idx),
        value: idx === -1 ? "" : part.slice(idx + 1),
      };
    });
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
  if (options.secure) parts.push("Secure");
  if (options.httpOnly) parts.push("HttpOnly");
  return parts.join("; ");
}

export function createApiSupabaseClient(req, res) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookies(req.headers.cookie);
        },
        setAll(cookiesToSet, headers) {
          const current = res.getHeader("Set-Cookie");
          const list = current
            ? Array.isArray(current)
              ? current
              : [current]
            : [];
          for (const { name, value, options } of cookiesToSet) {
            list.push(serializeCookie(name, value, options));
          }
          res.setHeader("Set-Cookie", list);
          // Evita que respuestas con cookies de auth queden cacheadas
          for (const [key, value] of Object.entries(headers || {})) {
            res.setHeader(key, value);
          }
        },
      },
    }
  );
}

/**
 * Verifica sesión y rol mínimo (1 usuario, 2 admin, 3 superadmin).
 * Si no autoriza, responde y devuelve null.
 * Si autoriza, devuelve { supabase, user, profile } y deja req.profile.
 */
export async function requireRole(req, res, minRole = 1) {
  try {
    const supabase = createApiSupabaseClient(req, res);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      res.status(401).json({ error: "No autenticado" });
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, suspended, email, full_name")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (profileError) {
      res.status(500).json({ error: profileError.message });
      return null;
    }
    if (!profile) {
      res.status(403).json({ error: "Perfil no encontrado" });
      return null;
    }
    if (profile.suspended) {
      res.status(403).json({ error: "Usuario suspendido" });
      return null;
    }
    if ((profile.role ?? 1) < minRole) {
      res.status(403).json({ error: "Permisos insuficientes" });
      return null;
    }

    req.profile = profile;
    return { supabase, user, profile };
  } catch (err) {
    res.status(500).json({ error: err.message });
    return null;
  }
}

export const requireSession = (req, res) => requireRole(req, res, 1);
export const requireAdmin = (req, res) => requireRole(req, res, 2);
export const requireSuperAdmin = (req, res) => requireRole(req, res, 3);
