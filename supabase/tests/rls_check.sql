-- Ejecutar entero en el SQL Editor de Supabase. Todo se deshace al final (rollback).
-- Si algo falla verás un error que empieza por "FALLO:". Si no aparece ningún error, ha pasado.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@test.dev');

create temp table t (k text primary key, id uuid, txt text) on commit drop;
grant all on t to authenticated;

-- ---------- Ana (admin) ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

insert into t (k, id) select 'g', public.create_group('Scouts Test');
insert into t (k, txt) select 'code', invite_code from public.groups where id = (select id from t where k = 'g');
with w as (insert into public.warehouses (group_id, name) select id, 'Zulo' from t where k = 'g' returning id)
  insert into t (k, id) select 'w', id from w;
with z as (
  insert into public.zones (warehouse_id, label, color, x, y, w, h)
  select id, 'Tiendas', '#2E86AB', 0, 0, 0.5, 0.5 from t where k = 'w' returning id
) insert into t (k, id) select 'z', id from z;
with i as (insert into public.items (zone_id, name, quantity_total) select id, 'Tienda Quechua', 3 from t where k = 'z' returning id)
  insert into t (k, id) select 'i', id from i;
insert into t (k, id)
  select 'loanA', public.checkout_item((select id from t where k = 'i'), 2, 'Campamento', current_date + 7, 'x/loans/a.jpg');

do $$ begin
  if (select quantity_available from public.item_availability where item_id = (select id from t where k = 'i')) <> 1 then
    raise exception 'FALLO: debería quedar 1 disponible';
  end if;
end $$;

do $$ begin
  perform public.checkout_item((select id from t where k = 'i'), 2, 'Excursión', current_date + 7, 'x/loans/b.jpg');
  raise exception 'FALLO: coger más de lo disponible debería fallar';
exception when others then
  if sqlerrm <> 'NOT_ENOUGH_AVAILABLE' then raise; end if;
end $$;

do $$ begin
  delete from public.items where id = (select id from t where k = 'i');
  raise exception 'FALLO: no se debería poder borrar material prestado';
exception when others then
  if sqlerrm <> 'ITEM_HAS_ACTIVE_LOANS' then raise; end if;
end $$;

-- ---------- Beto (de otro grupo, luego member) ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

do $$ begin
  if (select count(*) from public.warehouses) <> 0 then raise exception 'FALLO: Beto ve almacenes de otro grupo'; end if;
end $$;

select public.join_group((select txt from t where k = 'code'));

do $$ begin
  if (select count(*) from public.warehouses) <> 1 then raise exception 'FALLO: Beto debería ver el almacén tras unirse'; end if;
end $$;

do $$ begin
  insert into public.zones (warehouse_id, label, color, x, y, w, h)
    select id, 'Hack', '#000000', 0, 0, 0.1, 0.1 from t where k = 'w';
  raise exception 'FALLO: un member no debería crear zonas';
exception when others then
  if sqlerrm not like 'new row violates row-level security policy%' then raise; end if;
end $$;

do $$ begin
  perform public.return_loan((select id from t where k = 'loanA'), 'x/loans/r.jpg', 'ok', '');
  raise exception 'FALLO: Beto no debería poder devolver el préstamo de Ana';
exception when others then
  if sqlerrm <> 'FORBIDDEN' then raise; end if;
end $$;

select public.checkout_item((select id from t where k = 'i'), 1, 'Reunión', current_date + 1, 'x/loans/c.jpg');

rollback;
