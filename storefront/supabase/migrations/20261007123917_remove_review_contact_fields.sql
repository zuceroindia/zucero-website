-- Keep customer verification details ephemeral; public review rows must not store order contact PII.
alter table public.reviews
  drop column if exists customer_email,
  drop column if exists customer_phone;
