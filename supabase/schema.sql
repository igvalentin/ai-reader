-- Apply this migration to the Supabase project before enabling paid reading.
-- No production billing configuration is changed by this repository.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.reading_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_reading_used boolean not null default false,
  free_reading_used_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.anonymous_reading_usage (
  identifier_hash text primary key,
  free_reading_used_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'none' check (status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid')),
  provider_customer_id text unique,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  provider_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.reading_usage enable row level security;
alter table public.subscriptions enable row level security;
alter table public.anonymous_reading_usage enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "profiles are readable by owner" on public.profiles;
create policy "profiles are readable by owner" on public.profiles for select using (auth.uid() = id);
drop policy if exists "usage is readable by owner" on public.reading_usage;
create policy "usage is readable by owner" on public.reading_usage for select using (auth.uid() = user_id);
drop policy if exists "subscriptions are readable by owner" on public.subscriptions;
create policy "subscriptions are readable by owner" on public.subscriptions for select using (auth.uid() = user_id);

create or replace function public.claim_free_reading(
  p_user_id uuid default null,
  p_anonymous_hash text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  subscription_status text;
  claimed_count integer;
begin
  if p_user_id is not null then
    select status into subscription_status from public.subscriptions where user_id = p_user_id;
    if subscription_status in ('trialing', 'active') then
      return jsonb_build_object('allowed', true, 'subscription', true);
    end if;

    insert into public.reading_usage (user_id) values (p_user_id) on conflict (user_id) do nothing;
    update public.reading_usage
      set free_reading_used = true, free_reading_used_at = now(), updated_at = now()
      where user_id = p_user_id and free_reading_used = false;
    get diagnostics claimed_count = row_count;
    if claimed_count = 1 then
      return jsonb_build_object('allowed', true, 'subscription', false);
    end if;
    return jsonb_build_object('allowed', false, 'reason', 'free_reading_used');
  end if;

  if p_anonymous_hash is null then
    raise exception 'anonymous identifier required';
  end if;
  insert into public.anonymous_reading_usage (identifier_hash) values (p_anonymous_hash) on conflict do nothing;
  if found then
    return jsonb_build_object('allowed', true, 'subscription', false);
  end if;
  return jsonb_build_object('allowed', false, 'reason', 'free_reading_used');
end;
$$;

revoke all on function public.claim_free_reading(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_free_reading(uuid, text) to service_role;
