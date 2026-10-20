-- Si ves 'OK: …' (aunque Supabase lo muestre como error) ha pasado; si ves 'FALLO: …', no.
-- Comprobaciones de 20261022090000_delete_group.sql (eliminar grupo y cuota de IA que sobrevive).
-- Pega el archivo entero en el SQL Editor de Supabase y ejecútalo una vez (después de la migración).
-- Todo va en un único bloque DO que siempre termina con una excepción: no se guarda nada.
do $$
declare
  v_g uuid;      -- grupo de Ana (Beto es miembro)
  v_code text;
  v_w uuid;
  v_z uuid;
  v_i uuid;
  v_n int;
begin
  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-00000000000a', 'ana@test.dev'),
    ('00000000-0000-0000-0000-00000000000b', 'beto@test.dev'),
    ('00000000-0000-0000-0000-00000000000c', 'carla@test.dev');

  -- ---------- Ana crea el grupo con almacén, zona, material, préstamo activo y uso de IA ----------
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then
    raise exception 'FALLO: no se pudo cambiar al rol authenticated';
  end if;
  v_g := public.create_group('Scouts');
  select invite_code into v_code from public.groups where id = v_g;
  insert into public.warehouses (group_id, name) values (v_g, 'W') returning id into v_w;
  insert into public.zones (warehouse_id, label, color, x, y, w, h)
    values (v_w, 'Z', '#2E86AB', 0, 0, .5, .5) returning id into v_z;
  insert into public.items (zone_id, name, quantity_total) values (v_z, 'I', 5) returning id into v_i;
  perform public.checkout_item(v_i, 1, 'x', current_date + 7, v_g::text || '/loans/' || gen_random_uuid()::text || '.jpg');
  perform public.consume_ai_quota(v_g);

  -- ---------- Beto (miembro) no puede ----------
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
  perform public.join_group(v_code);
  begin
    perform public.delete_group(v_g, 'Scouts');
    raise exception 'FALLO: un miembro elimina el grupo';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;

  -- ---------- Carla (de fuera) no puede ----------
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
  begin
    perform public.delete_group(v_g, 'Scouts');
    raise exception 'FALLO: alguien de fuera elimina el grupo';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
  -- Ni borrando la fila directamente (no hay política de delete en groups).
  delete from public.groups where id = v_g;
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'FALLO: se puede borrar un grupo sin la función'; end if;

  -- ---------- Ana: nombre equivocado no borra ----------
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
  begin
    perform public.delete_group(v_g, 'scouts');
    raise exception 'FALLO: borra con el nombre equivocado';
  exception when others then
    if sqlerrm <> 'NAME_MISMATCH' then raise; end if;
  end;
  if not exists (select 1 from public.groups where id = v_g) then
    raise exception 'FALLO: el nombre equivocado ha borrado el grupo';
  end if;

  -- ---------- Ana: con el nombre correcto borra todo, aunque haya un préstamo activo ----------
  perform public.delete_group(v_g, '  Scouts ');
  reset role;
  if exists (select 1 from public.groups where id = v_g)
     or exists (select 1 from public.group_members where group_id = v_g)
     or exists (select 1 from public.warehouses where id = v_w)
     or exists (select 1 from public.zones where id = v_z)
     or exists (select 1 from public.items where id = v_i)
     or exists (select 1 from public.loans where item_id = v_i) then
    raise exception 'FALLO: quedan datos del grupo eliminado';
  end if;

  -- El uso de IA no se borra (sigue contando para la cuota de Ana y el tope global).
  if (select count(*) from public.ai_usage
        where user_id = '00000000-0000-0000-0000-00000000000a' and group_id is null) <> 1 then
    raise exception 'FALLO: borrar el grupo borra el uso de IA';
  end if;

  -- Siempre termina en excepción para que no quede nada guardado.
  raise exception 'OK: eliminar grupo (solo admin, con nombre, borra todo y conserva el uso de IA)';
end $$;
