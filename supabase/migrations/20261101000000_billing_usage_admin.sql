-- Additive migration for recurring plan metadata and privacy-preserving usage metrics.
-- Apply manually only after reviewing and backing up the target project. It does not drop or
-- rewrite existing user, usage, or subscription rows.

alter table public.subscriptions
  add column if not exists plan_id text,
  add column if not exists current_period_start timestamptz,
  add column if not exists provider_event_created bigint;

create table if not exists public.usage_metrics (
  actor_key text primary key,
  actor_type text not null check (actor_type in ('anonymous', 'registered')),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_hash text,
  first_seen timestamptz not null default now(),
  last_activity timestamptz not null default now(),
  ocr_attempts bigint not null default 0 check (ocr_attempts >= 0),
  audio_attempts bigint not null default 0 check (audio_attempts >= 0),
  successful_audio_generations bigint not null default 0 check (successful_audio_generations >= 0),
  constraint usage_metrics_actor_identity_check check (
    (actor_type = 'registered' and user_id is not null and anonymous_hash is null)
    or (actor_type = 'anonymous' and user_id is null and anonymous_hash is not null)
  )
);

alter table public.usage_metrics
  add column if not exists audio_attempts bigint not null default 0 check (audio_attempts >= 0);

create index if not exists usage_metrics_user_id_idx on public.usage_metrics (user_id);
create index if not exists usage_metrics_last_activity_idx on public.usage_metrics (last_activity desc);

alter table public.usage_metrics enable row level security;
revoke all on public.usage_metrics from public, anon, authenticated;
grant select, insert, update, delete on public.usage_metrics to service_role;
grant select, delete on public.anonymous_reading_usage to service_role;

