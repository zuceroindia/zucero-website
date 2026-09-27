-- First-party WhatsApp Cloud API inbox. These tables are service-role only.
create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique check (wa_id ~ '^[0-9]{8,20}$'),
  profile_name text,
  last_message_preview text,
  last_message_at timestamptz,
  unread_count integer not null default 0 check (unread_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  meta_message_id text not null unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null default 'text',
  body text not null default '',
  status text not null default 'received',
  error_code text,
  raw_payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_conversations_recent_idx
  on public.whatsapp_conversations(last_message_at desc nulls last);
create index if not exists whatsapp_messages_conversation_sent_idx
  on public.whatsapp_messages(conversation_id, sent_at asc);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

revoke all on public.whatsapp_conversations from anon, authenticated;
revoke all on public.whatsapp_messages from anon, authenticated;

create or replace function public.increment_whatsapp_unread(target_conversation_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.whatsapp_conversations
  set unread_count = unread_count + 1, updated_at = now()
  where id = target_conversation_id;
$$;

revoke all on function public.increment_whatsapp_unread(uuid) from public, anon, authenticated;
grant execute on function public.increment_whatsapp_unread(uuid) to service_role;

-- The service role bypasses RLS. No public policies are intentionally created.
