-- Si ves 'OK: …' (aunque Supabase lo muestre como error) ha pasado; si ves 'FALLO: …', no.
-- Pega el archivo entero en el SQL Editor de Supabase y ejecútalo una vez (después de 20261019110000_ai_quota.sql).
-- Todo va en un único bloque DO que siempre termina con una excepción, así que nunca se
-- guarda nada: los usuarios y datos de prueba se deshacen tanto si pasa como si falla.
do $$
declare
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_code text;
  i int;
begin
  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-00000000000a', 'ana@test.dev'),
    ('00000000-0000-0000-0000-00000000000b', 'beto@test.dev');

  -- ---------- Ana (admin de tres grupos) ----------
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then
    raise exception 'FALLO: no se pudo cambiar al rol authenticated';
  end if;

  v_a := public.create_group('Grupo A');
  v_b := public.create_group('Grupo B');
  v_c := public.create_group('Grupo C');
  select invite_code into v_code from public.groups where id = v_a;

  -- Cuota por grupo: 10 llamadas bien, la 11 falla.
  for i in 1..10 loop
    perform public.consume_ai_quota(v_a);
  end loop;
  begin
    perform public.consume_ai_quota(v_a);
    raise exception 'FALLO: la llamada 11 del mismo grupo debería fallar';
  exception when others then
    if sqlerrm <> 'AI_QUOTA' then raise; end if;
  end;

  -- Cuota por usuario: 10 en B suman 20 con A; la siguiente (en C, que está vacío) falla.
  for i in 1..10 loop
    perform public.consume_ai_quota(v_b);
  end loop;
  begin
    perform public.consume_ai_quota(v_c);
    raise exception 'FALLO: la llamada 21 del mismo usuario debería fallar';
  exception when others then
    if sqlerrm <> 'AI_QUOTA' then raise; end if;
  end;

  -- Las tablas no son accesibles directamente para authenticated.
  begin
    perform count(*) from public.ai_usage;
    raise exception 'FALLO: authenticated no debería poder leer ai_usage';
  exception when others then
    if sqlerrm not like 'permission denied%' then raise; end if;
  end;
  begin
    insert into public.ai_usage (group_id, user_id)
      values (v_c, '00000000-0000-0000-0000-00000000000a');
    raise exception 'FALLO: authenticated no debería poder insertar en ai_usage';
  exception when others then
    if sqlerrm not like 'permission denied%' then raise; end if;
  end;

  -- ---------- Beto (member de A, no admin) ----------
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  perform set_config('role', 'authenticated', true);
  perform public.join_group(v_code);
  begin
    perform public.consume_ai_quota(v_a);
    raise exception 'FALLO: un member no debería gastar cuota de IA';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;

  -- ---------- anon ----------
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  begin
    perform public.consume_ai_quota(v_a);
    raise exception 'FALLO: anon no debería poder llamar a consume_ai_quota';
  exception when others then
    if sqlerrm not like 'permission denied%' and sqlerrm <> 'NOT_AUTHENTICATED' then raise; end if;
  end;

  reset role;
  -- Siempre termina en excepción para que no quede nada guardado.
  raise exception 'OK: la cuota de IA funciona (10 por grupo, 20 por usuario, solo admins)';
end $$;
