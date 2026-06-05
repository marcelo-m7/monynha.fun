-- Audit and repair Tube O2 video taxonomy in small, reversible batches.
-- Scope: videos, categories, playlist metadata, playlist/video relations, and latest enrichment tags.
-- This migration intentionally avoids destructive deletes and records every data mutation in an audit table.

create table if not exists public.video_taxonomy_correction_audit (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null,
  entity_type text not null,
  entity_id uuid not null,
  operation text not null,
  old_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  reason text not null,
  confidence numeric(4, 3),
  created_at timestamptz not null default now(),
  applied_by text not null default 'taxonomy_repair_migration_20260605184500'
);

comment on table public.video_taxonomy_correction_audit is
  'Append-only audit trail for Tube O2 taxonomy corrections. Stores old/new values and the editorial reason for every migration-driven change.';

alter table public.video_taxonomy_correction_audit enable row level security;

create index if not exists video_taxonomy_correction_audit_batch_idx
  on public.video_taxonomy_correction_audit(batch_id, created_at desc);

create index if not exists video_taxonomy_correction_audit_entity_idx
  on public.video_taxonomy_correction_audit(entity_type, entity_id, created_at desc);

create index if not exists video_taxonomy_correction_audit_operation_idx
  on public.video_taxonomy_correction_audit(operation, created_at desc);

alter table public.playlists
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists review_status text not null default 'needs_review',
  add column if not exists classification_confidence numeric(4, 3);

comment on column public.playlists.tags is
  'Editorial/search tags for study playlists and collections. Kept separate from video semantic tags.';
comment on column public.playlists.metadata is
  'Editorial metadata for playlist scope, classification source, and future curation workflow state.';
comment on column public.playlists.review_status is
  'Editorial taxonomy review status: needs_review, auto_reviewed, reviewed, or rejected.';
comment on column public.playlists.classification_confidence is
  '0-1 confidence for the current playlist taxonomy metadata.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'playlists_review_status_check'
      and conrelid = 'public.playlists'::regclass
  ) then
    alter table public.playlists
      add constraint playlists_review_status_check
      check (review_status in ('needs_review', 'auto_reviewed', 'reviewed', 'rejected'));
  end if;
end;
$$;

insert into public.categories (name, slug, icon, color)
values
  ('Matemática', 'matematica', 'calculator', '#3B82F6'),
  ('Design', 'design', 'palette', '#A855F7')
on conflict (slug) do update
set
  name = excluded.name,
  icon = excluded.icon,
  color = excluded.color;

with taxonomy_playlists as (
  select
    p.id,
    p.tags as old_tags,
    p.metadata as old_metadata,
    p.review_status as old_review_status,
    p.classification_confidence as old_classification_confidence,
    case
      when p.slug = 'lesti-19411002' then array['matematica', 'calculo', 'integral', 'limites', 'lesti']::text[]
      when p.slug = 'lesti-19411008' then array['matematica', 'calculo-vetorial', 'series', 'derivadas', 'lesti']::text[]
      when p.slug = 'lesti-19411012' then array['base-de-dados', 'sql', 'modelagem', 'normalizacao', 'lesti']::text[]
      when p.slug = 'lesti-19411020' then array['analise-de-dados', 'visualizacao', 'power-bi', 'sql', 'lesti']::text[]
      when p.slug = 'ldc-14541153' then array['tipografia', 'design-grafico', 'comunicacao-visual', 'ldc']::text[]
      when p.slug = 'odoo-recursos-humano' then array['odoo', 'recursos-humanos', 'erp', 'gestao', 'tutorial']::text[]
      when p.slug = 'odoo-onboarding' then array['odoo', 'onboarding', 'erp', 'tutorial', 'software-empresarial']::text[]
      when p.slug = 'odoo-pra-jacu' then array['odoo', 'erp', 'tutorial', 'low-code', 'negocios']::text[]
      when p.slug = 'programa-o' then array['programacao', 'desenvolvimento', 'software', 'tutorial']::text[]
      when p.slug = 'tech-videos' then array['tecnologia', 'software', 'ia', 'seguranca', 'cultura-tech']::text[]
      else p.tags
    end as new_tags,
    jsonb_strip_nulls(
      coalesce(p.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'taxonomy_batch', '20260605184500',
        'taxonomy_scope', case
          when p.course_code is not null and p.unit_code is not null then 'curricular_unit'
          when p.slug like 'odoo-%' then 'odoo_collection'
          else 'editorial_collection'
        end,
        'classification_source', 'manual_migration_rules',
        'classification_reviewed_at', now()
      )
    ) as new_metadata,
    'auto_reviewed'::text as new_review_status,
    0.880::numeric(4, 3) as new_classification_confidence
  from public.playlists p
  where p.slug in (
    'lesti-19411002',
    'lesti-19411008',
    'lesti-19411012',
    'lesti-19411020',
    'ldc-14541153',
    'odoo-recursos-humano',
    'odoo-onboarding',
    'odoo-pra-jacu',
    'programa-o',
    'tech-videos'
  )
), playlist_changes as (
  select *
  from taxonomy_playlists
  where old_tags is distinct from new_tags
     or old_metadata is distinct from new_metadata
     or old_review_status is distinct from new_review_status
     or old_classification_confidence is distinct from new_classification_confidence
), audit_playlist_changes as (
  insert into public.video_taxonomy_correction_audit (
    batch_id,
    entity_type,
    entity_id,
    operation,
    old_values,
    new_values,
    reason,
    confidence
  )
  select
    '20260605184500-playlist-metadata',
    'playlist',
    id,
    'update_playlist_taxonomy_metadata',
    jsonb_build_object(
      'tags', old_tags,
      'metadata', old_metadata,
      'review_status', old_review_status,
      'classification_confidence', old_classification_confidence
    ),
    jsonb_build_object(
      'tags', new_tags,
      'metadata', new_metadata,
      'review_status', new_review_status,
      'classification_confidence', new_classification_confidence
    ),
    'Populate editorial tags and metadata for high-confidence study playlists and technical collections.',
    new_classification_confidence
  from playlist_changes
  returning entity_id
)
update public.playlists p
set
  tags = pc.new_tags,
  metadata = pc.new_metadata,
  review_status = pc.new_review_status,
  classification_confidence = pc.new_classification_confidence,
  updated_at = now()
