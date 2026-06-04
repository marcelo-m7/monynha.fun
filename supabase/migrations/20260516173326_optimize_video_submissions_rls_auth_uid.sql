drop policy if exists video_submissions_owner_select on public.video_submissions;
create policy video_submissions_owner_select
  on public.video_submissions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists video_submissions_owner_insert on public.video_submissions;
create policy video_submissions_owner_insert
  on public.video_submissions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
