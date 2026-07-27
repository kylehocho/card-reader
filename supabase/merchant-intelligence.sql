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

create table if not exists public.card_benefit_rules (
  id text primary key,
  card_product_id text not null references public.card_products(id) on delete cascade,
  issuer text not null,
  benefit_type text not null,
  title text not null,
  description text not null default '',
  value_amount numeric,
  value_currency text,
  value_unit text,
  cadence text,
  reset_window text,
  eligible_merchants text[] not null default '{}',
  eligible_categories text[] not null default '{}',
  activation_required boolean not null default false,
  enrollment_required boolean not null default false,
  requires_portal boolean not null default false,
  spend_threshold numeric,
  spend_window_days integer,
  bonus text,
  starts_at date,
  ends_at date,
  terms_url text,
  source_url text,
  source_type text not null default 'manual_research',
  confidence text not null default 'reviewed',
  review_status text not null default 'draft' check (review_status in ('draft', 'needs_review', 'reviewed', 'rejected')),
  source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issuer_offer_sources (
  id text primary key,
  issuer text not null,
  name text not null,
  source_url text not null,
  source_type text not null,
  cadence text not null default 'daily',
  priority integer not null default 100,
  is_active boolean not null default true,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.benefit_research_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'completed_with_review_items', 'failed')),
  scope text not null default 'daily',
  sources_checked integer not null default 0,
  new_items integer not null default 0,
  updated_items integer not null default 0,
  expired_items integer not null default 0,
  review_items integer not null default 0,
  notion_page_url text,
  summary text,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.benefit_research_findings (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid references public.benefit_research_runs(id) on delete set null,
  finding_type text not null check (finding_type in ('benefit', 'merchant_offer', 'reward_rule', 'signup_bonus', 'source_conflict', 'card_match_review')),
  issuer text,
  card_product_id text references public.card_products(id) on delete set null,
  merchant_id text references public.merchant_catalog(id) on delete set null,
  title text not null,
  normalized_payload jsonb not null default '{}'::jsonb,
  source_urls text[] not null default '{}',
  confidence text not null default 'needs_review',
  review_status text not null default 'needs_review' check (review_status in ('needs_review', 'reviewed', 'rejected', 'supabase_ready')),
  notion_page_url text,
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
create index if not exists card_benefit_rules_card_product_id_idx on public.card_benefit_rules (card_product_id);
create index if not exists card_benefit_rules_issuer_idx on public.card_benefit_rules (issuer);
create index if not exists card_benefit_rules_active_window_idx on public.card_benefit_rules (starts_at, ends_at);
create index if not exists issuer_offer_sources_issuer_idx on public.issuer_offer_sources (issuer);
create index if not exists benefit_research_runs_started_at_idx on public.benefit_research_runs (started_at desc);
create index if not exists benefit_research_findings_run_idx on public.benefit_research_findings (research_run_id);
create index if not exists benefit_research_findings_review_status_idx on public.benefit_research_findings (review_status);
create index if not exists recommendation_events_user_id_created_at_idx on public.recommendation_events (user_id, created_at desc);
create index if not exists recommendation_events_created_at_idx on public.recommendation_events (created_at desc);

alter table public.merchant_catalog enable row level security;
alter table public.merchant_offer_rules enable row level security;
alter table public.card_reward_rules enable row level security;
alter table public.card_benefit_rules enable row level security;
alter table public.issuer_offer_sources enable row level security;
alter table public.benefit_research_runs enable row level security;
alter table public.benefit_research_findings enable row level security;
alter table public.recommendation_events enable row level security;

grant select on public.merchant_catalog to authenticated;
grant select on public.merchant_offer_rules to authenticated;
grant select on public.card_reward_rules to authenticated;
grant select on public.card_benefit_rules to authenticated;

drop policy if exists "Authenticated users can read active merchants" on public.merchant_catalog;
create policy "Authenticated users can read active merchants"
on public.merchant_catalog for select
to authenticated
using (is_active = true);

drop policy if exists "Authenticated users can read merchant offer rules" on public.merchant_offer_rules;
create policy "Authenticated users can read merchant offer rules"
on public.merchant_offer_rules for select
to authenticated
using (
  exists (
    select 1
    from public.merchant_catalog merchant
    where merchant.id = merchant_offer_rules.merchant_id
      and merchant.is_active = true
  )
);

drop policy if exists "Authenticated users can read card reward rules" on public.card_reward_rules;
create policy "Authenticated users can read card reward rules"
on public.card_reward_rules for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read reviewed card benefit rules" on public.card_benefit_rules;
create policy "Authenticated users can read reviewed card benefit rules"
on public.card_benefit_rules for select
to authenticated
using (
  review_status = 'reviewed'
  and (starts_at is null or starts_at <= current_date)
  and (ends_at is null or ends_at >= current_date)
);

drop policy if exists "Users can read own recommendation events" on public.recommendation_events;
create policy "Users can read own recommendation events"
on public.recommendation_events for select
using (auth.uid() = user_id);