from playlist_changes pc
where p.id = pc.id;

with latest_enrichment as (
  select distinct on (ae.video_id)
    ae.id,
    ae.video_id,
    ae.semantic_tags
  from public.ai_enrichments ae
  order by ae.video_id, ae.created_at desc nulls last, ae.id desc
), evidence as (
  select
    v.id as video_id,
    v.category_id as old_category_id,
    c.slug as old_category_slug,
    v.title,
    v.channel_name,
    coalesce(v.description, '') as description,
    coalesce(le.semantic_tags, '{}'::text[]) as semantic_tags,
    array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ') as tag_text,
    concat_ws(' ', v.title, v.channel_name, coalesce(v.description, ''), array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) as search_text
  from public.videos v
  left join public.categories c on c.id = v.category_id
  left join latest_enrichment le on le.video_id = v.id
), category_candidates as (
  select
    e.video_id,
    e.old_category_id,
    e.old_category_slug,
    target.slug as new_category_slug,
    target.id as new_category_id,
    case
      when target.slug = 'matematica' then 'Mathematics/calculus evidence from title, channel, or tags.'
      when target.slug = 'design' then 'Design/typography evidence from title, channel, or tags.'
      when target.slug = 'tech' then 'Technology/software/Odoo evidence from title, channel, or tags.'
      else 'High-confidence taxonomy category repair.'
    end as reason,
    case
      when target.slug in ('matematica', 'design') then 0.910::numeric(4, 3)
      else 0.890::numeric(4, 3)
    end as confidence
  from evidence e
  join public.categories target on target.slug = case
    when e.search_text ~* '(matem[aá]tica|c[áa]lculo|integral|derivada|vetorial|coordenadas polares|parametriza[cç][aã]o|stokes|superf[ií]cie de revolu[cç][aã]o|professor aquino|murakami|matemateca)' then 'matematica'
    when e.search_text ~* '(tipografia|design gr[áa]fico|comunica[cç][aã]o visual|indesign|after effects|motion design|composi[cç][aã]o visual|chief of design|start escola de arte)' then 'design'
    when e.search_text ~* '(odoo|erp|sql|database|banco de dados|python|typescript|javascript|fastapi|react|node|ruby on rails|programa[cç][aã]o|cloud security|ciberseguran[cç]a|linux|supabase|github actions|edge functions)' then 'tech'
    else null
  end
  where e.old_category_id is distinct from target.id
    and coalesce(e.old_category_slug, 'nao-classificados') in ('educacao', 'nao-classificados', 'tutoriais-antigos')
), audit_category_changes as (
  insert into public.video_taxonomy_correction_audit (
    batch_id,
    entity_type,
    entity_id,
    operation,
    old_values,
    new_values,
    reason,
    confidence
  )
  select
    '20260605184500-video-categories',
    'video',
    video_id,
    'update_video_category',
    jsonb_build_object('category_id', old_category_id, 'category_slug', old_category_slug),
    jsonb_build_object('category_id', new_category_id, 'category_slug', new_category_slug),
    reason,
    confidence
  from category_candidates
  returning entity_id
)
update public.videos v
set
  category_id = cc.new_category_id,
  updated_at = now()
