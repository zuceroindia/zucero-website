alter table public.waitlist
  add column if not exists phone text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text default 'India';

alter table public.contact_inquiries
  add column if not exists phone text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text default 'India';

create table if not exists public.purchase_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null check (postal_code ~ '^[0-9]{6}$'),
  country text not null default 'India',
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  source text not null default 'website',
  status text not null default 'new' check (status in ('new', 'contacted', 'confirmed', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.purchase_inquiries enable row level security;

revoke all on table public.purchase_inquiries from anon, authenticated;
grant insert on table public.purchase_inquiries to authenticated;

drop policy if exists "verified users submit purchase inquiries" on public.purchase_inquiries;
create policy "verified users submit purchase inquiries"
on public.purchase_inquiries for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and lower(email) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
);

create index if not exists purchase_inquiries_user_idx
on public.purchase_inquiries(user_id);

create index if not exists purchase_inquiries_created_idx
on public.purchase_inquiries(created_at desc);
