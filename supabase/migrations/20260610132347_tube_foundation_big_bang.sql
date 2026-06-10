begin;

create schema if not exists tube;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'tube' and t.typname = 'video_status'
  ) then
    create type tube.video_status as enum (
      'pending',
      'transcribing',
      'analyzing',
      'processed',
      'failed'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'tube' and t.typname = 'transcript_source'
  ) then
    create type tube.transcript_source as enum (
      'youtube',
      'whisper',
      'assemblyai',
      'manual'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'tube' and t.typname = 'curation_status'
  ) then
    create type tube.curation_status as enum (
      'pending',
      'approved',
      'rejected',
      'edited',
      'published'
    );
  end if;
end
$$;

create or replace function tube.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function tube.is_editor_or_admin()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = any (array['editor', 'admin']);
$$;

create table if not exists tube.channels (
  id uuid primary key default gen_random_uuid(),
  youtube_channel_id text not null unique,
  handle text unique,
  title text not null,
  description text,
  country text,
  language text,
  subscribers bigint,
  thumbnail_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tube.videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references tube.channels(id) on delete cascade,
  youtube_video_id text not null unique,
  title text not null,
  description text,
  duration_seconds integer,
  published_at timestamptz,
  thumbnail_url text,
  language text,
  metadata jsonb not null default '{}'::jsonb,
  status tube.video_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tube_videos_duration_non_negative check (duration_seconds is null or duration_seconds >= 0)
);

create table if not exists tube.transcripts (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references tube.videos(id) on delete cascade,
  language text not null,
  source tube.transcript_source not null,
  content text not null,
  quality_score numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tube_transcripts_quality_score_range check (quality_score is null or (quality_score >= 0 and quality_score <= 1)),
  constraint tube_transcripts_unique_video_source_language unique (video_id, source, language)
);

create table if not exists tube.video_analysis (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null unique references tube.videos(id) on delete cascade,
  summary text,
  topics jsonb not null default '[]'::jsonb,
  concepts jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  prerequisites jsonb not null default '[]'::jsonb,
  learning_outcomes jsonb not null default '[]'::jsonb,
  difficulty text,
  confidence numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tube_video_analysis_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create table if not exists tube.concepts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tube.video_concepts (
  video_id uuid not null references tube.videos(id) on delete cascade,
  concept_id uuid not null references tube.concepts(id) on delete cascade,
  score numeric(5,4),
  created_at timestamptz not null default now(),
  primary key (video_id, concept_id),
  constraint tube_video_concepts_score_range check (score is null or (score >= 0 and score <= 1))
);

create table if not exists tube.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tube.video_skills (
  video_id uuid not null references tube.videos(id) on delete cascade,
  skill_id uuid not null references tube.skills(id) on delete cascade,
  score numeric(5,4),
  created_at timestamptz not null default now(),
  primary key (video_id, skill_id),
  constraint tube_video_skills_score_range check (score is null or (score >= 0 and score <= 1))
);

create table if not exists tube.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tube.video_tags (
  video_id uuid not null references tube.videos(id) on delete cascade,
  tag_id uuid not null references tube.tags(id) on delete cascade,
  score numeric(5,4),
  created_at timestamptz not null default now(),
  primary key (video_id, tag_id),
  constraint tube_video_tags_score_range check (score is null or (score >= 0 and score <= 1))
);

create table if not exists tube.video_clusters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  confidence numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tube_video_clusters_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create table if not exists tube.cluster_videos (
  cluster_id uuid not null references tube.video_clusters(id) on delete cascade,
  video_id uuid not null references tube.videos(id) on delete cascade,
  score numeric(5,4),
  position integer,
  created_at timestamptz not null default now(),
  primary key (cluster_id, video_id),
  constraint tube_cluster_videos_score_range check (score is null or (score >= 0 and score <= 1))
);

create table if not exists tube.modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  objectives jsonb not null default '[]'::jsonb,
  difficulty text,
  estimated_hours numeric(6,2),
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tube_modules_estimated_hours_non_negative check (estimated_hours is null or estimated_hours >= 0)
);

create table if not exists tube.module_videos (
  module_id uuid not null references tube.modules(id) on delete cascade,
  video_id uuid not null references tube.videos(id) on delete cascade,
  position integer,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (module_id, video_id)
);

create table if not exists tube.module_clusters (
  module_id uuid not null references tube.modules(id) on delete cascade,
  cluster_id uuid not null references tube.video_clusters(id) on delete cascade,
  weight numeric(5,4),
  created_at timestamptz not null default now(),
  primary key (module_id, cluster_id),
  constraint tube_module_clusters_weight_range check (weight is null or (weight >= 0 and weight <= 1))
);

create table if not exists tube.course_candidates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  status text not null default 'draft',
  confidence numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tube_course_candidates_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create table if not exists tube.course_modules (
  course_candidate_id uuid not null references tube.course_candidates(id) on delete cascade,
  module_id uuid not null references tube.modules(id) on delete cascade,
  position integer,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (course_candidate_id, module_id)
);

create table if not exists tube.course_matches (
  id uuid primary key default gen_random_uuid(),
  course_candidate_id uuid not null references tube.course_candidates(id) on delete cascade,
  facodi_course_id uuid not null references facodi.courses(id) on delete cascade,
  score numeric(5,4) not null,
  reason text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint tube_course_matches_score_range check (score >= 0 and score <= 1),
  constraint tube_course_matches_unique_candidate_course unique (course_candidate_id, facodi_course_id)
);

create table if not exists tube.unit_matches (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references tube.modules(id) on delete cascade,
  facodi_curricular_unit_id uuid not null references facodi.curricular_units(id) on delete cascade,
  score numeric(5,4) not null,
  reason text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint tube_unit_matches_score_range check (score >= 0 and score <= 1),
  constraint tube_unit_matches_unique_module_unit unique (module_id, facodi_curricular_unit_id)
);

