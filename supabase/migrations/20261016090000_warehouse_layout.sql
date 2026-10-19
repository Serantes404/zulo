-- Plano profesional: de dónde sale el plano y estructura de la sala (puertas y pasillos),
-- en 0-1 relativo a la sala. La política wh_update (solo admins) ya cubre estas columnas.
alter table public.warehouses
  add column plan_source text check (plan_source in ('sketch', 'photo')),
  add column layout jsonb;
