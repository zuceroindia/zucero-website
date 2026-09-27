-- Keep integer paise as the payment source of truth, while exposing exact
-- two-decimal rupee amounts alongside them in the Supabase table editor.
alter table public.orders
  add column if not exists subtotal_rupees numeric(12, 2)
    generated always as (subtotal_paise::numeric / 100) stored,
  add column if not exists discount_rupees numeric(12, 2)
    generated always as (discount_paise::numeric / 100) stored,
  add column if not exists tax_rupees numeric(12, 2)
    generated always as (tax_paise::numeric / 100) stored,
  add column if not exists shipping_rupees numeric(12, 2)
    generated always as (shipping_paise::numeric / 100) stored,
  add column if not exists total_rupees numeric(12, 2)
    generated always as (total_paise::numeric / 100) stored;

alter table public.order_items
  add column if not exists unit_price_rupees numeric(12, 2)
    generated always as (unit_price_paise::numeric / 100) stored,
  add column if not exists tax_rupees numeric(12, 2)
    generated always as (tax_paise::numeric / 100) stored,
  add column if not exists line_total_rupees numeric(12, 2)
    generated always as (line_total_paise::numeric / 100) stored;

comment on column public.orders.total_rupees is
  'Display/reporting amount in INR. total_paise remains the payment source of truth.';
