-- Cuota diaria de detecciones con IA (Gemini): 10 por grupo y 20 por usuario cada 24 h.
-- Evita que cuentas desechables agoten la cuota de la API o disparen la factura.

create table public.ai_usage (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index ai_usage_group_created_idx on public.ai_usage (group_id, created_at);
create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at);

-- Sin políticas y sin permisos: solo se escribe a través de consume_ai_quota.
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

create or replace function public.consume_ai_quota(p_group uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not is_admin(p_group) then raise exception 'FORBIDDEN'; end if;
  -- Serializa las llamadas del mismo grupo para que el recuento y el insert sean atómicos.
  perform pg_advisory_xact_lock(hashtext('ai_quota:' || p_group::text));
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
