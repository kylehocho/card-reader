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

drop trigger if exists plaid_transactions_set_updated_at on public.plaid_transactions;
create trigger plaid_transactions_set_updated_at
before update on public.plaid_transactions
for each row execute function public.set_updated_at();

alter table public.plaid_transactions enable row level security;

drop policy if exists "Users can read own Plaid transactions" on public.plaid_transactions;
create policy "Users can read own Plaid transactions"
on public.plaid_transactions for select
using (auth.uid() = user_id);
