-- 20260919180000_add_referrals_and_wallets.sql
-- Schema migration for Zucero Referral Codes & Customer Wallet Rewards

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_email text not null,
  owner_name text,
  owner_phone text,
  user_id uuid references auth.users(id) on delete set null,
  reward_percentage integer not null default 10,
  discount_percentage integer not null default 10,
  total_referred_orders integer not null default 0,
  total_earned_paise integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_referral_codes_code on public.referral_codes(upper(code));
create index if not exists idx_referral_codes_owner_email on public.referral_codes(lower(owner_email));

-- Wallets table
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  balance_paise integer not null default 0 check (balance_paise >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wallets_email on public.wallets(lower(email));

-- Wallet transactions ledger
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('credit_referral', 'debit_order', 'admin_credit', 'admin_debit', 'refund')),
  amount_paise integer not null,
  balance_after_paise integer not null check (balance_after_paise >= 0),
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_transactions_wallet_id on public.wallet_transactions(wallet_id);

-- Alter orders table
alter table public.orders add column if not exists referral_code_used text;
alter table public.orders add column if not exists wallet_spent_paise integer not null default 0;
alter table public.orders add column if not exists referral_reward_credited boolean not null default false;

-- RLS
alter table public.referral_codes enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

-- Policies for service_role access
create policy "Allow service_role full access on referral_codes" on public.referral_codes for all using (true) with check (true);
create policy "Allow service_role full access on wallets" on public.wallets for all using (true) with check (true);
create policy "Allow service_role full access on wallet_transactions" on public.wallet_transactions for all using (true) with check (true);
