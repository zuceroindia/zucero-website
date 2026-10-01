alter table public.orders
  add column if not exists shipping_status text,
  add column if not exists shipping_status_updated_at timestamptz;

comment on column public.orders.shipping_status is
  'Exact latest carrier status received from Shiprocket; orders.status remains the coarse commerce lifecycle.';

alter table public.shipment_events
  add column if not exists event_key text;

create unique index if not exists shipment_events_event_key_unique
  on public.shipment_events (event_key)
  where event_key is not null;

create index if not exists orders_shipping_status_idx
  on public.orders (shipping_status, shipping_status_updated_at desc);