from category_candidates cc
where v.id = cc.video_id;

with latest_enrichment as (
  select distinct on (ae.video_id)
    ae.id,
    ae.video_id,
    ae.semantic_tags
  from public.ai_enrichments ae
  order by ae.video_id, ae.created_at desc nulls last, ae.id desc
), tag_candidates as (
  select
    le.id as enrichment_id,
    le.video_id,
    coalesce(le.semantic_tags, '{}'::text[]) as old_tags,
    array(
      select distinct tag
      from unnest(
        array_remove(
          array_cat(
            coalesce(le.semantic_tags, '{}'::text[]),
            case
              when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(matem[aá]tica|c[áa]lculo|integral|derivada|vetorial|coordenadas polares|parametriza[cç][aã]o|stokes|superf[ií]cie de revolu[cç][aã]o|professor aquino|murakami|matemateca)' then array['matemática', 'cálculo', 'educação', 'exercícios']::text[]
              when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(tipografia|design gr[áa]fico|comunica[cç][aã]o visual|indesign|after effects|motion design|chief of design)' then array['design', 'tipografia', 'comunicação visual', 'educação']::text[]
              when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(odoo|erp)' then array['Odoo', 'ERP', 'tutorial', 'software empresarial']::text[]
              when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(sql|database|banco de dados|normaliza[cç][aã]o)' then array['SQL', 'banco de dados', 'educação', 'tecnologia']::text[]
              when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(python|typescript|javascript|fastapi|react|node|ruby on rails|programa[cç][aã]o)' then array['programação', 'desenvolvimento de software', 'tutorial', 'tecnologia']::text[]
              else '{}'::text[]
            end
          ),
          null
        )
      ) as tag
      where nullif(btrim(tag), '') is not null
        and lower(btrim(tag)) not in ('monynha', 'fun', 'ia', 'curadoria', 'youtube', 'und')
      order by tag
    ) as new_tags
  from latest_enrichment le
  join public.videos v on v.id = le.video_id
  where coalesce(array_length(le.semantic_tags, 1), 0) = 0
     or exists (
       select 1
       from unnest(le.semantic_tags) existing_tag
       where lower(btrim(existing_tag)) in ('monynha', 'fun', 'ia', 'curadoria', 'youtube', 'und')
     )
), tag_changes as (
  select *
  from tag_candidates
  where coalesce(array_length(new_tags, 1), 0) > 0
    and old_tags is distinct from new_tags
), audit_tag_changes as (
  insert into public.video_taxonomy_correction_audit (
    batch_id,
    entity_type,
    entity_id,
    operation,
    old_values,
    new_values,
    reason,
    confidence
  )
  select
    '20260605184500-enrichment-tags',
    'ai_enrichment',
    enrichment_id,
    'repair_latest_semantic_tags',
    jsonb_build_object('video_id', video_id, 'semantic_tags', old_tags),
    jsonb_build_object('video_id', video_id, 'semantic_tags', new_tags),
    'Remove placeholder tags and append high-confidence topic tags derived from title/channel/latest tags.',
    0.830::numeric(4, 3)
  from tag_changes
  returning entity_id
)
update public.ai_enrichments ae
set semantic_tags = tc.new_tags
from tag_changes tc
where ae.id = tc.enrichment_id;

