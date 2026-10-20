-- Eliminar un grupo entero (solo admins, confirmando el nombre).
-- Las fotos de Storage las borra la app con la API de Storage ANTES de llamar a delete_group:
-- después ya no sería admin del grupo y photos_delete no le dejaría. Por eso delete_group se niega
-- si aún quedan fotos (si no, llamando a la RPC directamente quedarían huérfanas para siempre).

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
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  -- Primero se bloquea la fila y después se comprueba el admin (sin carreras con quitar admin).
  select name into v_name from public.groups where id = p_group for update;
  if v_name is null then raise exception 'NOT_FOUND'; end if;
  if not public.is_admin(p_group) then raise exception 'FORBIDDEN'; end if;
  if btrim(coalesce(p_name, '')) <> v_name then raise exception 'NAME_MISMATCH'; end if;
  if exists (select 1 from storage.objects
               where bucket_id = 'photos' and name like p_group::text || '/%') then
    raise exception 'PHOTOS_LEFT';
  end if;

  -- Bloquea el material para que un préstamo a la vez no haga fallar el borrado a medias.
  perform 1 from public.items i
    join public.zones z on z.id = i.zone_id
    join public.warehouses w on w.id = z.warehouse_id
    where w.group_id = p_group
    for update of i;

  delete from public.loans l
    using public.items i, public.zones z, public.warehouses w
    where l.item_id = i.id and i.zone_id = z.id and z.warehouse_id = w.id and w.group_id = p_group;
  delete from public.items i
    using public.zones z, public.warehouses w
    where i.zone_id = z.id and z.warehouse_id = w.id and w.group_id = p_group;
  delete from public.groups where id = p_group;
end $$;

revoke execute on function public.delete_group(uuid, text) from public, anon;
grant execute on function public.delete_group(uuid, text) to authenticated;
