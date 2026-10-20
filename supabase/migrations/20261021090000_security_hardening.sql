-- Endurecimiento de seguridad antes de Vercel (auditoría del 2026-10-20, informe b-base-de-datos.md).
-- 1. B-H1/C-M4  Storage: bucket photos con 5 MB y solo image/jpeg; subidas solo con rutas
--               <grupo>/<plans|items|loans>/<uuid>.jpg; plans/ e items/ solo admins, loans/ miembros;
--               como mucho 500 fotos nuevas por grupo cada 24 h (un club grande con ~100
--               préstamos al día sube 2 fotos por préstamo); DELETE para admins del grupo.
-- 2. B-L7       Topes holgados para un club: 5 grupos creados por usuario (GROUP_LIMIT),
--               20 almacenes por grupo (WAREHOUSE_LIMIT) y 2000 materiales por grupo (ITEM_LIMIT).
-- 3. B-M1       No se pueden mover filas entre grupos: UPDATE por columna en warehouses, zones e
--               items (solo lo que la app escribe) y trigger IMMUTABLE_PARENT (defensa doble).
--               La app no mueve material entre zonas, así que items.zone_id no se puede cambiar.
-- 4. B-M2/C-M1  Tope global de IA: 200 llamadas cada 24 h entre todos los grupos (AI_QUOTA).
-- 5. B-L2       checkout_item y return_loan exigen p_photo = <grupo del material>/loans/<uuid>.jpg
--               (BAD_PHOTO); la foto de devolución no puede ser la de salida.
-- 6. B-L5/C-L3  quantity_total no puede bajar de las unidades prestadas (QUANTITY_BELOW_LENT).
-- Las funciones nuevas usan search_path vacío y nombres cualificados. Las que se reemplazan
-- (create_group, consume_ai_quota, checkout_item, return_loan) copian la definición vigente y
-- solo añaden la comprobación nueva.

-- ========== 1. Storage (B-H1 / C-M4) ==========
update storage.buckets
  set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg']
  where id = 'photos';

-- true si el usuario es miembro del grupo y el grupo ha subido menos de 500 fotos en 24 h.
create or replace function public.photos_quota_ok(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member(g)
    and (select count(*) from storage.objects o
          where o.bucket_id = 'photos'
            and o.name like g::text || '/%'
            and o.created_at > now() - interval '24 hours') < 500;
$$;
revoke execute on function public.photos_quota_ok(uuid) from public, anon;
grant execute on function public.photos_quota_ok(uuid) to authenticated;

-- El case garantiza que el nombre cumple el formato antes de convertir la carpeta a uuid
-- (si no, un nombre raro daría un error de cast en vez de la violación de RLS).
drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'photos'
  and case
    when name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(plans|items|loans)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    then public.is_member(((storage.foldername(name))[1])::uuid)
      and ((storage.foldername(name))[2] = 'loans'
           or public.is_admin(((storage.foldername(name))[1])::uuid))
      and public.photos_quota_ok(((storage.foldername(name))[1])::uuid)
    else false
  end
);

drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated using (
  bucket_id = 'photos'
  and case
    when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_admin(((storage.foldername(name))[1])::uuid)
    else false
  end
);

-- ========== 2. Topes de grupos, almacenes y material (B-L7) ==========
-- create_group: misma definición que init.sql + tope de 5 grupos creados por usuario.
create or replace function public.create_group(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  -- Serializa las llamadas del mismo usuario para que el recuento sea fiable.
  perform pg_advisory_xact_lock(hashtext('create_group:' || auth.uid()::text));
  if (select count(*) from groups where created_by = auth.uid()) >= 5 then
    raise exception 'GROUP_LIMIT';
  end if;
  insert into groups (name, invite_code, created_by)
    values (trim(p_name), new_invite_code(), auth.uid())
    returning id into g;
  insert into group_members (group_id, user_id, role) values (g, auth.uid(), 'admin');
  return g;
end $$;

create or replace function public.warehouses_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('warehouses_limit:' || new.group_id::text));
  if (select count(*) from public.warehouses where group_id = new.group_id) >= 20 then
    raise exception 'WAREHOUSE_LIMIT';
  end if;
  return new;
end $$;

drop trigger if exists warehouses_limit on public.warehouses;
create trigger warehouses_limit before insert on public.warehouses
  for each row execute function public.warehouses_limit();

create or replace function public.items_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_group uuid;
begin
  v_group := public.group_of_zone(new.zone_id);
  if v_group is null then return new; end if; -- la FK de zone_id dará el error
  perform pg_advisory_xact_lock(hashtext('items_limit:' || v_group::text));
  if (select count(*) from public.items it
        join public.zones zo on zo.id = it.zone_id
        join public.warehouses wh on wh.id = zo.warehouse_id
        where wh.group_id = v_group) >= 2000 then
    raise exception 'ITEM_LIMIT';
  end if;
  return new;
end $$;

drop trigger if exists items_limit on public.items;
create trigger items_limit before insert on public.items
  for each row execute function public.items_limit();

-- ========== 3. No mover filas entre grupos (B-M1) ==========
-- Columnas que la app actualiza:
--   warehouses: name (renameWarehouse), layout, aspect_ratio, plan_image_path, plan_source (saveZones).
--   zones: upsert de saveZones (id, warehouse_id, label, color, x, y, w, h). Un upsert de PostgREST
--     hace ON CONFLICT DO UPDATE SET de todas las columnas enviadas, así que necesita UPDATE en
--     id y warehouse_id; el trigger deja pasar el mismo warehouse_id y rechaza uno distinto.
--   items: name, quantity_total, notes (updateItem) y photo_path (setItemPhoto).
revoke update on public.warehouses from authenticated, anon;
grant update (name, plan_image_path, aspect_ratio, plan_source, layout) on public.warehouses to authenticated;

