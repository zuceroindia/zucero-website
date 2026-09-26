alter table public.waitlist
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  order_number text,
  message text not null check (char_length(message) between 2 and 4000),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.contact_inquiries enable row level security;

grant insert on public.waitlist, public.contact_inquiries to authenticated;

create policy "verified users join waitlist"
on public.waitlist for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

create policy "verified users submit inquiries"
on public.contact_inquiries for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

create index if not exists contact_inquiries_created_idx
on public.contact_inquiries(created_at desc);