create table if not exists tube.curation_queue (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  status tube.curation_status not null default 'pending',
  proposed_payload jsonb not null default '{}'::jsonb,
  edited_payload jsonb,
  decision_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tube_curation_queue_entity_type check (
    entity_type = any (array[
      'video',
      'cluster',
      'module',
      'course_candidate',
      'course_match',
      'unit_match'
    ])
  )
);

create index if not exists idx_tube_videos_channel_status on tube.videos (channel_id, status, published_at desc);
create index if not exists idx_tube_transcripts_video_source on tube.transcripts (video_id, source);
create index if not exists idx_tube_video_concepts_concept on tube.video_concepts (concept_id);
create index if not exists idx_tube_video_skills_skill on tube.video_skills (skill_id);
create index if not exists idx_tube_video_tags_tag on tube.video_tags (tag_id);
create index if not exists idx_tube_cluster_videos_video on tube.cluster_videos (video_id);
create index if not exists idx_tube_module_videos_video on tube.module_videos (video_id);
create index if not exists idx_tube_module_clusters_cluster on tube.module_clusters (cluster_id);
create index if not exists idx_tube_course_modules_module on tube.course_modules (module_id);
create index if not exists idx_tube_course_matches_facodi_course_score on tube.course_matches (facodi_course_id, score desc);
create index if not exists idx_tube_unit_matches_facodi_unit_score on tube.unit_matches (facodi_curricular_unit_id, score desc);
create index if not exists idx_tube_curation_queue_status_created on tube.curation_queue (status, created_at desc);
create index if not exists idx_tube_curation_queue_entity on tube.curation_queue (entity_type, entity_id);

drop trigger if exists trg_tube_channels_updated_at on tube.channels;
create trigger trg_tube_channels_updated_at
before update on tube.channels
for each row execute function tube.set_updated_at();

drop trigger if exists trg_tube_videos_updated_at on tube.videos;
create trigger trg_tube_videos_updated_at
before update on tube.videos
for each row execute function tube.set_updated_at();

drop trigger if exists trg_tube_transcripts_updated_at on tube.transcripts;
create trigger trg_tube_transcripts_updated_at
before update on tube.transcripts
for each row execute function tube.set_updated_at();

drop trigger if exists trg_tube_video_analysis_updated_at on tube.video_analysis;
create trigger trg_tube_video_analysis_updated_at
before update on tube.video_analysis
for each row execute function tube.set_updated_at();

drop trigger if exists trg_tube_concepts_updated_at on tube.concepts;
create trigger trg_tube_concepts_updated_at
before update on tube.concepts
for each row execute function tube.set_updated_at();

drop trigger if exists trg_tube_skills_updated_at on tube.skills;
create trigger trg_tube_skills_updated_at
before update on tube.skills
for each row execute function tube.set_updated_at();

drop trigger if exists trg_tube_tags_updated_at on tube.tags;
create trigger trg_tube_tags_updated_at
before update on tube.tags
for each row execute function tube.set_updated_at();

drop trigger if exists trg_tube_video_clusters_updated_at on tube.video_clusters;
create trigger trg_tube_video_clusters_updated_at
before update on tube.video_clusters
for each row execute function tube.set_updated_at();

drop trigger if exists trg_tube_modules_updated_at on tube.modules;
create trigger trg_tube_modules_updated_at
before update on tube.modules
for each row execute function tube.set_updated_at();

drop trigger if exists trg_tube_course_candidates_updated_at on tube.course_candidates;
create trigger trg_tube_course_candidates_updated_at
before update on tube.course_candidates
for each row execute function tube.set_updated_at();

drop trigger if exists trg_tube_curation_queue_updated_at on tube.curation_queue;
create trigger trg_tube_curation_queue_updated_at
before update on tube.curation_queue
for each row execute function tube.set_updated_at();

alter table tube.channels enable row level security;
alter table tube.videos enable row level security;
alter table tube.transcripts enable row level security;
alter table tube.video_analysis enable row level security;
alter table tube.concepts enable row level security;
alter table tube.video_concepts enable row level security;
alter table tube.skills enable row level security;
alter table tube.video_skills enable row level security;
alter table tube.tags enable row level security;
alter table tube.video_tags enable row level security;
alter table tube.video_clusters enable row level security;
alter table tube.cluster_videos enable row level security;
alter table tube.modules enable row level security;
alter table tube.module_videos enable row level security;
alter table tube.module_clusters enable row level security;
alter table tube.course_candidates enable row level security;
alter table tube.course_modules enable row level security;
alter table tube.course_matches enable row level security;
alter table tube.unit_matches enable row level security;
alter table tube.curation_queue enable row level security;

do $$
declare
  tbl text;
  tables text[] := array[
    'channels',
    'videos',
    'transcripts',
    'video_analysis',
    'concepts',
    'video_concepts',
    'skills',
    'video_skills',
    'tags',
    'video_tags',
    'video_clusters',
    'cluster_videos',
    'modules',
    'module_videos',
    'module_clusters',
    'course_candidates',
    'course_modules',
    'course_matches',
    'unit_matches',
    'curation_queue'
  ];
begin
  foreach tbl in array tables
  loop
    execute format('drop policy if exists tube_editor_manage_%I on tube.%I', tbl, tbl);
    execute format(
      'create policy tube_editor_manage_%I on tube.%I for all to authenticated using ((select tube.is_editor_or_admin())) with check ((select tube.is_editor_or_admin()))',
      tbl,
      tbl
    );
  end loop;
end
$$;

commit;