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

drop trigger if exists card_products_set_updated_at on public.card_products;
create trigger card_products_set_updated_at
before update on public.card_products
for each row execute function public.set_updated_at();

drop trigger if exists account_card_matches_set_updated_at on public.account_card_matches;
create trigger account_card_matches_set_updated_at
before update on public.account_card_matches
for each row execute function public.set_updated_at();

alter table public.card_products enable row level security;
alter table public.account_card_matches enable row level security;

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
