create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'Staff' check (role in ('Admin', 'Staff')),
  phone text not null default '',
  bio text not null default '',
  address text not null default '',
  country text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.municipalities (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.farm_state (
  path text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.water_sensor_readings (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  payload jsonb not null
);
create index if not exists water_sensor_readings_occurred_at_idx
  on public.water_sensor_readings (occurred_at desc);

create table if not exists public.device_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  timestamp text not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists device_logs_source_created_at_idx
  on public.device_logs (source, created_at desc);

create table if not exists public.water_schedules (
  id uuid primary key default gen_random_uuid(),
  schedule jsonb not null,
  last_executed timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.is_farm_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'Admin'
  );
$$;

create or replace function public.create_farm_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_farm_profile on auth.users;
create trigger on_auth_user_created_farm_profile
  after insert on auth.users
  for each row execute procedure public.create_farm_profile();

create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
    and not public.is_farm_admin() then
    raise exception 'Only an administrator can change profile roles';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_self_role_change();

alter table public.profiles enable row level security;
alter table public.municipalities enable row level security;
alter table public.farm_state enable row level security;
alter table public.water_sensor_readings enable row level security;
alter table public.device_logs enable row level security;
alter table public.water_schedules enable row level security;

drop policy if exists "Profiles are visible to their owner and admins" on public.profiles;
create policy "Profiles are visible to their owner and admins"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_farm_admin());
drop policy if exists "Profiles are editable by their owner and admins" on public.profiles;
create policy "Profiles are editable by their owner and admins"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_farm_admin())
  with check (id = (select auth.uid()) or public.is_farm_admin());
drop policy if exists "Admins can create profiles" on public.profiles;
create policy "Admins can create profiles"
  on public.profiles for insert to authenticated
  with check (public.is_farm_admin());
drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
  on public.profiles for delete to authenticated
  using (public.is_farm_admin());

drop policy if exists "Authenticated users can read municipalities" on public.municipalities;
create policy "Authenticated users can read municipalities"
  on public.municipalities for select to authenticated using (true);
drop policy if exists "Admins can manage municipalities" on public.municipalities;
create policy "Admins can manage municipalities"
  on public.municipalities for all to authenticated
  using (public.is_farm_admin()) with check (public.is_farm_admin());

drop policy if exists "Authenticated users can read farm state" on public.farm_state;
create policy "Authenticated users can read farm state"
  on public.farm_state for select to authenticated using (true);
drop policy if exists "Authenticated users can update farm state" on public.farm_state;
create policy "Authenticated users can update farm state"
  on public.farm_state for all to authenticated
  using (true) with check (true);

drop policy if exists "Authenticated users can read sensor readings" on public.water_sensor_readings;
create policy "Authenticated users can read sensor readings"
  on public.water_sensor_readings for select to authenticated using (true);
drop policy if exists "Authenticated users can add sensor readings" on public.water_sensor_readings;
create policy "Authenticated users can add sensor readings"
  on public.water_sensor_readings for insert to authenticated with check (true);

drop policy if exists "Authenticated users can read device logs" on public.device_logs;
create policy "Authenticated users can read device logs"
  on public.device_logs for select to authenticated using (true);
drop policy if exists "Authenticated users can add device logs" on public.device_logs;
create policy "Authenticated users can add device logs"
  on public.device_logs for insert to authenticated with check (true);

drop policy if exists "Authenticated users can read schedules" on public.water_schedules;
create policy "Authenticated users can read schedules"
  on public.water_schedules for select to authenticated using (true);
drop policy if exists "Authenticated users can manage schedules" on public.water_schedules;
create policy "Authenticated users can manage schedules"
  on public.water_schedules for all to authenticated
  using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select to public using (bucket_id = 'avatars');
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.municipalities to authenticated;
grant select, insert, update, delete on public.farm_state to authenticated;
grant select, insert on public.water_sensor_readings to authenticated;
grant select, insert on public.device_logs to authenticated;
grant select, insert, update, delete on public.water_schedules to authenticated;
grant execute on function public.is_farm_admin() to authenticated;

-- Enable these tables for Realtime in Supabase Dashboard > Database > Publications.
