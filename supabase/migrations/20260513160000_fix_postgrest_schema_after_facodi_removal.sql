-- Keep PostgREST stable after facodi schema deprecation.
-- We keep API exposure on public and create an empty facodi schema as a compatibility shim
-- because the hosted API config may still reference it during rollout.

alter role authenticator set pgrst.db_schemas = 'public';

create schema if not exists facodi;
grant usage on schema facodi to anon, authenticated, service_role, authenticator;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
