-- Migration: fix_profiles_role_privilege_escalation
-- Purpose: Prevent authenticated users from self-promoting their own role via UPDATE on profiles.
-- The UPDATE RLS policy on profiles had `with_check: null`, which allowed any authenticated user to
-- SET role = 'admin' on their own row. Column-level REVOKE is overridden by table-level GRANT in
-- Postgres, so a BEFORE UPDATE trigger is the reliable mechanism.
--
-- This migration:
--   1. Creates (or replaces) a SECURITY DEFINER trigger function that blocks role changes
--      for any session not running as service_role or a superuser.
--   2. Attaches the trigger to public.profiles.

-- Step 1: Create the guard function.
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- Allow changes only from service_role, postgres, or supabase_admin.
    -- auth.role() returns the JWT role of the current session (e.g. 'authenticated',
    -- 'service_role', 'anon'). Inside SECURITY DEFINER, current_user returns the
    -- function owner (postgres), so we must use auth.role() for session context.
    if auth.role() not in ('service_role', 'postgres', 'supabase_admin') then
      raise exception 'Permission denied: role updates require service_role or admin privileges'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Step 2: Attach (or replace) the trigger.
drop trigger if exists prevent_self_role_escalation on public.profiles;

create trigger prevent_self_role_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_self_role_escalation();