with latest_enrichment as (
  select distinct on (ae.video_id)
    ae.video_id,
    ae.semantic_tags
  from public.ai_enrichments ae
  order by ae.video_id, ae.created_at desc nulls last, ae.id desc
), playlist_targets as (
  select slug, id
  from public.playlists
  where slug in (
    'odoo-recursos-humano',
    'odoo-onboarding',
    'odoo-pra-jacu',
    'programa-o',
    'tech-videos',
    'lesti-19411002',
    'lesti-19411008',
    'lesti-19411012',
    'lesti-19411020',
    'ldc-14541153'
  )
), playlist_candidates as (
  select
    v.id as video_id,
    pt.id as playlist_id,
    pt.slug as playlist_slug,
    case
      when pt.slug = 'odoo-recursos-humano' then 'Odoo HR-related video matched by channel/title.'
      when pt.slug = 'odoo-onboarding' then 'Odoo tutorial video matched by channel/title.'
      when pt.slug = 'lesti-19411002' then 'Mathematics/calculus topic for Analise Matematica I.'
      when pt.slug = 'lesti-19411008' then 'Vector calculus/advanced calculus topic for Analise Matematica II.'
      when pt.slug = 'lesti-19411012' then 'SQL/database topic for Base de Dados I.'
      when pt.slug = 'lesti-19411020' then 'Data analysis/visualization topic for Analise de Dados.'
      when pt.slug = 'ldc-14541153' then 'Typography/design topic for Tipografia I.'
      when pt.slug = 'programa-o' then 'Programming tutorial topic for general Programação playlist.'
      when pt.slug = 'tech-videos' then 'Technology video matched but no narrower study playlist selected.'
      else 'High-confidence playlist assignment.'
    end as reason,
    case
      when pt.slug in ('odoo-recursos-humano', 'lesti-19411002', 'lesti-19411008', 'lesti-19411012', 'ldc-14541153') then 0.900::numeric(4, 3)
      else 0.820::numeric(4, 3)
    end as confidence
  from public.videos v
  left join latest_enrichment le on le.video_id = v.id
  join playlist_targets pt on pt.slug = case
    when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(odoo|human resources|employees|attendances|time off|approvals|fleet|learning|recruitment|skills|certifications|contracts)' then 'odoo-recursos-humano'
    when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(odoo)' then 'odoo-onboarding'
    when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(c[áa]lculo vetorial|stokes|parametriza[cç][aã]o|coordenadas polares|elipse|derivada direcional)' then 'lesti-19411008'
    when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(integral|[áa]rea|superf[ií]cie de revolu[cç][aã]o|limite|c[áa]lculo|professor aquino|murakami|matemateca)' then 'lesti-19411002'
    when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(sql|database|banco de dados|normaliza[cç][aã]o|views|sql server)' then 'lesti-19411012'
    when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(power bi|excel|visualiza[cç][aã]o|an[áa]lise de dados)' then 'lesti-19411020'
    when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(tipografia|fonte|serifa|kerning|tracking|legibilidade|chief of design)' then 'ldc-14541153'
    when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(python|typescript|javascript|fastapi|react|node|ruby on rails|programa[cç][aã]o)' then 'programa-o'
    when concat_ws(' ', v.title, v.channel_name, array_to_string(coalesce(le.semantic_tags, '{}'::text[]), ' ')) ~* '(cloud security|ciberseguran[cç]a|linux|supabase|github actions|edge functions|tecnologia)' then 'tech-videos'
    else null
  end
  where not exists (
    select 1
    from public.playlist_videos existing
    where existing.video_id = v.id
      and existing.playlist_id = pt.id
  )
), positioned_playlist_candidates as (
  select
    pc.*,
    coalesce(existing_positions.max_position, -1) + row_number() over (partition by pc.playlist_id order by v.created_at, pc.video_id) as new_position
  from playlist_candidates pc
  join public.videos v on v.id = pc.video_id
  left join lateral (
    select max(pv.position) as max_position
    from public.playlist_videos pv
    where pv.playlist_id = pc.playlist_id
  ) existing_positions on true
), audit_playlist_assignments as (
  insert into public.video_taxonomy_correction_audit (
    batch_id,
    entity_type,
    entity_id,
    operation,
    old_values,
    new_values,
    reason,
    confidence
  )
  select
    '20260605184500-playlist-video-assignments',
    'video',
    video_id,
    'insert_playlist_video',
    jsonb_build_object('playlist_id', null, 'playlist_slug', null),
    jsonb_build_object('playlist_id', playlist_id, 'playlist_slug', playlist_slug, 'position', new_position),
    reason,
    confidence
  from positioned_playlist_candidates
  returning entity_id
)
insert into public.playlist_videos (playlist_id, video_id, position, notes)
select
  playlist_id,
  video_id,
  new_position,
  'Auto-assigned by taxonomy repair migration 20260605184500: ' || reason
from positioned_playlist_candidates
on conflict (playlist_id, video_id) do nothing;

do $$
declare
  playlist_record record;
begin
  for playlist_record in
    select distinct p.id
    from public.playlists p
    where p.slug in (
      'odoo-recursos-humano',
      'odoo-onboarding',
      'odoo-pra-jacu',
      'programa-o',
      'tech-videos',
      'lesti-19411002',
      'lesti-19411008',
      'lesti-19411012',
      'lesti-19411020',
      'ldc-14541153'
    )
  loop
    perform public.update_playlist_derived_fields(playlist_record.id);
    perform public.update_playlist_thumbnail_from_first_video(playlist_record.id);
  end loop;
