do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'editor_applications'
  ) then
    create table public.editor_applications (
      id uuid primary key default gen_random_uuid(),
      full_name text not null,
      email text not null,
      consent_privacy boolean not null,
      motivation text,
      portfolio_url text,
      source_page text not null default 'unknown',
      status text not null default 'pending',
      review_notes text,
      reviewed_by uuid references public.profiles(id) on delete set null,
      reviewed_at timestamp with time zone,
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone not null default now(),
      constraint editor_applications_full_name_len check (char_length(trim(full_name)) between 2 and 120),
      constraint editor_applications_email_len check (char_length(trim(email)) between 6 and 320),
      constraint editor_applications_consent_required check (consent_privacy = true),
      constraint editor_applications_status_check check (status in ('pending', 'under_review', 'approved', 'rejected')),
      constraint editor_applications_portfolio_url_check check (
        portfolio_url is null
        or portfolio_url ~* '^https?://'
      )
    );
  end if;
end $$;

create index if not exists editor_applications_created_at_idx
  on public.editor_applications(created_at desc);

create index if not exists editor_applications_status_idx
  on public.editor_applications(status);

create index if not exists editor_applications_email_lower_idx
  on public.editor_applications(lower(email));

create index if not exists editor_applications_search_idx
  on public.editor_applications using gin (
    to_tsvector('simple', coalesce(full_name, '') || ' ' || coalesce(email, ''))
  );

create or replace function public.set_editor_applications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists editor_applications_set_updated_at on public.editor_applications;
create trigger editor_applications_set_updated_at
before update on public.editor_applications
for each row
execute function public.set_editor_applications_updated_at();

alter table public.editor_applications enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on table public.editor_applications to anon;
grant insert, select, update on table public.editor_applications to authenticated;

-- Public candidates can submit applications (anonymous or authenticated).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'editor_applications'
      and policyname = 'editor_applications_insert_anon'
  ) then
    create policy editor_applications_insert_anon
      on public.editor_applications
      for insert
      to anon
      with check (
        consent_privacy = true
        and status = 'pending'
        and reviewed_by is null
        and reviewed_at is null
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'editor_applications'
      and policyname = 'editor_applications_insert_authenticated'
  ) then
    create policy editor_applications_insert_authenticated
      on public.editor_applications
      for insert
      to authenticated
      with check (
        consent_privacy = true
        and status = 'pending'
        and reviewed_by is null
        and reviewed_at is null
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'editor_applications'
      and policyname = 'editor_applications_select_editor_admin'
  ) then
    create policy editor_applications_select_editor_admin
      on public.editor_applications
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('editor', 'admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'editor_applications'
      and policyname = 'editor_applications_update_editor_admin'
  ) then
    create policy editor_applications_update_editor_admin
      on public.editor_applications
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('editor', 'admin')
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('editor', 'admin')
        )
      );
  end if;
end $$;
