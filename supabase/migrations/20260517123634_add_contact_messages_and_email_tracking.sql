-- Foundation pass for transactional email/contact flows.
-- Contact messages are written by Edge Functions with the service role and are
-- intentionally not exposed to client roles through the Data API.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'received',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_messages_email_check check (
    email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint contact_messages_name_check check (
    length(btrim(name)) between 1 and 160
  ),
  constraint contact_messages_subject_check check (
    length(btrim(subject)) between 1 and 200
  ),
  constraint contact_messages_message_check check (
    length(btrim(message)) between 1 and 4000
  ),
  constraint contact_messages_status_check check (
    status in ('received', 'sent', 'failed')
  )
);

comment on table public.contact_messages is
  'Internal Tube O2 contact form messages. Inserted by Edge Functions; not directly exposed to client roles.';
comment on column public.contact_messages.metadata is
  'Provider ids, request ids, user agent, origin, and delivery diagnostics for contact messages.';

create index if not exists contact_messages_created_at_idx
  on public.contact_messages(created_at desc);
create index if not exists contact_messages_status_idx
  on public.contact_messages(status);
create index if not exists contact_messages_email_created_at_idx
  on public.contact_messages(lower(email), created_at desc);

create or replace function public.set_contact_messages_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contact_messages_set_updated_at on public.contact_messages;
create trigger contact_messages_set_updated_at
before update on public.contact_messages
for each row
execute function public.set_contact_messages_updated_at();

alter table public.contact_messages enable row level security;

revoke all on table public.contact_messages from public, anon, authenticated;
grant select, insert, update, delete on table public.contact_messages to service_role;

drop policy if exists contact_messages_service_role_all on public.contact_messages;
create policy contact_messages_service_role_all
  on public.contact_messages
  for all
  to service_role
  using (true)
  with check (true);

alter table public.editor_applications
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists confirmation_error text,
  add column if not exists confirmation_provider_id text;

comment on column public.editor_applications.confirmation_sent_at is
  'Timestamp of the latest successful editor application confirmation email.';
comment on column public.editor_applications.confirmation_error is
  'Latest transactional email error for the editor application confirmation flow.';
comment on column public.editor_applications.confirmation_provider_id is
  'Provider message id returned by the transactional email service.';
