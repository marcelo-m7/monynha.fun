-- Stabilize the direct-message contract used by the Tube O2 frontend.
-- This migration is intentionally idempotent because the original social
-- migrations exist remotely but are missing from this local checkout.

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.direct_messages
  add column if not exists read_at timestamptz;

alter table public.direct_messages
  alter column id set default gen_random_uuid(),
  alter column is_read set default false,
  alter column created_at set default now();

update public.direct_messages
set read_at = created_at
where is_read is true
  and read_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'direct_messages_no_self_message'
      and conrelid = 'public.direct_messages'::regclass
  ) then
    alter table public.direct_messages
      add constraint direct_messages_no_self_message
      check (sender_id <> receiver_id)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'direct_messages_content_length_check'
      and conrelid = 'public.direct_messages'::regclass
  ) then
    alter table public.direct_messages
      add constraint direct_messages_content_length_check
      check (length(btrim(content)) between 1 and 1000)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'direct_messages_read_at_check'
      and conrelid = 'public.direct_messages'::regclass
  ) then
    alter table public.direct_messages
      add constraint direct_messages_read_at_check
      check ((is_read is false and read_at is null) or is_read is true)
      not valid;
  end if;
end;
$$;

create index if not exists direct_messages_sender_created_at_idx
  on public.direct_messages(sender_id, created_at desc);

create index if not exists direct_messages_receiver_created_at_idx
  on public.direct_messages(receiver_id, created_at desc);

create index if not exists direct_messages_receiver_unread_idx
  on public.direct_messages(receiver_id, created_at desc)
  where is_read is false;

create index if not exists direct_messages_conversation_created_at_idx
  on public.direct_messages(
    least(sender_id, receiver_id),
    greatest(sender_id, receiver_id),
    created_at desc
  );

alter table public.direct_messages enable row level security;
alter table public.direct_messages replica identity full;

revoke all on table public.direct_messages from public, anon, authenticated;
grant select on table public.direct_messages to authenticated;
grant select, insert, update, delete on table public.direct_messages to service_role;

drop policy if exists direct_messages_select_own_threads on public.direct_messages;
create policy direct_messages_select_own_threads
on public.direct_messages
for select
to authenticated
using (
  sender_id = (select auth.uid())
  or receiver_id = (select auth.uid())
);

drop policy if exists direct_messages_service_role_all on public.direct_messages;
create policy direct_messages_service_role_all
on public.direct_messages
for all
to service_role
using (true)
with check (true);

drop function if exists public.get_unread_messages_count_secure();
drop function if exists public.get_unread_notifications_count_secure();
drop function if exists public.list_inbox_conversations_secure();
drop function if exists public.get_conversation_by_username_secure(text);
drop function if exists public.mark_conversation_as_read_by_username_secure(text);
drop function if exists public.send_direct_message_by_username_secure(text, text);

create or replace function public.get_unread_messages_count_secure()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when auth.uid() is null then 0
    else (
      select count(*)::integer
      from public.direct_messages dm
      where dm.receiver_id = auth.uid()
        and dm.is_read is false
    )
  end;
$$;

create or replace function public.get_unread_notifications_count_secure()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when auth.uid() is null then 0
    else (
      select count(*)::integer
      from public.notifications n
      where n.user_id = auth.uid()
        and n.is_read is false
    )
  end;
$$;

