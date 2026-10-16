-- =============================================================
-- Hueney Ruca — esquema inicial
-- Aplicar con:  npm run db:migrate   (supabase db push)
-- Migración idempotente: se puede re-aplicar sin perder datos.
--
-- Inferido del código de la app (src/pages/api/**, src/helpers).
-- =============================================================

-- ---------- Utilidades ----------

-- gen_random_uuid() (nativo en PG13+; la extensión cubre bases más viejas)
create extension if not exists pgcrypto with schema extensions;

-- update_at automático en cada UPDATE
create or replace function public.set_update_at()
returns trigger
language plpgsql
as $$
begin
  new.update_at := now();
  return new;
end;
$$;

-- ---------- profiles ----------

create table if not exists public.profiles (
  id             uuid primary key default gen_random_uuid(),
  auth_id        uuid unique references auth.users (id) on delete cascade,
  email          text,
  full_name      text,
  username       text,
  country        text,
  phone          text default '0',
  avatar_url     text,
  role           integer not null default 1 check (role between 1 and 3), -- 1 usuario | 2 admin | 3 superadmin
  suspended      boolean not null default false,
  stripe_customer text,
  created_at     timestamptz not null default now(),
  update_at      timestamptz not null default now(),
  deleted_at     timestamptz
);

drop trigger if exists set_update_at_profiles on public.profiles;
create trigger set_update_at_profiles
  before update on public.profiles
  for each row execute function public.set_update_at();

-- Crea el perfil cuando se registra un usuario en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (auth_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: usuarios que ya existían antes de esta migración
insert into public.profiles (auth_id, email, full_name, avatar_url, created_at)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  u.raw_user_meta_data ->> 'avatar_url',
  coalesce(u.created_at, now())
from auth.users u
on conflict (auth_id) do nothing;

-- ---------- rooms ----------

create table if not exists public.rooms (
  id                bigint generated always as identity primary key,
  name              text not null,
  type              text not null default 'A',            -- A | B | C
  rooms             integer not null default 1,
  capacity          integer not null default 1,
  beds              integer not null default 1,
  bathrooms         integer not null default 1,
  price             integer not null default 1000,        -- ARS por noche
  services          jsonb not null default '[]'::jsonb,
  description       text,
  images            jsonb not null default '[]'::jsonb,    -- [{ name, path }]
  stripe_product_id text,
  suspended         boolean not null default false,
  created_at        timestamptz not null default now(),
  update_at         timestamptz not null default now(),
  deleted_at        timestamptz
);

drop trigger if exists set_update_at_rooms on public.rooms;
create trigger set_update_at_rooms
  before update on public.rooms
  for each row execute function public.set_update_at();

-- ---------- booking ----------

create table if not exists public.booking (
  id         bigint generated always as identity primary key,
  checkin    date not null,
  checkout   date not null,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  room_id    bigint not null references public.rooms (id) on delete cascade,
  payments   boolean not null default false,
  adults     integer not null default 1,
  children   integer not null default 0,
  suspended  boolean not null default false,
  created_at timestamptz not null default now(),
  update_at  timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_update_at_booking on public.booking;
create trigger set_update_at_booking
  before update on public.booking
  for each row execute function public.set_update_at();

create index if not exists booking_user_id_idx on public.booking (user_id);
create index if not exists booking_room_id_idx on public.booking (room_id);
create index if not exists booking_dates_idx on public.booking (room_id, checkin, checkout);

-- ---------- comments ----------

create table if not exists public.comments (
  id         bigint generated always as identity primary key,
  review     text not null,
  stars      integer not null default 1,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  suspended  boolean not null default false,
  created_at timestamptz not null default now(),
  update_at  timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_update_at_comments on public.comments;
create trigger set_update_at_comments
  before update on public.comments
  for each row execute function public.set_update_at();

create index if not exists comments_user_id_idx on public.comments (user_id);
create index if not exists comments_created_at_idx on public.comments (created_at desc);

-- ---------- images ----------

create table if not exists public.images (
  id         bigint generated always as identity primary key,
  alt        text,
  url        text not null,
  created_at timestamptz not null default now(),
  update_at  timestamptz not null default now()
);

drop trigger if exists set_update_at_images on public.images;
create trigger set_update_at_images
  before update on public.images
  for each row execute function public.set_update_at();

-- ---------- roles (catálogo de roles, usado por /api/roles) ----------

create table if not exists public.roles (
  id      bigint generated always as identity primary key,
  name    text not null,
  type    integer not null,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.roles (name, type)
select r.name, r.type
from (values
  ('usuario', 1),
  ('admin', 2),
  ('superadmin', 3)
) as r(name, type)
where not exists (
  select 1 from public.roles where roles.type = r.type
);

create index if not exists rooms_stripe_product_idx on public.rooms (stripe_product_id);

-- =============================================================
-- Row Level Security
--
-- IMPORTANTE: las API routes y varios componentes escriben desde
-- el navegador con la anon key (sin JWT de usuario), por lo que
-- las policies deben permitir a `anon`. Endurecer esto implica
-- propagar el JWT del usuario a las API routes y usar service_role
-- en el servidor (pendiente, ver README).
-- =============================================================

alter table public.profiles enable row level security;
alter table public.rooms     enable row level security;
alter table public.booking   enable row level security;
alter table public.comments  enable row level security;
alter table public.images    enable row level security;
alter table public.roles     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'rooms', 'booking', 'comments', 'images', 'roles']
  loop
    execute format(
      'drop policy if exists "%1$s_rw" on public.%1$I;
       create policy "%1$s_rw" on public.%1$I
         for all to anon, authenticated
         using (true) with check (true);',
      t, t
    );
  end loop;
end;
$$;

-- =============================================================
-- Storage: buckets y policies
-- cabanas_gallery: público (se arma la URL pública en el front)
-- avatars:         se sube/descarga desde el cliente
-- =============================================================

insert into storage.buckets (id, name, public)
values
  ('cabanas_gallery', 'cabanas_gallery', true),
  ('avatars', 'avatars', true),
  ('hueney_ruca', 'hueney_ruca', true)  -- catálogo turístico (ver README: subir el PDF una vez)
on conflict (id) do update set public = excluded.public;

do $$
declare b text;
begin
  foreach b in array array['cabanas_gallery', 'avatars', 'hueney_ruca']
  loop
    execute format(
      'drop policy if exists "%1$s_select" on storage.objects;
       drop policy if exists "%1$s_insert" on storage.objects;
       drop policy if exists "%1$s_update" on storage.objects;
       drop policy if exists "%1$s_delete" on storage.objects;
       create policy "%1$s_select" on storage.objects
         for select to anon, authenticated using (bucket_id = %L);
       create policy "%1$s_insert" on storage.objects
         for insert to anon, authenticated with check (bucket_id = %L);
       create policy "%1$s_update" on storage.objects
         for update to anon, authenticated using (bucket_id = %L);
       create policy "%1$s_delete" on storage.objects
         for delete to anon, authenticated using (bucket_id = %L);',
      b, b, b, b, b
    );
  end loop;
end;
$$;
