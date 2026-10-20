-- "Vencido" con una sola definición: due_date anterior a hoy en Europe/Madrid.
-- Antes la vista usaba current_date (fecha UTC del servidor de BD) y la app otra distinta.
-- Mismo SQL que en init, cambiando solo current_date por la fecha de Madrid.
-- (checkout_item no valida due_date; esa comprobación vive en la app con todayInMadrid.)

create or replace view public.item_availability with (security_invoker = true) as
select
  i.id as item_id,
  i.zone_id,
  i.quantity_total,
  coalesce(sum(l.quantity) filter (where l.status = 'active'), 0)::int as quantity_out,
  (i.quantity_total - coalesce(sum(l.quantity) filter (where l.status = 'active'), 0))::int as quantity_available,
  coalesce(bool_or(l.status = 'active' and l.due_date < (now() at time zone 'Europe/Madrid')::date), false) as has_overdue
from public.items i
left join public.loans l on l.item_id = i.id
group by i.id;
