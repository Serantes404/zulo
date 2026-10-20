-- Si ves 'OK: …' (aunque Supabase lo muestre como error) ha pasado; si ves 'FALLO: …', no.
-- Comprobaciones de 20261021090000_security_hardening.sql (Storage, topes, mover entre grupos,
-- tope global de IA, rutas de foto en préstamos y total por debajo de lo prestado).
-- Pega el archivo entero en el SQL Editor de Supabase y ejecútalo una vez (después de la migración).
-- Todo va en un único bloque DO que siempre termina con una excepción, así que nunca se
-- guarda nada: los usuarios y datos de prueba se deshacen tanto si pasa como si falla.
do $$
declare
  v_g uuid;      -- grupo A de Ana
  v_g2 uuid;     -- grupo B de Ana
  v_gc uuid;     -- grupo de Carla
  v_code text;
  v_w uuid;
  v_w2 uuid;
  v_z uuid;
  v_z2 uuid;
  v_i uuid;
  v_l uuid;
  v_out text;
  v_n int;
  i int;
begin
  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-00000000000a', 'ana@test.dev'),
    ('00000000-0000-0000-0000-00000000000b', 'beto@test.dev'),
    ('00000000-0000-0000-0000-00000000000c', 'carla@test.dev');

  -- Algunas versiones de Storage solo dejan borrar filas de storage.objects con este ajuste.
  perform set_config('storage.allow_delete_query', 'true', true);

  -- ========== 1. Bucket ==========
  if (select file_size_limit from storage.buckets where id = 'photos') is distinct from 5242880
     or (select allowed_mime_types from storage.buckets where id = 'photos') is distinct from array['image/jpeg'] then
    raise exception 'FALLO: el bucket photos no tiene 5 MB / image/jpeg';
  end if;

  -- ---------- Ana (admin de A y B) ----------
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then
    raise exception 'FALLO: no se pudo cambiar al rol authenticated';
  end if;

  v_g := public.create_group('A');
  v_g2 := public.create_group('B');
  select invite_code into v_code from public.groups where id = v_g;
  insert into public.warehouses (group_id, name) values (v_g, 'W') returning id into v_w;
  insert into public.warehouses (group_id, name) values (v_g2, 'W2') returning id into v_w2;
  insert into public.zones (warehouse_id, label, color, x, y, w, h)
    values (v_w, 'Z', '#2E86AB', 0, 0, .5, .5) returning id into v_z;
  insert into public.zones (warehouse_id, label, color, x, y, w, h)
    values (v_w2, 'Z2', '#2E86AB', 0, 0, .5, .5) returning id into v_z2;
  insert into public.items (zone_id, name, quantity_total) values (v_z, 'I', 5) returning id into v_i;

  -- Storage: el admin sube plano y foto de material con rutas válidas.
  insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/plans/' || gen_random_uuid()::text || '.jpg');
  insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/items/' || gen_random_uuid()::text || '.jpg');

  -- Storage: nombres fuera del formato fallan por RLS (no por un error de cast).
  begin
    insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/loans/../plans/' || gen_random_uuid()::text || '.jpg');
    raise exception 'FALLO: acepta un nombre no canónico';
  exception when others then
    if sqlerrm not like 'new row violates row-level security policy%' then raise; end if;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('photos', 'x/loans/' || gen_random_uuid()::text || '.jpg');
    raise exception 'FALLO: acepta una carpeta que no es un uuid';
  exception when others then
    if sqlerrm not like 'new row violates row-level security policy%' then raise; end if;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/loans/foto.png');
    raise exception 'FALLO: acepta un nombre que no es <uuid>.jpg';
  exception when others then
    if sqlerrm not like 'new row violates row-level security policy%' then raise; end if;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/otros/' || gen_random_uuid()::text || '.jpg');
    raise exception 'FALLO: acepta una carpeta distinta de plans/items/loans';
  exception when others then
    if sqlerrm not like 'new row violates row-level security policy%' then raise; end if;
  end;

  -- ========== 3. B-M1: no se mueve nada entre grupos ==========
  begin
    update public.warehouses set group_id = v_g2 where id = v_w;
    raise exception 'FALLO: admin mueve un almacén a otro grupo';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.items set zone_id = v_z2 where id = v_i;
    raise exception 'FALLO: admin mueve material a otro grupo';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.zones set warehouse_id = v_w2 where id = v_z;
    raise exception 'FALLO: admin mueve una zona a otro grupo';
  exception when others then
    if sqlerrm <> 'IMMUTABLE_PARENT' then raise; end if;
  end;

  -- Lo que hace la app sí funciona: upsert de zonas (como PostgREST), editar almacén y material.
  insert into public.zones (id, warehouse_id, label, color, x, y, w, h)
    values (v_z, v_w, 'Z bis', '#2E86AB', 0.1, 0.1, 0.4, 0.4)
    on conflict (id) do update set
      id = excluded.id, warehouse_id = excluded.warehouse_id, label = excluded.label,
      color = excluded.color, x = excluded.x, y = excluded.y, w = excluded.w, h = excluded.h;
  if (select label from public.zones where id = v_z) <> 'Z bis' then
    raise exception 'FALLO: el upsert de zonas de saveZones no funciona';
  end if;
  update public.warehouses
    set name = 'W bis', aspect_ratio = 1.5, plan_source = 'photo', layout = '{}'::jsonb,
        plan_image_path = v_g::text || '/plans/' || gen_random_uuid()::text || '.jpg'
    where id = v_w;
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'FALLO: admin no puede editar su almacén'; end if;
  update public.items
    set name = 'I bis', quantity_total = 6, notes = 'n',
        photo_path = v_g::text || '/items/' || gen_random_uuid()::text || '.jpg'
    where id = v_i;
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'FALLO: admin no puede editar su material'; end if;

  -- ========== 5. B-L2: rutas de foto en checkout_item / return_loan ==========
  begin
    perform public.checkout_item(v_i, 1, 'x', current_date + 7, 'p');
    raise exception 'FALLO: checkout acepta la ruta p';
  exception when others then
    if sqlerrm <> 'BAD_PHOTO' then raise; end if;
  end;
  begin
    perform public.checkout_item(v_i, 1, 'x', current_date + 7, v_g2::text || '/loans/' || gen_random_uuid()::text || '.jpg');
    raise exception 'FALLO: checkout acepta una foto de otro grupo';
  exception when others then
    if sqlerrm <> 'BAD_PHOTO' then raise; end if;
  end;
  begin
    perform public.checkout_item(v_i, 1, 'x', current_date + 7, v_g::text || '/items/' || gen_random_uuid()::text || '.jpg');
    raise exception 'FALLO: checkout acepta una foto fuera de loans/';
  exception when others then
    if sqlerrm <> 'BAD_PHOTO' then raise; end if;
  end;
  begin
    perform public.checkout_item(v_i, 1, 'x', current_date + 7, null);
    raise exception 'FALLO: checkout acepta foto null';
  exception when others then
    if sqlerrm <> 'BAD_PHOTO' then raise; end if;
  end;

  v_out := v_g::text || '/loans/' || gen_random_uuid()::text || '.jpg';
  v_l := public.checkout_item(v_i, 3, 'x', current_date + 7, v_out);

  begin
    perform public.return_loan(v_l, v_out, 'ok', '');
    raise exception 'FALLO: return_loan acepta la misma foto que la salida';
  exception when others then
    if sqlerrm <> 'BAD_PHOTO' then raise; end if;
  end;
  begin
    perform public.return_loan(v_l, 'p2', 'ok', '');
    raise exception 'FALLO: return_loan acepta la ruta p2';
  exception when others then
    if sqlerrm <> 'BAD_PHOTO' then raise; end if;
  end;

  -- ========== 6. B-L5: total por debajo de lo prestado (3 fuera) ==========
  begin
    update public.items set quantity_total = 2 where id = v_i;
    raise exception 'FALLO: total por debajo de lo prestado';
  exception when others then
    if sqlerrm <> 'QUANTITY_BELOW_LENT' then raise; end if;
  end;
  update public.items set quantity_total = 3 where id = v_i;
  if (select quantity_total from public.items where id = v_i) <> 3 then
    raise exception 'FALLO: no deja bajar el total hasta lo prestado';
  end if;

  -- Devolución válida (otra foto de loans/ del mismo grupo).
  perform public.return_loan(v_l, v_g::text || '/loans/' || gen_random_uuid()::text || '.jpg', 'ok', '');
  update public.items set quantity_total = 1 where id = v_i;

  -- ---------- Beto (member de A) ----------
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
  perform set_config('role', 'authenticated', true);
  perform public.join_group(v_code);

  begin
    insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/items/' || gen_random_uuid()::text || '.jpg');
    raise exception 'FALLO: un member sube a items/';
  exception when others then
    if sqlerrm not like 'new row violates row-level security policy%' then raise; end if;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/plans/' || gen_random_uuid()::text || '.jpg');
    raise exception 'FALLO: un member sube a plans/';
  exception when others then
    if sqlerrm not like 'new row violates row-level security policy%' then raise; end if;
  end;
  -- Un member sí sube fotos de préstamos.
  insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/loans/' || gen_random_uuid()::text || '.jpg');

  -- Un member no borra fotos.
  delete from storage.objects where bucket_id = 'photos';
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'FALLO: un member borra fotos'; end if;

  -- ---------- Ana: borra fotos de su grupo ----------
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
  perform set_config('role', 'authenticated', true);
  delete from storage.objects
    where bucket_id = 'photos' and name like v_g::text || '/items/%';
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'FALLO: el admin no puede borrar fotos de su grupo (%)', v_n; end if;

  -- Tope diario de 200 fotos por grupo.
  reset role;
  select count(*) into v_n from storage.objects
    where bucket_id = 'photos' and name like v_g::text || '/%';
  perform set_config('role', 'authenticated', true);
  for i in 1..(200 - v_n) loop
    insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/loans/' || gen_random_uuid()::text || '.jpg');
  end loop;
  begin
    insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/loans/' || gen_random_uuid()::text || '.jpg');
    raise exception 'FALLO: más de 200 fotos al día en un grupo';
  exception when others then
    if sqlerrm not like 'new row violates row-level security policy%' then raise; end if;
  end;

  -- ========== 2. B-L7: topes ==========
  -- Almacenes: B ya tiene 1; llega a 20 y el 21 falla.
  for i in 2..20 loop
    insert into public.warehouses (group_id, name) values (v_g2, 'W' || i);
  end loop;
  begin
    insert into public.warehouses (group_id, name) values (v_g2, 'W21');
    raise exception 'FALLO: más de 20 almacenes en un grupo';
  exception when others then
    if sqlerrm <> 'WAREHOUSE_LIMIT' then raise; end if;
  end;

  -- Material: 2000 en B y el 2001 falla.
  insert into public.items (zone_id, name, quantity_total)
    select v_z2, 'M' || n, 1 from generate_series(1, 2000) as n;
  begin
    insert into public.items (zone_id, name, quantity_total) values (v_z2, 'M2001', 1);
    raise exception 'FALLO: más de 2000 materiales en un grupo';
  exception when others then
    if sqlerrm <> 'ITEM_LIMIT' then raise; end if;
  end;

  -- Grupos: Ana lleva 2; llega a 5 y el sexto falla.
  for i in 3..5 loop
    perform public.create_group('G' || i);
  end loop;
  begin
    perform public.create_group('G6');
    raise exception 'FALLO: más de 5 grupos por usuario';
  exception when others then
    if sqlerrm <> 'GROUP_LIMIT' then raise; end if;
  end;

  -- ========== 3. B-M1 (segunda defensa): el trigger también frena a quien tenga permiso ==========
  reset role;
  begin
    update public.warehouses set group_id = v_g2 where id = v_w;
    raise exception 'FALLO: el trigger no frena mover un almacén';
  exception when others then
    if sqlerrm <> 'IMMUTABLE_PARENT' then raise; end if;
  end;
  begin
    update public.items set zone_id = v_z2 where id = v_i;
    raise exception 'FALLO: el trigger no frena mover material';
  exception when others then
    if sqlerrm <> 'IMMUTABLE_PARENT' then raise; end if;
  end;

  -- ========== 4. B-M2: tope global de IA (200 cada 24 h) ==========
  -- Se deja el total global en 199 (con filas de Ana en A) y se prueba con Carla, que no ha
  -- gastado nada: la primera llamada pasa (200) y la segunda falla solo por el tope global.
  select count(*) into v_n from public.ai_usage where created_at > now() - interval '24 hours';
  if v_n > 199 then
    raise exception 'FALLO: ya hay % llamadas de IA en 24 h; repite la prueba mañana', v_n;
  end if;
  insert into public.ai_usage (group_id, user_id)
    select v_g, '00000000-0000-0000-0000-00000000000a' from generate_series(1, 199 - v_n);

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
  perform set_config('role', 'authenticated', true);
  v_gc := public.create_group('C');
  perform public.consume_ai_quota(v_gc);
  begin
    perform public.consume_ai_quota(v_gc);
    raise exception 'FALLO: no hay tope global de IA';
  exception when others then
    if sqlerrm <> 'AI_QUOTA' then raise; end if;
  end;

  -- Carla (de otro grupo) no puede borrar fotos de A.
  delete from storage.objects where bucket_id = 'photos' and name like v_g::text || '/%';
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'FALLO: alguien de otro grupo borra fotos'; end if;

  -- ---------- anon ----------
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  begin
    insert into storage.objects (bucket_id, name) values ('photos', v_g::text || '/loans/' || gen_random_uuid()::text || '.jpg');
    raise exception 'FALLO: anon sube fotos';
  exception when others then
    if sqlerrm not like 'new row violates row-level security policy%' and sqlerrm not like 'permission denied%' then raise; end if;
  end;

  reset role;
  -- Siempre termina en excepción para que no quede nada guardado.
  raise exception 'OK: endurecimiento de seguridad (Storage, topes, grupos, IA, fotos de préstamos, cantidades)';
end $$;