revoke update on public.zones from authenticated, anon;
grant update (id, warehouse_id, label, color, x, y, w, h) on public.zones to authenticated;

revoke update on public.items from authenticated, anon;
grant update (name, quantity_total, notes, photo_path) on public.items to authenticated;

create or replace function public.forbid_reparent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'warehouses' then
    if new.group_id is distinct from old.group_id then raise exception 'IMMUTABLE_PARENT'; end if;
  elsif tg_table_name = 'zones' then
    if new.warehouse_id is distinct from old.warehouse_id then raise exception 'IMMUTABLE_PARENT'; end if;
  elsif tg_table_name = 'items' then
    if new.zone_id is distinct from old.zone_id then raise exception 'IMMUTABLE_PARENT'; end if;
  end if;
  return new;
end $$;

drop trigger if exists warehouses_no_reparent on public.warehouses;
create trigger warehouses_no_reparent before update on public.warehouses
  for each row execute function public.forbid_reparent();
drop trigger if exists zones_no_reparent on public.zones;
create trigger zones_no_reparent before update on public.zones
  for each row execute function public.forbid_reparent();
drop trigger if exists items_no_reparent on public.items;
create trigger items_no_reparent before update on public.items
  for each row execute function public.forbid_reparent();

-- ========== 4. Tope global de IA (B-M2 / C-M1) ==========
create index if not exists ai_usage_created_idx on public.ai_usage (created_at);

-- Misma definición que 20261019110000_ai_quota.sql + tope global de 200 llamadas cada 24 h.
create or replace function public.consume_ai_quota(p_group uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not is_admin(p_group) then raise exception 'FORBIDDEN'; end if;
  -- Serializa las llamadas del mismo grupo para que el recuento y el insert sean atómicos.
  perform pg_advisory_xact_lock(hashtext('ai_quota:' || p_group::text));
  -- Y las de todos los grupos para el tope global (siempre en este orden: sin interbloqueos).
  perform pg_advisory_xact_lock(hashtext('ai_quota:global'));
  if (select count(*) from ai_usage
        where created_at > now() - interval '24 hours') >= 200 then
    raise exception 'AI_QUOTA';
  end if;
  if (select count(*) from ai_usage
        where group_id = p_group and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'AI_QUOTA';
  end if;
  if (select count(*) from ai_usage
        where user_id = auth.uid() and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'AI_QUOTA';
  end if;
  insert into ai_usage (group_id, user_id) values (p_group, auth.uid());
end $$;

revoke execute on function public.consume_ai_quota(uuid) from public, anon;
grant execute on function public.consume_ai_quota(uuid) to authenticated;

-- ========== 5. Rutas de foto en las RPC de préstamos (B-L2) ==========
-- Misma definición que init.sql + validación de p_photo.
create or replace function public.checkout_item(
  p_item uuid, p_quantity int, p_purpose text, p_due date, p_photo text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_total int; v_out int; l uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not is_member(group_of_item(p_item)) then raise exception 'FORBIDDEN'; end if;
  if p_photo is null or p_photo !~ ('^' || group_of_item(p_item)::text
       || '/loans/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$') then
    raise exception 'BAD_PHOTO';
  end if;
  select quantity_total into v_total from items where id = p_item for update;
  select coalesce(sum(quantity), 0) into v_out from loans where item_id = p_item and status = 'active';
  if p_quantity > v_total - v_out then raise exception 'NOT_ENOUGH_AVAILABLE'; end if;
  insert into loans (item_id, user_id, quantity, purpose, due_date, checkout_photo_path)
    values (p_item, auth.uid(), p_quantity, trim(p_purpose), p_due, p_photo)
    returning id into l;
  return l;
end $$;

-- Misma definición que init.sql + validación de p_photo (formato y distinta de la de salida).
create or replace function public.return_loan(
  p_loan uuid, p_photo text, p_condition text, p_notes text
) returns void
language plpgsql security definer set search_path = public as $$
declare v loans%rowtype;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v from loans where id = p_loan for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v.user_id <> auth.uid() and not is_admin(group_of_item(v.item_id)) then raise exception 'FORBIDDEN'; end if;
  if v.status = 'returned' then raise exception 'ALREADY_RETURNED'; end if;
  if p_photo is null or p_photo !~ ('^' || group_of_item(v.item_id)::text
       || '/loans/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
     or p_photo = v.checkout_photo_path then
    raise exception 'BAD_PHOTO';
  end if;
  update loans set
    status = 'returned',
    return_photo_path = p_photo,
    return_condition = p_condition,
    return_notes = nullif(trim(p_notes), ''),
    returned_at = now()
  where id = p_loan;
end $$;

-- ========== 6. Total por encima de lo prestado (B-L5 / C-L3) ==========
-- Bloquea la fila del material igual que checkout_item (for update), así que una salida y una
-- bajada del total a la vez quedan en serie y la suma de préstamos activos está al día.
create or replace function public.items_quantity_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.items where id = new.id for update;
  if new.quantity_total < (select coalesce(sum(l.quantity), 0) from public.loans l
                            where l.item_id = new.id and l.status = 'active') then
    raise exception 'QUANTITY_BELOW_LENT';
  end if;
  return new;
end $$;

drop trigger if exists items_quantity_guard on public.items;
create trigger items_quantity_guard before update of quantity_total on public.items
  for each row when (new.quantity_total < old.quantity_total)
  execute function public.items_quantity_guard();
