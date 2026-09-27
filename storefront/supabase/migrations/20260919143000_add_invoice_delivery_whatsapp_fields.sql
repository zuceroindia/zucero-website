-- Migration: Add invoice_number, estimated_delivery_window, and whatsapp_status columns to orders table
alter table public.orders
  add column if not exists invoice_number text,
  add column if not exists estimated_delivery_window text,
  add column if not exists whatsapp_status text;

comment on column public.orders.invoice_number is 'Formatted GST tax invoice identifier, e.g. INV-ZUC-12345';
comment on column public.orders.estimated_delivery_window is 'Expected delivery window derived from Shiprocket or pincode heuristics, e.g. 2-4 business days';
comment on column public.orders.whatsapp_status is 'Status of automated outbound WhatsApp confirmation dispatch';
