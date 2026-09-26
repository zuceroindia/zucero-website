-- These tables are accessed only by server-side routes through the service-role
-- client. Previous USING (true) policies were not scoped to service_role and
-- therefore also exposed sensitive rows to anon/authenticated API clients.
drop policy if exists "Allow service_role full access on referral_codes" on public.referral_codes;
drop policy if exists "Allow service_role full access on wallets" on public.wallets;
drop policy if exists "Allow service_role full access on wallet_transactions" on public.wallet_transactions;
drop policy if exists "Allow service_role full access on subscriptions" on public.subscriptions;

-- service_role bypasses RLS by design, so no replacement policies are needed.
-- With RLS enabled and no public policy, direct anon/authenticated access is denied.