create or replace function public.list_inbox_conversations_secure()
returns table (
  partner_username text,
  partner_display_name text,
  partner_avatar_url text,
  last_message_id uuid,
  last_message_content text,
  last_message_created_at timestamptz,
  last_message_is_read boolean,
  last_message_sender_username text,
  unread_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with current_user_profile as (
    select auth.uid() as id
  ), scoped_messages as (
    select
      dm.*,
      case
        when dm.sender_id = current_user_profile.id then dm.receiver_id
        else dm.sender_id
      end as partner_id
    from public.direct_messages dm
    cross join current_user_profile
    where current_user_profile.id is not null
      and (
        dm.sender_id = current_user_profile.id
        or dm.receiver_id = current_user_profile.id
      )
  ), latest_messages as (
    select distinct on (partner_id)
      partner_id,
      id,
      content,
      created_at,
      is_read,
      sender_id
    from scoped_messages
    order by partner_id, created_at desc, id desc
  ), unread_by_partner as (
    select
      sender_id as partner_id,
      count(*)::integer as unread_count
    from scoped_messages
    cross join current_user_profile
    where receiver_id = current_user_profile.id
      and is_read is false
    group by sender_id
  )
  select
    partner.username as partner_username,
    partner.display_name as partner_display_name,
    partner.avatar_url as partner_avatar_url,
    latest.id as last_message_id,
    latest.content as last_message_content,
    latest.created_at as last_message_created_at,
    latest.is_read as last_message_is_read,
    last_sender.username as last_message_sender_username,
    coalesce(unread.unread_count, 0) as unread_count
  from latest_messages latest
  join public.profiles partner on partner.id = latest.partner_id
  left join public.profiles last_sender on last_sender.id = latest.sender_id
  left join unread_by_partner unread on unread.partner_id = latest.partner_id
  order by latest.created_at desc, latest.id desc;
$$;

create or replace function public.get_conversation_by_username_secure(
  p_other_username text
)
returns table (
  id uuid,
  content text,
  created_at timestamptz,
  is_mine boolean,
  is_read boolean,
  receiver_avatar_url text,
  receiver_display_name text,
  receiver_username text,
  sender_avatar_url text,
  sender_display_name text,
  sender_username text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with current_user_profile as (
    select auth.uid() as id
  ), partner as (
    select p.id
    from public.profiles p
    where lower(p.username) = lower(nullif(btrim(p_other_username), ''))
    limit 1
  ), recent_messages as (
    select dm.*
    from public.direct_messages dm
    cross join current_user_profile
    cross join partner
    where current_user_profile.id is not null
      and (
        (dm.sender_id = current_user_profile.id and dm.receiver_id = partner.id)
        or (dm.sender_id = partner.id and dm.receiver_id = current_user_profile.id)
      )
    order by dm.created_at desc, dm.id desc
    limit 200
  )
  select
    dm.id,
    dm.content,
    dm.created_at,
    dm.sender_id = current_user_profile.id as is_mine,
    dm.is_read,
    receiver.avatar_url as receiver_avatar_url,
    receiver.display_name as receiver_display_name,
    receiver.username as receiver_username,
    sender.avatar_url as sender_avatar_url,
    sender.display_name as sender_display_name,
    sender.username as sender_username
  from recent_messages dm
  cross join current_user_profile
  join public.profiles sender on sender.id = dm.sender_id
  join public.profiles receiver on receiver.id = dm.receiver_id
  order by dm.created_at asc, dm.id asc;
$$;

create or replace function public.mark_conversation_as_read_by_username_secure(
  p_other_username text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_other_user_id uuid;
  v_marked_count integer := 0;
begin
  if v_current_user_id is null then
    return 0;
  end if;

  select p.id
  into v_other_user_id
  from public.profiles p
  where lower(p.username) = lower(nullif(btrim(p_other_username), ''))
  limit 1;

  if v_other_user_id is null then
    return 0;
  end if;

  with updated_messages as (
    update public.direct_messages dm
    set
      is_read = true,
      read_at = coalesce(dm.read_at, now())
    where dm.receiver_id = v_current_user_id
      and dm.sender_id = v_other_user_id
      and dm.is_read is false
    returning 1
  )
  select count(*)::integer
  into v_marked_count
  from updated_messages;

  return coalesce(v_marked_count, 0);
end;
$$;

create or replace function public.send_direct_message_by_username_secure(
  p_receiver_username text,
  p_content text
)
returns table (
  id uuid,
  content text,
  created_at timestamptz,
  is_mine boolean,
  is_read boolean,
  receiver_username text,
  sender_username text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sender_id uuid := auth.uid();
  v_sender_username text;
  v_receiver_id uuid;
  v_receiver_username text;
  v_content text := btrim(coalesce(p_content, ''));
  v_message_id uuid;
  v_recent_count integer;
  v_hour_count integer;
begin
  if v_sender_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if v_content = '' then
    raise exception 'Message content cannot be empty' using errcode = '22023';
  end if;

  if char_length(v_content) > 1000 then
    raise exception 'Message content is too long' using errcode = '22023';
  end if;

  select p.username
  into v_sender_username
  from public.profiles p
  where p.id = v_sender_id;

  if v_sender_username is null then
    raise exception 'Sender profile not found' using errcode = 'P0002';
  end if;

  select p.id, p.username
  into v_receiver_id, v_receiver_username
  from public.profiles p
  where lower(p.username) = lower(nullif(btrim(p_receiver_username), ''))
  limit 1;

  if v_receiver_id is null then
    raise exception 'Receiver profile not found' using errcode = 'P0002';
  end if;

  if v_receiver_id = v_sender_id then
    raise exception 'You cannot send a message to yourself' using errcode = '22023';
  end if;

  select count(*)::integer
  into v_recent_count
  from public.direct_messages dm
  where dm.sender_id = v_sender_id
    and dm.created_at >= now() - interval '30 seconds';

  if coalesce(v_recent_count, 0) >= 5 then
    raise exception 'Too many messages. Please wait a moment before sending again.' using errcode = '54000';
  end if;

  select count(*)::integer
  into v_hour_count
  from public.direct_messages dm
  where dm.sender_id = v_sender_id
    and dm.created_at >= now() - interval '1 hour';

  if coalesce(v_hour_count, 0) >= 60 then
    raise exception 'Hourly message limit reached. Please try again later.' using errcode = '54000';
  end if;

  insert into public.direct_messages (
    sender_id,
    receiver_id,
    content,
    is_read,
    read_at
  )
  values (
    v_sender_id,
    v_receiver_id,
    v_content,
    false,
    null
  )
  returning public.direct_messages.id into v_message_id;

  if to_regclass('public.notifications') is not null then
    insert into public.notifications (
      user_id,
      actor_id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      is_read
    )
    values (
      v_receiver_id,
      v_sender_id,
      'direct_message',
      'Nova mensagem',
      left(v_content, 240),
      'direct_message',
      v_message_id,
      false
    );
  end if;

  return query
  select
    dm.id,
    dm.content,
    dm.created_at,
    true as is_mine,
    dm.is_read,
    v_receiver_username as receiver_username,
    v_sender_username as sender_username
  from public.direct_messages dm
  where dm.id = v_message_id;
end;
$$;

revoke all on function public.get_unread_messages_count_secure() from public, anon;
revoke all on function public.get_unread_notifications_count_secure() from public, anon;
revoke all on function public.list_inbox_conversations_secure() from public, anon;
revoke all on function public.get_conversation_by_username_secure(text) from public, anon;
revoke all on function public.mark_conversation_as_read_by_username_secure(text) from public, anon;
revoke all on function public.send_direct_message_by_username_secure(text, text) from public, anon;

grant execute on function public.get_unread_messages_count_secure() to authenticated, service_role;
grant execute on function public.get_unread_notifications_count_secure() to authenticated, service_role;
grant execute on function public.list_inbox_conversations_secure() to authenticated, service_role;
grant execute on function public.get_conversation_by_username_secure(text) to authenticated, service_role;
grant execute on function public.mark_conversation_as_read_by_username_secure(text) to authenticated, service_role;
grant execute on function public.send_direct_message_by_username_secure(text, text) to authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'direct_messages'
    )
  then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end;
$$;

comment on table public.direct_messages is
  'Private one-to-one messages between Tube O2 profiles. Client access goes through secure RPCs and participant-scoped realtime reads.';

comment on function public.send_direct_message_by_username_secure(text, text) is
  'Sends a direct message by username with auth, self-send, content, and flood guards.';
