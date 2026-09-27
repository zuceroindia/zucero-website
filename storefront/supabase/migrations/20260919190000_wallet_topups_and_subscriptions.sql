-- 20260919190000_wallet_topups_and_subscriptions.sql
-- Migration for Wallet Top-ups and Recurring Subscriptions

-- 1. Update wallet_transactions constraint to include 'wallet_topup' and 'subscription_debit'
alter table public.wallet_transactions drop constraint if exists wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in ('credit_referral', 'wallet_topup', 'debit_order', 'subscription_debit', 'admin_credit', 'admin_debit', 'refund'));

-- 2. Subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null,
  user_id uuid references auth.users(id) on delete set null,
  product_variant_id text not null,
  product_name text not null,
  variant_label text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_paise integer not null default 0,
  frequency text not null check (frequency in ('weekly', 'monthly', 'custom')),
  interval_weeks integer default 1 check (interval_weeks is null or interval_weeks > 0),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  shipping_address jsonb not null,
  next_billing_date timestamptz not null default (now() + interval '7 days'),
  last_billing_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_customer_email on public.subscriptions (lower(customer_email));
create index if not exists idx_subscriptions_status on public.subscriptions (status);
create index if not exists idx_subscriptions_next_billing on public.subscriptions (next_billing_date);

-- 3. Enable RLS
alter table public.subscriptions enable row level security;

-- Drop and recreate service_role policy for subscriptions
drop policy if exists "Allow service_role full access on subscriptions" on public.subscriptions;
create policy "Allow service_role full access on subscriptions"
  on public.subscriptions for all using (true) with check (true);
