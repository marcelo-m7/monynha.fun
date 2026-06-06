-- Repair frontend-facing PostgREST contracts for playlist collaborators and notifications.

alter table public.playlist_collaborators
  drop constraint if exists playlist_collaborators_user_id_fkey;

alter table public.playlist_collaborators
  add constraint playlist_collaborators_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;

revoke all on function public.list_notifications_secure(integer) from public, anon;
revoke all on function public.mark_notification_as_read_secure(uuid) from public, anon;
revoke all on function public.mark_all_notifications_as_read_secure() from public, anon;
revoke all on function public.get_unread_notifications_count_secure() from public, anon;

grant execute on function public.list_notifications_secure(integer) to authenticated, service_role;
grant execute on function public.mark_notification_as_read_secure(uuid) to authenticated, service_role;
grant execute on function public.mark_all_notifications_as_read_secure() to authenticated, service_role;
grant execute on function public.get_unread_notifications_count_secure() to authenticated, service_role;

notify pgrst, 'reload schema';
