-- La columna approved faltaba en el schema inicial: la usa el panel de
-- reseñas del admin (ReviewForm) y el filtro público de /comentarios.

alter table public.comments
  add column if not exists approved boolean not null default false;
