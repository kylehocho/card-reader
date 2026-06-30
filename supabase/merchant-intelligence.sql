-- Merchant/card intelligence tables for the recommendation engine scaling path.
-- This migration is a blueprint until admin/import workflows are ready to own these rows.

create table if not exists public.merchant_catalog (
  id text primary key,
  name text not null,
  domains text[] not null default '{}',
  aliases text[] not null default '{}',
  reward_category text not null default 'general',
  mcc_codes text[] not null default '{}',
  is_active boolean not null default true,
  source text not null default 'manual_catalog',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_offer_rules (
  id text primary key,
  merchant_id text not null references public.merchant_catalog(id) on delete cascade,
  title text not null,
  issuer text,
  eligible_card_product_ids text[] not null default '{}',
  enrollment_required boolean not null default false,
  activation_required boolean not null default false,
  starts_at date,
  ends_at date,
  confidence text not null default 'catalog-rule',
  source text not null default 'manual_catalog',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.card_reward_rules (
  id text primary key,
  card_product_id text not null references public.card_products(id) on delete cascade,
  reward_category text not null,
  multiplier numeric not null,
  merchant_id text references public.merchant_catalog(id) on delete set null,
  requires_portal boolean not null default false,
  cap_value numeric,
  cap_window text,
  starts_at date,
  ends_at date,
  source text not null default 'manual_catalog',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  mode text not null check (mode in ('demo', 'signed_in')),
  merchant text not null,
  host text,
  url text,
  title text,
  category text not null,
  best_card_product_id text references public.card_products(id) on delete set null,
  runner_up_card_product_id text references public.card_products(id) on delete set null,
  matched_offer_title text,
  candidate_card_count integer not null default 0,
  request_context jsonb not null default '{}'::jsonb,
  response_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists merchant_catalog_domains_idx on public.merchant_catalog using gin (domains);
create index if not exists merchant_catalog_aliases_idx on public.merchant_catalog using gin (aliases);
create index if not exists merchant_offer_rules_merchant_id_idx on public.merchant_offer_rules (merchant_id);
create index if not exists card_reward_rules_card_product_id_idx on public.card_reward_rules (card_product_id);
create index if not exists card_reward_rules_reward_category_idx on public.card_reward_rules (reward_category);
create index if not exists recommendation_events_user_id_created_at_idx on public.recommendation_events (user_id, created_at desc);
create index if not exists recommendation_events_created_at_idx on public.recommendation_events (created_at desc);

alter table public.merchant_catalog enable row level security;
alter table public.merchant_offer_rules enable row level security;
alter table public.card_reward_rules enable row level security;
alter table public.recommendation_events enable row level security;

drop policy if exists "Users can read own recommendation events" on public.recommendation_events;
create policy "Users can read own recommendation events"
on public.recommendation_events for select
using (auth.uid() = user_id);
