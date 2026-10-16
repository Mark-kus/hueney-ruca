# Hueney Ruca 🏡🍃

### Sobre Hueney Ruca:
"Hueney Ruca" se pronuncia aproximadamente "Uénei Ruka", con una pronunciación suave de la "r". Se trata de una expresión en mapudungun, la lengua del pueblo Mapuche de Chile y Argentina. "Hueney" significa "universo" o "cosmos", mientras que "Ruca" se refiere a una "casa" o "vivienda". Por lo tanto, "Hueney Ruca" se traduce aproximadamente como "Casa del Universo" o "Vivienda del Cosmos".

Es un proyecto realizado en el bootcamp de SoyHenry y presentado como proyecto final para aprobar el curso. Fue pedido por la empresa del mismo nombre, con el objetivo de publicar sus hospedajes y que los usuarios puedieran reservarlas.

## Stack
- **Frontend + backend:** Next.js 13 (Pages Router)
- **Base de datos y auth:** Supabase (PostgreSQL + Storage + Auth)
- **Pagos:** Stripe (Checkout Sessions)

## Requisitos
- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase`) y un proyecto en supabase.com
- Cuenta de Stripe (modo test alcanza para desarrollo)

## Levantar la página en tu local
1. Clona este repositorio.
2. Instalá las dependencias:
   ```bash
   npm i
   ```
3. Creá el archivo `.env` a partir del ejemplo y completalo:
   ```bash
   cp .env.example .env
   ```
   Completá al menos:
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API) — **solo para los scripts**, nunca con prefijo `NEXT_PUBLIC_`
   - `SUPABASE_PROJECT_REF` (el ref del proyecto, parte del dominio `https://<REF>.supabase.co`)
   - `SUPABASE_DB_PASSWORD` o `SUPABASE_DB_URL` (Dashboard → Settings → Database)
   - `STRIPE_SECRET_KEY` y `NEXT_PUBLIC_STRIPE_KEY` (Stripe → Developers → API keys, modo test)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` (usuario superadmin que se crea en el setup)

4. Aplicá el esquema a la base (migraciones de Supabase CLI):
   ```bash
   npm run db:migrate
   ```
   Esto linkea el proyecto y corre `supabase db push`, aplicando
   `supabase/migrations/20261016100000_initial_schema.sql` (tablas, triggers,
   índices, RLS, buckets y roles).

5. Ejecutá el setup idempotente (crea buckets, roles, el superadmin y sincroniza
   Stripe con la tabla `rooms`):
   ```bash
   npm run setup          # aplicar cambios
   npm run setup -- --dry-run   # solo ver qué haría, sin escribir nada
   ```

6. Levantá la app:
   ```bash
   npm run dev
   ```
   y abrí `http://localhost:3000`.

> **Tip:** `npm run migrate` ejecuta `db:migrate` y `setup` en un solo paso.
> `npm run check-env [dev|build|setup|migrate]` valida el `.env` para cada
> contexto sin correr nada más.

### Pasos manuales (una sola vez por proyecto)
- **Catálogo turístico:** subí el PDF al bucket `hueney_ruca`
  (Supabase → Storage), con la ruta
  `catalogo_turistico/Catalogo_Turistico_Sierras-de-la-Venatana.pdf`
  (se referencia desde `/actividades`).
- **Proveedores de login:** en Supabase → Authentication → Providers, habilitá
  **Google** y **GitHub**, y cargá los client id/secret de cada uno.
- **Confirmación de email:** en Authentication → Providers → Email, desactivá
  "Confirm email" si querés que los usuarios entren sin validar el mail.

## Scripts
| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `start` | Build / producción |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run check-env [ctx]` | Valida variables de entorno por contexto |
| `npm run db:migrate` | `supabase link` + `supabase db push` |
| `npm run setup [--dry-run]` | Buckets, roles, superadmin y sync de Stripe |
| `npm run migrate` | `db:migrate` + `setup` |

## Cómo queda montado
- **Auth en el navegador:** `src/helpers/authProvider.jsx` (wrapper propio sobre
  `@supabase/ssr`, reemplaza a `@supabase/auth-helpers-react` deprecado).
- **Auth en las API routes:** `src/helpers/apiGuard.js` verifica sesión y rol
  (1 usuario, 2 admin, 3 superadmin) contra la DB antes de cada escritura.
- **Stripe:** `scripts/setup.mjs` crea/actualiza products + prices a partir de la
  tabla `rooms` (y guardá el `stripe_product_id` en cada room). El checkout
  valida que el `price_id` pertenezca a la cabaña antes de crear la sesión.
- **Migraciones:** `supabase/migrations/` versionadas; `supabase/` linkeado con
  `project_id = "hueney-ruca"`.

## Notas y deudas de seguridad
- Las policies de RLS están **permisivas** para `anon` y `authenticated` porque
  algunas partes de la app escriben desde el navegador con la anon key. La
  verificación real de permisos ocurre en las API routes (`apiGuard.js`).
  Endurecer RLS implica propagar el JWT del usuario a todas las escrituras y
  usar `service_role` en el servidor.
- `next lint` / `next build` ahora corren ESLint con `next/core-web-vitals`;
  reglas previamente ignoradas (p. ej. `react/display-name`) pasan a frenar el
  build si se rompen.
