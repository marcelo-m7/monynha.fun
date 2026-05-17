-- Add social playlist primitives for Tube O2 without changing existing data.
-- FACODI remains read-only and can consume public views only.

create table if not exists public.playlist_follows (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (playlist_id, user_id)
);

comment on table public.playlist_follows
is 'Users following playlists to receive updates when new videos are added.';
comment on column public.playlist_follows.notifications_enabled
is 'When false, the user follows the playlist but does not receive playlist update notifications.';

alter table public.playlist_follows enable row level security;

create index if not exists playlist_follows_playlist_id_idx on public.playlist_follows(playlist_id);
create index if not exists playlist_follows_user_id_idx on public.playlist_follows(user_id);
create index if not exists playlist_follows_created_at_idx on public.playlist_follows(created_at desc);

drop policy if exists playlist_follows_select_own_or_public_playlist on public.playlist_follows;
create policy playlist_follows_select_own_or_public_playlist
on public.playlist_follows
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.playlists p
    where p.id = playlist_follows.playlist_id
      and p.is_public = true
  )
);

drop policy if exists playlist_follows_insert_own on public.playlist_follows;
create policy playlist_follows_insert_own
on public.playlist_follows
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.playlists p
    where p.id = playlist_follows.playlist_id
      and p.is_public = true
  )
);

drop policy if exists playlist_follows_update_own on public.playlist_follows;
create policy playlist_follows_update_own
on public.playlist_follows
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists playlist_follows_delete_own on public.playlist_follows;
create policy playlist_follows_delete_own
on public.playlist_follows
for delete
to authenticated
using (user_id = auth.uid());

create table if not exists public.playlist_editor_requests (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  message text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (playlist_id, requester_id)
);

comment on table public.playlist_editor_requests
is 'Requests from authenticated users who want to become editors of an existing playlist.';

alter table public.playlist_editor_requests enable row level security;

create index if not exists playlist_editor_requests_playlist_id_idx on public.playlist_editor_requests(playlist_id);
create index if not exists playlist_editor_requests_requester_id_idx on public.playlist_editor_requests(requester_id);
create index if not exists playlist_editor_requests_status_idx on public.playlist_editor_requests(status);
create index if not exists playlist_editor_requests_created_at_idx on public.playlist_editor_requests(created_at desc);

create or replace function public.is_playlist_owner_or_collaborator(p_playlist_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.playlists p
    where p.id = p_playlist_id
      and p.author_id = p_user_id
  )
  or exists (
    select 1
    from public.playlist_collaborators pc
    where pc.playlist_id = p_playlist_id
      and pc.user_id = p_user_id
  );
$$;

comment on function public.is_playlist_owner_or_collaborator(uuid, uuid)
is 'Checks whether a user can moderate/edit a playlist as owner or collaborator.';

revoke execute on function public.is_playlist_owner_or_collaborator(uuid, uuid) from public;
grant execute on function public.is_playlist_owner_or_collaborator(uuid, uuid) to authenticated, service_role;

drop policy if exists playlist_editor_requests_select_relevant on public.playlist_editor_requests;
create policy playlist_editor_requests_select_relevant
on public.playlist_editor_requests
for select
to authenticated
using (
  requester_id = auth.uid()
  or public.is_playlist_owner_or_collaborator(playlist_id, auth.uid())
);

drop policy if exists playlist_editor_requests_insert_own on public.playlist_editor_requests;
create policy playlist_editor_requests_insert_own
on public.playlist_editor_requests
for insert
to authenticated
with check (
  requester_id = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and exists (
    select 1
    from public.playlists p
    where p.id = playlist_editor_requests.playlist_id
      and p.is_public = true
  )
);

drop policy if exists playlist_editor_requests_cancel_own_pending on public.playlist_editor_requests;
create policy playlist_editor_requests_cancel_own_pending
on public.playlist_editor_requests
for update
to authenticated
using (requester_id = auth.uid() and status = 'pending')
with check (requester_id = auth.uid() and status = 'cancelled');

drop policy if exists playlist_editor_requests_review_by_owner_or_collaborator on public.playlist_editor_requests;
create policy playlist_editor_requests_review_by_owner_or_collaborator
on public.playlist_editor_requests
for update
to authenticated
using (
  status = 'pending'
  and public.is_playlist_owner_or_collaborator(playlist_id, auth.uid())
)
with check (
  status in ('approved', 'rejected')
  and reviewed_by = auth.uid()
  and reviewed_at is not null
);

create or replace function public.touch_playlist_editor_request_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists playlist_editor_requests_touch_updated_at on public.playlist_editor_requests;
create trigger playlist_editor_requests_touch_updated_at
before update on public.playlist_editor_requests
for each row execute function public.touch_playlist_editor_request_updated_at();

create or replace function public.add_collaborator_when_editor_request_approved()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.playlist_collaborators (playlist_id, user_id, role)
    values (new.playlist_id, new.requester_id, 'editor')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists playlist_editor_requests_add_collaborator on public.playlist_editor_requests;
create trigger playlist_editor_requests_add_collaborator
after update on public.playlist_editor_requests
for each row execute function public.add_collaborator_when_editor_request_approved();

create or replace view public.v_playlist_follow_counts
with (security_invoker = true)
as
select
  p.id as playlist_id,
  count(pf.id)::integer as followers_count,
  count(pf.id) filter (where pf.notifications_enabled)::integer as notifying_followers_count
from public.playlists p
left join public.playlist_follows pf on pf.playlist_id = p.id
where p.is_public = true
group by p.id;

comment on view public.v_playlist_follow_counts
is 'Public read model with follower counts for public playlists.';

grant select on public.v_playlist_follow_counts to anon, authenticated;
grant select, insert, update, delete on public.playlist_follows to authenticated;
grant select, insert, update on public.playlist_editor_requests to authenticated;
