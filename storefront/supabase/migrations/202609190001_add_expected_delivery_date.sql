alter table public.orders
  add column if not exists expected_delivery_date date;

comment on column public.orders.expected_delivery_date is
  'Courier estimate captured when the customer checked out; shown in confirmations and account history.';
