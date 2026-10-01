create table if not exists public.discount_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_percentage smallint not null check (discount_percentage between 1 and 90),
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemptions_count integer not null default 0 check (redemptions_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_coupons_uppercase_code check (code = upper(code))
);

create unique index if not exists discount_coupons_code_unique
  on public.discount_coupons (upper(code));

alter table public.discount_coupons enable row level security;
revoke all on public.discount_coupons from anon, authenticated;

alter table public.orders
  add column if not exists coupon_code_used text,
  add column if not exists coupon_redemption_counted boolean not null default false;

create index if not exists discount_coupons_active_idx
  on public.discount_coupons (active, expires_at);

create or replace function public.count_order_coupon_redemption(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  used_code text;
begin
  update public.orders
     set coupon_redemption_counted = true, updated_at = now()
   where id = target_order_id
     and coupon_code_used is not null
     and coupon_redemption_counted = false
  returning coupon_code_used into used_code;

  if used_code is not null then
    update public.discount_coupons
       set redemptions_count = redemptions_count + 1, updated_at = now()
     where code = used_code;
  end if;
end;
$$;

revoke all on function public.count_order_coupon_redemption(uuid) from public, anon, authenticated;
grant execute on function public.count_order_coupon_redemption(uuid) to service_role;
