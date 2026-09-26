-- Payment callbacks may be delivered more than once. Enforce one wallet
-- debit and one referral reward per order at the database boundary.
create unique index if not exists wallet_transactions_one_order_debit_idx
  on public.wallet_transactions (wallet_id, order_id, type)
  where order_id is not null and type = 'debit_order';

create unique index if not exists wallet_transactions_one_referral_reward_idx
  on public.wallet_transactions (wallet_id, order_id, type)
  where order_id is not null and type = 'credit_referral';
