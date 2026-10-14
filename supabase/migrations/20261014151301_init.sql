-- ========== Tablas ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  plan_image_path text,
  aspect_ratio numeric not null default 1.333 check (aspect_ratio > 0),
  created_at timestamptz not null default now()
);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  color text not null,
  x numeric not null check (x between 0 and 1),
  y numeric not null check (y between 0 and 1),
  w numeric not null check (w > 0 and w <= 1),
  h numeric not null check (h > 0 and h <= 1),
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  quantity_total int not null check (quantity_total > 0),
  notes text,
  photo_path text,
  created_at timestamptz not null default now()
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  quantity int not null check (quantity > 0),
  purpose text not null check (char_length(purpose) between 1 and 120),
  due_date date not null,
  checkout_photo_path text not null,
  checked_out_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'returned')),
  return_photo_path text,
  return_condition text check (return_condition in ('ok', 'damaged', 'incomplete')),
  return_notes text,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  constraint returned_complete check (
    status = 'active'
    or (return_photo_path is not null and return_condition is not null and returned_at is not null)
  )
);

create index on public.loans (item_id) where status = 'active';

-- ========== Perfil automático al registrarse ==========
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, split_part(new.email, '@', 1));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== No borrar material prestado ==========
create or replace function public.prevent_item_delete_with_active_loans() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.loans where item_id = old.id and status = 'active') then
    raise exception 'ITEM_HAS_ACTIVE_LOANS';
  end if;
  return old;
end $$;

create trigger items_no_delete_active before delete on public.items
  for each row execute function public.prevent_item_delete_with_active_loans();

-- ========== Disponibilidad ==========
create view public.item_availability with (security_invoker = true) as
select
  i.id as item_id,
  i.zone_id,
  i.quantity_total,
  coalesce(sum(l.quantity) filter (where l.status = 'active'), 0)::int as quantity_out,
  (i.quantity_total - coalesce(sum(l.quantity) filter (where l.status = 'active'), 0))::int as quantity_available,
  coalesce(bool_or(l.status = 'active' and l.due_date < current_date), false) as has_overdue
from public.items i
left join public.loans l on l.item_id = i.id
group by i.id;

-- ========== Funciones auxiliares (security definer para evitar recursión en RLS) ==========
create or replace function public.is_member(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = $1 and user_id = auth.uid());
$$;

create or replace function public.is_admin(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = $1 and user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.group_of_warehouse(w uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from warehouses where id = $1;
$$;

create or replace function public.group_of_zone(z uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select wh.group_id from zones zo join warehouses wh on wh.id = zo.warehouse_id where zo.id = $1;
$$;

create or replace function public.group_of_item(i uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select wh.group_id from items it
  join zones zo on zo.id = it.zone_id
  join warehouses wh on wh.id = zo.warehouse_id
  where it.id = $1;
$$;

create or replace function public.new_invite_code() returns text
language sql volatile as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
$$;

-- ========== RPC ==========
create or replace function public.create_group(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  insert into groups (name, invite_code, created_by)
    values (trim(p_name), new_invite_code(), auth.uid())
    returning id into g;
  insert into group_members (group_id, user_id, role) values (g, auth.uid(), 'admin');
  return g;
end $$;

create or replace function public.join_group(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select id into g from groups where invite_code = p_code;
  if g is null then raise exception 'INVALID_INVITE'; end if;
  insert into group_members (group_id, user_id, role) values (g, auth.uid(), 'member')
    on conflict (group_id, user_id) do nothing;
  return g;
end $$;

create or replace function public.regenerate_invite(p_group uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not is_admin(p_group) then raise exception 'FORBIDDEN'; end if;
  update groups set invite_code = new_invite_code() where id = p_group returning invite_code into c;
  return c;
end $$;

create or replace function public.checkout_item(
  p_item uuid, p_quantity int, p_purpose text, p_due date, p_photo text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_total int; v_out int; l uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not is_member(group_of_item(p_item)) then raise exception 'FORBIDDEN'; end if;
  select quantity_total into v_total from items where id = p_item for update;
  select coalesce(sum(quantity), 0) into v_out from loans where item_id = p_item and status = 'active';
  if p_quantity > v_total - v_out then raise exception 'NOT_ENOUGH_AVAILABLE'; end if;
  insert into loans (item_id, user_id, quantity, purpose, due_date, checkout_photo_path)
    values (p_item, auth.uid(), p_quantity, trim(p_purpose), p_due, p_photo)
    returning id into l;
  return l;
end $$;

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
  update loans set
    status = 'returned',
    return_photo_path = p_photo,
    return_condition = p_condition,
    return_notes = nullif(trim(p_notes), ''),
    returned_at = now()
  where id = p_loan;
end $$;

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.warehouses enable row level security;
alter table public.zones enable row level security;
alter table public.items enable row level security;
alter table public.loans enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = profiles.id
  )
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy groups_select on public.groups for select to authenticated using (public.is_member(id));
create policy groups_update on public.groups for update to authenticated
  using (public.is_admin(id)) with check (public.is_admin(id));

create policy gm_select on public.group_members for select to authenticated using (public.is_member(group_id));
create policy gm_update on public.group_members for update to authenticated
  using (public.is_admin(group_id)) with check (public.is_admin(group_id));
create policy gm_delete on public.group_members for delete to authenticated
  using (public.is_admin(group_id) or user_id = auth.uid());

create policy wh_select on public.warehouses for select to authenticated using (public.is_member(group_id));
create policy wh_insert on public.warehouses for insert to authenticated with check (public.is_admin(group_id));
create policy wh_update on public.warehouses for update to authenticated
  using (public.is_admin(group_id)) with check (public.is_admin(group_id));
create policy wh_delete on public.warehouses for delete to authenticated using (public.is_admin(group_id));

create policy zones_select on public.zones for select to authenticated
  using (public.is_member(public.group_of_warehouse(warehouse_id)));
create policy zones_insert on public.zones for insert to authenticated
  with check (public.is_admin(public.group_of_warehouse(warehouse_id)));
create policy zones_update on public.zones for update to authenticated
  using (public.is_admin(public.group_of_warehouse(warehouse_id)))
  with check (public.is_admin(public.group_of_warehouse(warehouse_id)));
create policy zones_delete on public.zones for delete to authenticated
  using (public.is_admin(public.group_of_warehouse(warehouse_id)));

create policy items_select on public.items for select to authenticated
  using (public.is_member(public.group_of_zone(zone_id)));
create policy items_insert on public.items for insert to authenticated
  with check (public.is_admin(public.group_of_zone(zone_id)));
create policy items_update on public.items for update to authenticated
  using (public.is_admin(public.group_of_zone(zone_id)))
  with check (public.is_admin(public.group_of_zone(zone_id)));
create policy items_delete on public.items for delete to authenticated
  using (public.is_admin(public.group_of_zone(zone_id)));

create policy loans_select on public.loans for select to authenticated
  using (public.is_member(public.group_of_item(item_id)));

-- ========== Storage ==========
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
  on conflict (id) do nothing;

create policy photos_select on storage.objects for select to authenticated using (
  bucket_id = 'photos' and public.is_member(((storage.foldername(name))[1])::uuid)
);
create policy photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'photos'
  and public.is_member(((storage.foldername(name))[1])::uuid)
  and ((storage.foldername(name))[2] in ('items', 'loans')
       or ((storage.foldername(name))[2] = 'plans' and public.is_admin(((storage.foldername(name))[1])::uuid)))
);
