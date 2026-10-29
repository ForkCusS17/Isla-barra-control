-- Isla & Barra Control: base de datos en Supabase (cuentas por bar, acceso solo por invitación).
-- Se ejecuta una vez en Supabase › SQL Editor › New query › Run. Se puede volver a ejecutar sin perder datos.
--
-- Quién ve qué (Row Level Security):
--   · Administrador (el consultor, tabla admins): ve y gestiona todos los bares y sus usuarios.
--   · Usuario de un bar (tabla bar_members): solo ve y edita los datos de sus bares.
--   · Nadie puede registrarse solo: las cuentas se invitan desde Supabase (Authentication › Users › Invite user).
-- Los datos de cada bar se guardan como un documento (el mismo JSON que exporta la app) con número de versión
-- para detectar si otro dispositivo guardó antes. Se conservan las 30 versiones anteriores de cada bar.

create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.bars (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.bar_members (
  bar_id uuid not null references public.bars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor','lector')),
  added_at timestamptz not null default now(),
  primary key (bar_id, user_id)
);

create table if not exists public.bar_data (
  bar_id uuid primary key references public.bars(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.bar_data_history (
  id bigserial primary key,
  bar_id uuid not null references public.bars(id) on delete cascade,
  data jsonb not null,
  version integer not null,
  saved_at timestamptz not null default now(),
  saved_by uuid references auth.users(id) on delete set null
);
create index if not exists bar_data_history_bar on public.bar_data_history(bar_id, version desc);

-- ¿Quién es quién? (security definer: consultan tablas protegidas sin abrirlas)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

create or replace function public.is_member(p_bar uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bar_members where bar_id = p_bar and user_id = auth.uid())
$$;

create or replace function public.can_edit(p_bar uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.bar_members where bar_id = p_bar and user_id = auth.uid() and role = 'editor')
$$;

alter table public.admins enable row level security;
alter table public.bars enable row level security;
alter table public.bar_members enable row level security;
alter table public.bar_data enable row level security;
alter table public.bar_data_history enable row level security;

drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select using (user_id = auth.uid());

drop policy if exists bars_read on public.bars;
create policy bars_read on public.bars for select using (public.is_admin() or public.is_member(id));
drop policy if exists bars_admin on public.bars;
create policy bars_admin on public.bars for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists members_read on public.bar_members;
create policy members_read on public.bar_members for select using (public.is_admin() or user_id = auth.uid());
drop policy if exists members_admin on public.bar_members;
create policy members_admin on public.bar_members for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists data_read on public.bar_data;
create policy data_read on public.bar_data for select using (public.is_admin() or public.is_member(bar_id));
drop policy if exists data_write on public.bar_data;
create policy data_write on public.bar_data for update using (public.can_edit(bar_id)) with check (public.can_edit(bar_id));

drop policy if exists history_read on public.bar_data_history;
create policy history_read on public.bar_data_history for select using (public.is_admin() or public.is_member(bar_id));

-- Guardar los datos de un bar: solo si nadie ha guardado otra versión antes (si no, devuelve el error «conflicto»).
create or replace function public.save_bar_data(p_bar uuid, p_data jsonb, p_version integer) returns integer
language plpgsql security definer set search_path = public as $$
declare cur integer;
begin
  if not public.can_edit(p_bar) then raise exception 'sin permiso' using errcode = '42501'; end if;
  if octet_length(p_data::text) > 5 * 1024 * 1024 then raise exception 'demasiado grande' using errcode = '22023'; end if;
  select version into cur from public.bar_data where bar_id = p_bar for update;
  if cur is null then raise exception 'bar inexistente' using errcode = 'P0002'; end if;
  if cur <> p_version then raise exception 'conflicto' using errcode = '40001', detail = cur::text; end if;
  insert into public.bar_data_history(bar_id, data, version, saved_by)
    select bar_id, data, version, updated_by from public.bar_data where bar_id = p_bar and version > 0;
  delete from public.bar_data_history where bar_id = p_bar and id not in
    (select id from public.bar_data_history where bar_id = p_bar order by version desc limit 30);
  update public.bar_data set data = p_data, version = cur + 1, updated_at = now(), updated_by = auth.uid() where bar_id = p_bar;
  return cur + 1;
end $$;

-- Administración (solo el administrador)
create or replace function public.admin_create_bar(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not public.is_admin() then raise exception 'sin permiso' using errcode = '42501'; end if;
  insert into public.bars(name, created_by) values (trim(p_name), auth.uid()) returning id into new_id;
  insert into public.bar_data(bar_id) values (new_id);
  return new_id;
end $$;

create or replace function public.admin_rename_bar(p_bar uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'sin permiso' using errcode = '42501'; end if;
  update public.bars set name = trim(p_name) where id = p_bar;
end $$;

-- Dar acceso a un correo ya invitado en Supabase (Authentication › Users › Invite user).
create or replace function public.admin_add_member(p_bar uuid, p_email text, p_role text default 'editor') returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'sin permiso' using errcode = '42501'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'correo no invitado' using errcode = 'P0002'; end if;
  insert into public.bar_members(bar_id, user_id, role) values (p_bar, uid, coalesce(p_role,'editor'))
    on conflict (bar_id, user_id) do update set role = excluded.role;
end $$;

create or replace function public.admin_remove_member(p_bar uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'sin permiso' using errcode = '42501'; end if;
  delete from public.bar_members where bar_id = p_bar and user_id = p_user;
end $$;

create or replace function public.admin_bar_members(p_bar uuid) returns table(user_id uuid, email text, role text, last_sign_in_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'sin permiso' using errcode = '42501'; end if;
  return query select m.user_id, u.email::text, m.role, u.last_sign_in_at
    from public.bar_members m join auth.users u on u.id = m.user_id where m.bar_id = p_bar order by u.email;
end $$;

-- Las funciones solo las pueden llamar usuarios con sesión iniciada.
revoke all on function public.save_bar_data(uuid, jsonb, integer), public.admin_create_bar(text), public.admin_rename_bar(uuid, text),
  public.admin_add_member(uuid, text, text), public.admin_remove_member(uuid, uuid), public.admin_bar_members(uuid) from public, anon;
grant execute on function public.save_bar_data(uuid, jsonb, integer), public.admin_create_bar(text), public.admin_rename_bar(uuid, text),
  public.admin_add_member(uuid, text, text), public.admin_remove_member(uuid, uuid), public.admin_bar_members(uuid) to authenticated;
revoke all on all tables in schema public from anon;

-- ÚLTIMO PASO (una sola vez, después de aceptar tu invitación): conviértete en administrador.
-- Cambia el correo por el tuyo y ejecuta solo esta línea:
-- insert into public.admins(user_id) select id from auth.users where email = 'TU_CORREO' on conflict do nothing;