create or replace function public.record_usage_metric(
  p_user_id uuid,
  p_anonymous_hash text,
  p_event_type text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_kind text;
  actor_key_value text;
begin
  if (p_user_id is null) = (p_anonymous_hash is null) then
    raise exception 'exactly one actor identity is required';
  end if;
  if p_event_type not in ('ocr_attempt', 'audio_attempt', 'audio_success') then
    raise exception 'unsupported usage event';
  end if;

  if p_user_id is not null then
    actor_kind := 'registered';
    actor_key_value := 'user:' || p_user_id::text;
  else
    actor_kind := 'anonymous';
    actor_key_value := 'anon:' || p_anonymous_hash;
  end if;

  insert into public.usage_metrics as existing_metrics (
    actor_key, actor_type, user_id, anonymous_hash, ocr_attempts, audio_attempts,
    successful_audio_generations, first_seen, last_activity
  ) values (
    actor_key_value, actor_kind, p_user_id, p_anonymous_hash,
    case when p_event_type = 'ocr_attempt' then 1 else 0 end,
    case when p_event_type = 'audio_attempt' then 1 else 0 end,
    case when p_event_type = 'audio_success' then 1 else 0 end,
    now(), now()
  )
  on conflict (actor_key) do update set
    last_activity = now(),
    ocr_attempts = existing_metrics.ocr_attempts
      + case when p_event_type = 'ocr_attempt' then 1 else 0 end,
    audio_attempts = existing_metrics.audio_attempts
      + case when p_event_type = 'audio_attempt' then 1 else 0 end,
    successful_audio_generations = existing_metrics.successful_audio_generations
      + case when p_event_type = 'audio_success' then 1 else 0 end;
end;
$$;

revoke all on function public.record_usage_metric(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_usage_metric(uuid, text, text) to service_role;

create or replace function public.merge_anonymous_usage_metrics(
  p_user_id uuid,
  p_anonymous_hash text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  anonymous_metrics public.usage_metrics%rowtype;
begin
  select * into anonymous_metrics
    from public.usage_metrics
    where actor_key = 'anon:' || p_anonymous_hash
    for update;
  if not found then
    return;
  end if;

  insert into public.usage_metrics as existing_metrics (
    actor_key, actor_type, user_id, ocr_attempts, audio_attempts,
    successful_audio_generations, first_seen, last_activity
  ) values (
    'user:' || p_user_id::text, 'registered', p_user_id,
    anonymous_metrics.ocr_attempts, anonymous_metrics.audio_attempts,
    anonymous_metrics.successful_audio_generations,
    anonymous_metrics.first_seen, anonymous_metrics.last_activity
  )
  on conflict (actor_key) do update set
    first_seen = least(existing_metrics.first_seen, excluded.first_seen),
    last_activity = greatest(existing_metrics.last_activity, excluded.last_activity),
    ocr_attempts = existing_metrics.ocr_attempts + excluded.ocr_attempts,
    audio_attempts = existing_metrics.audio_attempts + excluded.audio_attempts,
    successful_audio_generations = existing_metrics.successful_audio_generations
      + excluded.successful_audio_generations;

  delete from public.usage_metrics where actor_key = anonymous_metrics.actor_key;
end;
$$;

revoke all on function public.merge_anonymous_usage_metrics(uuid, text) from public, anon, authenticated;
grant execute on function public.merge_anonymous_usage_metrics(uuid, text) to service_role;

-- Keep the atomic free-use claim, but make expired recurring subscriptions ineligible and
-- increment successful-audio metrics in the same transaction as the entitlement claim.
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
  subscription_period_end timestamptz;
  claimed_count integer;
begin
  if p_user_id is not null then
    select status, current_period_end
      into subscription_status, subscription_period_end
      from public.subscriptions
      where user_id = p_user_id;

    if subscription_status in ('trialing', 'active') and subscription_period_end > now() then
      perform public.record_usage_metric(p_user_id, null, 'audio_success');
      return jsonb_build_object('allowed', true, 'subscription', true);
    end if;

    insert into public.reading_usage (user_id) values (p_user_id) on conflict (user_id) do nothing;
    update public.reading_usage
      set free_reading_used = true, free_reading_used_at = now(), updated_at = now()
      where user_id = p_user_id and free_reading_used = false;
    get diagnostics claimed_count = row_count;
    if claimed_count = 1 then
      perform public.record_usage_metric(p_user_id, null, 'audio_success');
      return jsonb_build_object('allowed', true, 'subscription', false);
    end if;
    return jsonb_build_object('allowed', false, 'reason', 'free_reading_used');
  end if;

  if p_anonymous_hash is null then
    raise exception 'anonymous identifier required';
  end if;
  insert into public.anonymous_reading_usage (identifier_hash)
    values (p_anonymous_hash) on conflict do nothing;
  if found then
    perform public.record_usage_metric(null, p_anonymous_hash, 'audio_success');
    return jsonb_build_object('allowed', true, 'subscription', false);
  end if;
  return jsonb_build_object('allowed', false, 'reason', 'free_reading_used');
end;
$$;

revoke all on function public.claim_free_reading(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_free_reading(uuid, text) to service_role;

-- Record each Stripe subscription event and its entitlement update in one transaction. A failed
-- update rolls back the event insert so Stripe can retry; duplicate/out-of-order events are safe.
create or replace function public.apply_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_plan_id text,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if p_status not in ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid') then
    raise exception 'unsupported subscription state';
  end if;

  insert into public.billing_events (provider_event_id, event_type)
    values (p_event_id, p_event_type)
    on conflict (provider_event_id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return false;
  end if;

  insert into public.subscriptions as current_subscription (
    user_id, status, plan_id, provider_customer_id, provider_subscription_id,
    current_period_start, current_period_end, cancel_at_period_end,
    provider_event_created, updated_at
  ) values (
    p_user_id, p_status, p_plan_id, p_customer_id, p_subscription_id,
    p_current_period_start, p_current_period_end, p_cancel_at_period_end,
    p_event_created, now()
  )
  on conflict (user_id) do update set
    status = excluded.status,
    plan_id = coalesce(excluded.plan_id, current_subscription.plan_id),
    provider_customer_id = excluded.provider_customer_id,
    provider_subscription_id = excluded.provider_subscription_id,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    provider_event_created = excluded.provider_event_created,
    updated_at = now()
  where coalesce(current_subscription.provider_event_created, 0) <= excluded.provider_event_created;

  return true;
end;
$$;

revoke all on function public.apply_stripe_subscription_event(text, text, bigint, uuid, text, text, text, text, timestamptz, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.apply_stripe_subscription_event(text, text, bigint, uuid, text, text, text, text, timestamptz, timestamptz, boolean) to service_role;
