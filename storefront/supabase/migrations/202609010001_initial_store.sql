-- Zucero launch schema. Apply through Supabase migrations after preview approval.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.order_status as enum ('pending_payment','paid','processing','shipped','delivered','cancelled','refunded','payment_failed');
create type public.payment_status as enum ('pending','authorized','captured','failed','refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  ingredients text not null default '',
  image_path text not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  label text not null,
  weight_grams integer not null check (weight_grams > 0),
  length_cm numeric(8,2) not null check (length_cm > 0),
  breadth_cm numeric(8,2) not null check (breadth_cm > 0),
  height_cm numeric(8,2) not null check (height_cm > 0),
  price_paise integer not null check (price_paise >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country_code char(2) not null default 'IN',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address jsonb not null,
  billing_address jsonb not null,
  status public.order_status not null default 'pending_payment',
  payment_status public.payment_status not null default 'pending',
  currency char(3) not null default 'INR',
  subtotal_paise integer not null check (subtotal_paise >= 0),
  discount_paise integer not null default 0 check (discount_paise >= 0),
  tax_paise integer not null check (tax_paise >= 0),
  shipping_paise integer not null check (shipping_paise >= 0),
  total_paise integer not null check (total_paise >= 0),
  tax_mode text not null check (tax_mode in ('CGST_SGST','IGST')),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  shiprocket_order_id text,
  shiprocket_shipment_id text,
  tracking_awb text,
  courier_name text,
  tracking_url text,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  sku text not null,
  product_name text not null,
  variant_label text not null,
  quantity integer not null check (quantity > 0),
  unit_price_paise integer not null check (unit_price_paise >= 0),
  tax_paise integer not null check (tax_paise >= 0),
  line_total_paise integer not null check (line_total_paise >= 0)
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  payload jsonb not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  consented_at timestamptz not null default now(),
  source text not null default 'homepage'
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 1200),
  display_name text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;
alter table public.shipment_events enable row level security;
alter table public.waitlist enable row level security;
alter table public.reviews enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.products, public.product_variants to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.addresses to authenticated;
grant select on public.orders, public.order_items, public.shipment_events to authenticated;
grant select, insert, update on public.reviews to authenticated;
grant select on public.reviews to anon;

create policy "active products are public" on public.products for select using (active = true);
create policy "active variants are public" on public.product_variants for select using (active = true);
create policy "users read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "users insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "users manage own addresses" on public.addresses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users read own orders" on public.orders for select to authenticated using ((select auth.uid()) = user_id);
create policy "users read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "users read own shipment events" on public.shipment_events for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "approved reviews are public" on public.reviews for select using (approved = true or (select auth.uid()) = user_id);
create policy "verified buyers add reviews" on public.reviews for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id and o.user_id = (select auth.uid()) and o.status = 'delivered'
  )
);
create policy "authors edit pending reviews" on public.reviews for update to authenticated using ((select auth.uid()) = user_id and approved = false) with check ((select auth.uid()) = user_id and approved = false);

create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index orders_status_idx on public.orders(status, created_at);
create index order_items_order_idx on public.order_items(order_id);
create index shipment_events_order_idx on public.shipment_events(order_id, occurred_at desc);
create index variants_product_idx on public.product_variants(product_id) where active = true;
create unique index waitlist_email_unique_idx on public.waitlist(lower(email));

create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

-- Waitlist and all payment/order writes are performed by validated server routes
-- using the secret key. No browser write grants are provided for those tables.
