create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  display_name text,
  notifications_opt_in boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id text,
  institution_name text,
  item_id text not null,
  access_token_encrypted text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create table if not exists public.plaid_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id uuid not null references public.plaid_items(id) on delete cascade,
  account_id text not null,
  name text not null,
  official_name text,
  mask text,
  type text not null,
  subtype text,
  current_balance numeric,
  available_balance numeric,
  credit_limit numeric,
  iso_currency_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id)
);

create table if not exists public.plaid_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id uuid not null references public.plaid_items(id) on delete cascade,
  plaid_account_id uuid references public.plaid_accounts(id) on delete set null,
  account_id text not null,
  transaction_id text not null,
  name text not null,
  merchant_name text,
  amount numeric not null,
  iso_currency_code text,
  date date not null,
  authorized_date date,
  pending boolean not null default false,
  payment_channel text,
  category text[] not null default '{}',
  category_id text,
  personal_finance_category jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, transaction_id)
);

create table if not exists public.card_products (
  id text primary key,
  issuer text not null,
  name text not null,
  network text,
  product_type text not null default 'credit',
  is_business boolean not null default false,
  annual_fee numeric not null default 0,
  reward_currency text,
  rewards jsonb not null default '{}'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_card_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_account_id uuid not null references public.plaid_accounts(id) on delete cascade,
  card_product_id text not null references public.card_products(id),
  match_status text not null default 'manual',
  match_confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plaid_account_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists plaid_items_set_updated_at on public.plaid_items;
create trigger plaid_items_set_updated_at
before update on public.plaid_items
for each row execute function public.set_updated_at();

drop trigger if exists plaid_accounts_set_updated_at on public.plaid_accounts;
create trigger plaid_accounts_set_updated_at
before update on public.plaid_accounts
for each row execute function public.set_updated_at();

drop trigger if exists plaid_transactions_set_updated_at on public.plaid_transactions;
create trigger plaid_transactions_set_updated_at
before update on public.plaid_transactions
for each row execute function public.set_updated_at();

drop trigger if exists card_products_set_updated_at on public.card_products;
create trigger card_products_set_updated_at
before update on public.card_products
for each row execute function public.set_updated_at();

drop trigger if exists account_card_matches_set_updated_at on public.account_card_matches;
create trigger account_card_matches_set_updated_at
before update on public.account_card_matches
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.plaid_items enable row level security;
alter table public.plaid_accounts enable row level security;
alter table public.plaid_transactions enable row level security;
alter table public.card_products enable row level security;
alter table public.account_card_matches enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own Plaid items" on public.plaid_items;
create policy "Users can read own Plaid items"
on public.plaid_items for select
using (auth.uid() = user_id);

drop policy if exists "Users can read own Plaid accounts" on public.plaid_accounts;
create policy "Users can read own Plaid accounts"
on public.plaid_accounts for select
using (auth.uid() = user_id);

drop policy if exists "Users can read own Plaid transactions" on public.plaid_transactions;
create policy "Users can read own Plaid transactions"
on public.plaid_transactions for select
using (auth.uid() = user_id);

drop policy if exists "Anyone authenticated can read card products" on public.card_products;
create policy "Anyone authenticated can read card products"
on public.card_products for select
to authenticated
using (true);

drop policy if exists "Users can read own account card matches" on public.account_card_matches;
create policy "Users can read own account card matches"
on public.account_card_matches for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own account card matches" on public.account_card_matches;
create policy "Users can insert own account card matches"
on public.account_card_matches for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own account card matches" on public.account_card_matches;
create policy "Users can update own account card matches"
on public.account_card_matches for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.card_products (id, issuer, name, network, product_type, is_business, annual_fee, reward_currency, rewards, benefits)
values
  (
    'chase-sapphire-reserve',
    'Chase',
    'Chase Sapphire Reserve',
    'Visa',
    'credit',
    false,
    550,
    'Ultimate Rewards',
    '{"dining": 3, "travel": 3, "general": 1}'::jsonb,
    '[{"title":"Annual travel credit","value":"$300"},{"title":"Priority Pass Select","value":"included"}]'::jsonb
  ),
  (
    'amex-gold',
    'American Express',
    'American Express Gold Card',
    'American Express',
    'credit',
    false,
    325,
    'Membership Rewards',
    '{"restaurants": 4, "us_supermarkets": 4, "flights": 3, "general": 1}'::jsonb,
    '[{"title":"Dining credit","value":"$10 monthly"},{"title":"Uber Cash","value":"$10 monthly"}]'::jsonb
  ),
  (
    'amex-platinum',
    'American Express',
    'The Platinum Card from American Express',
    'American Express',
    'credit',
    false,
    695,
    'Membership Rewards',
    '{"flights": 5, "prepaid_hotels": 5, "general": 1}'::jsonb,
    '[{"title":"Airline fee credit","value":"$200"},{"title":"Saks credit","value":"$100 annual"},{"title":"Lounge access","value":"included"}]'::jsonb
  ),
  (
    'capital-one-venture-x',
    'Capital One',
    'Capital One Venture X Rewards Credit Card',
    'Visa',
    'credit',
    false,
    395,
    'Capital One Miles',
    '{"capital_one_travel_hotels": 10, "capital_one_travel_flights": 5, "general": 2}'::jsonb,
    '[{"title":"Travel credit","value":"$300"},{"title":"Anniversary miles","value":"10000 miles"}]'::jsonb
  )
on conflict (id) do update set
  issuer = excluded.issuer,
  name = excluded.name,
  network = excluded.network,
  product_type = excluded.product_type,
  is_business = excluded.is_business,
  annual_fee = excluded.annual_fee,
  reward_currency = excluded.reward_currency,
  rewards = excluded.rewards,
  benefits = excluded.benefits;

-- Plaid item/account writes should happen only from trusted server code using the
-- Supabase service-role key after exchanging Plaid public tokens. Do not add
-- client insert/update policies for access-token-bearing tables.
