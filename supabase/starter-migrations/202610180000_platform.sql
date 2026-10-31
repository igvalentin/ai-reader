-- Starter Kit platform foundation: profiles, roles and auth triggers.
-- Apply first to a verified, empty Supabase project, before the catalog migration.
begin;
create type public.app_role as enum ('free','premium','donor','admin');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text, avatar_url text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select,insert,update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy profile_owner_select on public.profiles for select to authenticated using(auth.uid()=id);
create policy profile_owner_insert on public.profiles for insert to authenticated with check(auth.uid()=id);
create policy profile_owner_update on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);

create table public.user_roles (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 role public.app_role not null,
 granted_at timestamptz not null default now(), expires_at timestamptz,
 unique(user_id,role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy role_owner_read on public.user_roles for select to authenticated using(auth.uid()=user_id);

create function public.has_role(_user_id uuid,_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.user_roles where user_id=_user_id and role=_role and (expires_at is null or expires_at>now()));
$$;
revoke all on function public.has_role(uuid,public.app_role) from public,anon;
grant execute on function public.has_role(uuid,public.app_role) to authenticated,service_role;

create function public.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'name',''),100));
 return new;
end;
$$;
revoke all on function public.create_profile() from public,anon,authenticated;
create trigger create_profile after insert on auth.users for each row execute function public.create_profile();
-- Existing users in this target receive profiles only, never roles.
insert into public.profiles(id,display_name) select id,left(coalesce(raw_user_meta_data->>'display_name',raw_user_meta_data->>'name',''),100) from auth.users on conflict(id) do nothing;
commit;
