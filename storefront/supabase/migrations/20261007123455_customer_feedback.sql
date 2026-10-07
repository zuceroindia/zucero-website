-- Customer feedback flow: verified delivered-order reviews with optional public images.
alter table public.reviews
  alter column user_id drop not null,
  add column if not exists order_id uuid references public.orders(id) on delete cascade,
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists verified_purchase boolean not null default false,
  add column if not exists source text not null default 'website',
  add column if not exists published_at timestamptz,
  add column if not exists customer_email text,
  add column if not exists customer_phone text;

update public.reviews r
set order_id = oi.order_id
from public.order_items oi
where r.order_item_id = oi.id
  and r.order_id is null;

create unique index if not exists reviews_order_id_unique_idx
  on public.reviews(order_id)
  where order_id is not null;

create index if not exists reviews_public_feed_idx
  on public.reviews(approved, published_at desc, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-images',
  'review-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into public.whatsapp_crm_templates
  (label, body, category, active, sort_order, created_at, updated_at)
select
  '⭐ Ask for Feedback',
  'Hello {{name}}, thank you for choosing Zucero. We would love to hear about your experience with order #{{order_number}}. Please share a short review and, if you wish, a photo here: {{feedback_link}}',
  'quick_reply',
  true,
  50,
  now(),
  now()
where not exists (
  select 1
  from public.whatsapp_crm_templates
  where lower(label) = lower('⭐ Ask for Feedback')
);
