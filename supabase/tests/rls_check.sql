-- Si ves 'OK: …' (aunque Supabase lo muestre como error) ha pasado; si ves 'FALLO: …', no.
-- Pega el archivo entero en el SQL Editor de Supabase y ejecútalo una vez.
-- Todo va en un único bloque DO que siempre termina con una excepción, así que nunca se
-- guarda nada: los usuarios y datos de prueba se deshacen tanto si pasa como si falla.
do $$
declare
  v_g uuid;
  v_code text;
  v_w uuid;
  v_z uuid;
  v_i uuid;
  v_loan uuid;
begin
  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-00000000000a', 'ana@test.dev'),
    ('00000000-0000-0000-0000-00000000000b', 'beto@test.dev');

  -- ---------- Ana (admin) ----------
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then
    raise exception 'FALLO: no se pudo cambiar al rol authenticated';
  end if;

  v_g := public.create_group('Scouts Test');
  select invite_code into v_code from public.groups where id = v_g;
  insert into public.warehouses (group_id, name) values (v_g, 'Zulo') returning id into v_w;
  insert into public.zones (warehouse_id, label, color, x, y, w, h)
    values (v_w, 'Tiendas', '#2E86AB', 0, 0, 0.5, 0.5) returning id into v_z;
  insert into public.items (zone_id, name, quantity_total) values (v_z, 'Tienda Quechua', 3) returning id into v_i;
  v_loan := public.checkout_item(v_i, 2, 'Campamento', current_date + 7, 'x/loans/a.jpg');

  if (select quantity_available from public.item_availability where item_id = v_i) <> 1 then
    raise exception 'FALLO: debería quedar 1 disponible';
  end if;

  begin
    perform public.checkout_item(v_i, 2, 'Excursión', current_date + 7, 'x/loans/b.jpg');
    raise exception 'FALLO: coger más de lo disponible debería fallar';
  exception when others then
    if sqlerrm <> 'NOT_ENOUGH_AVAILABLE' then raise; end if;
  end;

  begin
    delete from public.items where id = v_i;
    raise exception 'FALLO: no se debería poder borrar material prestado';
  exception when others then
    if sqlerrm <> 'ITEM_HAS_ACTIVE_LOANS' then raise; end if;
  end;

  -- ---------- Beto (de otro grupo, luego member) ----------
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then
    raise exception 'FALLO: no se pudo cambiar al rol authenticated';
  end if;

  if (select count(*) from public.warehouses) <> 0 then
    raise exception 'FALLO: Beto ve almacenes de otro grupo';
  end if;

  perform public.join_group(v_code);

  if (select count(*) from public.warehouses) <> 1 then
    raise exception 'FALLO: Beto debería ver el almacén tras unirse';
  end if;

  begin
    insert into public.zones (warehouse_id, label, color, x, y, w, h)
      values (v_w, 'Hack', '#000000', 0, 0, 0.1, 0.1);
    raise exception 'FALLO: un member no debería crear zonas';
  exception when others then
    if sqlerrm not like 'new row violates row-level security policy%' then raise; end if;
  end;

  begin
    perform public.return_loan(v_loan, 'x/loans/r.jpg', 'ok', '');
    raise exception 'FALLO: Beto no debería poder devolver el préstamo de Ana';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;

  -- Un member sí puede coger lo que queda disponible.
  perform public.checkout_item(v_i, 1, 'Reunión', current_date + 1, 'x/loans/c.jpg');

  reset role;
  -- Siempre termina en excepción para que no quede nada guardado.
  raise exception 'OK: todas las comprobaciones de RLS han pasado';
end $$;
