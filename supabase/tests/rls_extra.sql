-- Si ves 'OK: …' (aunque Supabase lo muestre como error) ha pasado; si ves 'FALLO: …', no.
-- Comprobaciones extra de seguridad (Storage, perfiles, roles, devoluciones, anon).
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
  v_l uuid;
begin
  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-00000000000a', 'ana@test.dev'),
    ('00000000-0000-0000-0000-00000000000b', 'beto@test.dev'),
    ('00000000-0000-0000-0000-00000000000c', 'carla@test.dev');

  -- ---------- Ana (admin) ----------
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then
    raise exception 'FALLO: no se pudo cambiar al rol authenticated';
  end if;

  v_g := public.create_group('G');
  select invite_code into v_code from public.groups;
  insert into public.warehouses (group_id, name) values (v_g, 'Z') returning id into v_w;
  insert into public.zones (warehouse_id, label, color, x, y, w, h)
    values (v_w, 'A', '#2E86AB', 0, 0, .5, .5) returning id into v_z;
  insert into public.items (zone_id, name, quantity_total) values (v_z, 'Item', 2) returning id into v_i;
  -- El admin sí puede subir el plano.
  insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/plans/p.jpg');

  begin
    delete from public.zones where id = v_z;
    raise exception 'FALLO: borrar zona con material';
  exception when others then
    if sqlerrm not like '%items_zone_id_fkey%' then raise; end if;
  end;

  -- ---------- Beto (member) ----------
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then
    raise exception 'FALLO: no se pudo cambiar al rol authenticated';
  end if;

  perform public.join_group(v_code);

  begin
    insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/plans/x.jpg');
    raise exception 'FALLO: member sube plano';
  exception when others then
    if sqlerrm not like 'new row violates row-level security policy%' then raise; end if;
  end;

  -- Un member sí puede subir fotos de préstamos.
  insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/loans/x.jpg');

  if (select count(*) from public.profiles) <> 2 then
    raise exception 'FALLO: Beto debería ver 2 perfiles';
  end if;

  begin
    perform public.regenerate_invite(v_g);
    raise exception 'FALLO: member regenera';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;

  -- Un member no puede editar material: el update no afecta a ninguna fila (se comprueba al final).
  update public.items set name = 'hack' where id = v_i;

  v_l := public.checkout_item(v_i, 1, 'x', current_date - 1, 'p');

  if not (select has_overdue from public.item_availability where item_id = v_i) then
    raise exception 'FALLO: debería estar vencido';
  end if;

  perform public.return_loan(v_l, 'p2', 'damaged', '  ');

  begin
    perform public.return_loan(v_l, 'p2', 'ok', '');
    raise exception 'FALLO: devolver dos veces el mismo préstamo';
  exception when others then
    if sqlerrm <> 'ALREADY_RETURNED' then raise; end if;
  end;

  if (select return_notes from public.loans where id = v_l) is not null then
    raise exception 'FALLO: notas vacías deberían ser null';
  end if;

  -- ---------- Carla (sin grupo) ----------
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then
    raise exception 'FALLO: no se pudo cambiar al rol authenticated';
  end if;

  if (select count(*) from storage.objects) <> 0
     or (select count(*) from public.profiles) <> 1
     or (select count(*) from public.loans) <> 0 then
    raise exception 'FALLO: Carla ve datos ajenos';
  end if;

  begin
    perform public.checkout_item(v_i, 1, 'x', current_date, 'p');
    raise exception 'FALLO: Carla coge material de otro grupo';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;

  -- ---------- anon (sin sesión) ----------
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  if current_user <> 'anon' then
    raise exception 'FALLO: no se pudo cambiar al rol anon';
  end if;

  begin
    perform public.create_group('x');
    raise exception 'FALLO: anon crea grupo';
  exception when others then
    if sqlerrm <> 'NOT_AUTHENTICATED' then raise; end if;
  end;

  -- ---------- Comprobación final (sin RLS) ----------
  reset role;
  if (select name from public.items where id = v_i) <> 'Item' then
    raise exception 'FALLO: member editó item';
  end if;

  -- Siempre termina en excepción para que no quede nada guardado.
  raise exception 'OK: todas las comprobaciones de RLS han pasado';
end $$;
