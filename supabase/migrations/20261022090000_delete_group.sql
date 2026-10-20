-- Eliminar un grupo entero (solo admins, confirmando el nombre).
-- Las fotos de Storage las borra la app con la API de Storage ANTES de llamar a delete_group:
-- después ya no sería admin del grupo y photos_delete no le dejaría.

-- 1. El uso de IA sobrevive al grupo: si se borrara en cascada, borrar y crear grupos
--    reiniciaría la cuota por usuario y el tope global.
alter table public.ai_usage alter column group_id drop not null;
alter table public.ai_usage drop constraint if exists ai_usage_group_id_fkey;
alter table public.ai_usage add constraint ai_usage_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete set null;

-- 2. delete_group: borra préstamos, material y el grupo (almacenes, zonas y miembros caen en cascada).
--    items.zone_id es "on delete restrict" y items_no_delete_active impide borrar material prestado,
--    así que se borra en este orden a mano.
create or replace function public.delete_group(p_group uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not is_admin(p_group) then raise exception 'FORBIDDEN'; end if;
  select name into v_name from groups where id = p_group for update;
  if v_name is null then raise exception 'NOT_FOUND'; end if;
  if trim(coalesce(p_name, '')) <> v_name then raise exception 'NAME_MISMATCH'; end if;

  delete from loans l
    using items i, zones z, warehouses w
    where l.item_id = i.id and i.zone_id = z.id and z.warehouse_id = w.id and w.group_id = p_group;
  delete from items i
    using zones z, warehouses w
    where i.zone_id = z.id and z.warehouse_id = w.id and w.group_id = p_group;
  delete from groups where id = p_group;
end $$;

revoke execute on function public.delete_group(uuid, text) from public, anon;
grant execute on function public.delete_group(uuid, text) to authenticated;