end;
$$;

create or replace view public.v_video_taxonomy_review_queue
with (security_invoker = true)
as
with latest_enrichment as (
  select distinct on (ae.video_id)
    ae.video_id,
    ae.semantic_tags,
    ae.suggested_category_id,
    ae.short_summary,
    ae.summary_description,
    ae.language as enrichment_language,
    ae.created_at as enrichment_created_at
  from public.ai_enrichments ae
  order by ae.video_id, ae.created_at desc nulls last, ae.id desc
), video_issues as (
  select
    v.id,
    v.youtube_id,
    v.slug,
    v.title,
    v.channel_name,
    v.language,
    coalesce(le.enrichment_language, v.language) as effective_language,
    v.category_id,
    c.slug as category_slug,
    c.name as category_name,
    coalesce(le.semantic_tags, '{}'::text[]) as semantic_tags,
    sc.slug as suggested_category_slug,
    (
      select count(*)::int
      from public.playlist_videos pv
      where pv.video_id = v.id
    ) as playlist_count,
    array_remove(array[
      case when v.category_id is null then 'missing_category' end,
      case when nullif(btrim(coalesce(v.description, '')), '') is null then 'missing_description' end,
      case when le.video_id is null then 'missing_enrichment' end,
      case when coalesce(array_length(le.semantic_tags, 1), 0) = 0 then 'missing_tags' end,
      case when not exists (select 1 from public.playlist_videos pv where pv.video_id = v.id) then 'missing_playlist' end,
      case when c.slug in ('educacao', 'nao-classificados') then 'generic_category' end,
      case when exists (
        select 1
        from unnest(coalesce(le.semantic_tags, '{}'::text[])) tag
        where lower(btrim(tag)) in ('monynha', 'fun', 'ia', 'curadoria', 'youtube', 'und')
      ) then 'placeholder_tags' end,
      case when le.suggested_category_id is not null and v.category_id is distinct from le.suggested_category_id then 'ai_category_disagrees' end
    ], null) as issue_flags,
    greatest(v.updated_at, coalesce(le.enrichment_created_at, v.created_at)) as last_taxonomy_activity_at
  from public.videos v
  left join public.categories c on c.id = v.category_id
  left join latest_enrichment le on le.video_id = v.id
  left join public.categories sc on sc.id = le.suggested_category_id
)
select *
from video_issues
where array_length(issue_flags, 1) is not null;

comment on view public.v_video_taxonomy_review_queue is
  'Editorial review queue for videos with weak, generic, missing, or conflicting taxonomy metadata.';

grant select on public.v_video_taxonomy_review_queue to authenticated;

create or replace view public.v_playlist_exhibition
with (security_invoker = true) as
select
  pl.id,
  pl.name,
  pl.slug,
  pl.description,
  pl.author_id,
  pl.thumbnail_url,
  pl.course_code,
  pl.unit_code,
  pl.language,
  pl.is_public,
  pl.is_ordered,
  pl.created_at,
  pl.updated_at,
  pl.video_count,
  pl.total_duration_seconds,
  author.username as author_username,
  author.display_name as author_display_name,
  author.avatar_url as author_avatar_url,
  coalesce(collab.collaborator_count, 0) as collaborator_count,
  preview.video_id as preview_video_id,
  preview.video_title as preview_video_title,
  preview.video_thumbnail_url as preview_video_thumbnail_url,
  preview.video_channel_name as preview_video_channel_name,
  coalesce(activity.last_video_added_at, pl.updated_at, pl.created_at) as activity_at,
  pl.tags,
  pl.metadata,
  pl.review_status,
  pl.classification_confidence
from public.playlists pl
left join public.profiles author on author.id = pl.author_id
left join lateral (
  select count(*)::int as collaborator_count
  from public.playlist_collaborators pc
  where pc.playlist_id = pl.id
) collab on true
left join lateral (
  select
    v.id as video_id,
    v.title as video_title,
    v.thumbnail_url as video_thumbnail_url,
    v.channel_name as video_channel_name
  from public.playlist_videos pv
  join public.videos v on v.id = pv.video_id
  where pv.playlist_id = pl.id
  order by pv.position asc, pv.created_at asc
  limit 1
) preview on true
left join lateral (
  select max(pv.created_at) as last_video_added_at
  from public.playlist_videos pv
  where pv.playlist_id = pl.id
) activity on true;

grant select on public.v_playlist_exhibition to anon, authenticated;