drop schema if exists facodi cascade;

create schema facodi;

grant usage on schema facodi to anon, authenticated, service_role;

create function facodi.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = facodi, pg_temp
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

revoke all on function facodi.set_updated_at() from public;

create table facodi.learning_objects (
	id uuid primary key default gen_random_uuid(),
	object_type text not null,
	title text not null,
	slug text not null,
	description text,
	objectives jsonb not null default '[]'::jsonb,
	keywords text[] not null default '{}'::text[],
	tags text[] not null default '{}'::text[],
	language text not null default 'und',
	status text not null default 'draft',
	published boolean not null default false,
	source_type text not null default 'manual',
	source_url text,
	source_id text,
	metadata jsonb not null default '{}'::jsonb,
	created_by uuid,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint learning_objects_object_type_check check (
		object_type = any (array[
			'video',
			'playlist',
			'collection',
			'module',
			'course',
			'curricular_unit',
			'document',
			'book',
			'chapter',
			'topic',
			'competency',
			'learning_outcome',
			'odoo_course',
			'odoo_slide',
			'external_resource'
		])
	),
	constraint learning_objects_status_check check (
		status = any (array['draft', 'active', 'processing', 'published', 'archived', 'failed'])
	),
	constraint learning_objects_source_type_check check (
		source_type = any (array['manual', 'youtube', 'odoo', 'public', 'tube', 'document', 'import', 'generated', 'external'])
	),
	constraint learning_objects_slug_not_blank check (length(btrim(slug)) > 0),
	constraint learning_objects_title_not_blank check (length(btrim(title)) > 0)
);

create unique index learning_objects_type_slug_key
	on facodi.learning_objects (object_type, slug);

create unique index learning_objects_source_key
	on facodi.learning_objects (source_type, source_id)
	where source_id is not null;

create index learning_objects_type_status_idx
	on facodi.learning_objects (object_type, status, published);

create index learning_objects_language_idx
	on facodi.learning_objects (language);

create index learning_objects_created_by_idx
	on facodi.learning_objects (created_by);

create index learning_objects_metadata_gin_idx
	on facodi.learning_objects using gin (metadata);

create table facodi.learning_object_versions (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	version_number integer not null default 1,
	title text,
	description text,
	objectives jsonb not null default '[]'::jsonb,
	metadata jsonb not null default '{}'::jsonb,
	created_by uuid,
	created_at timestamptz not null default now(),
	constraint learning_object_versions_number_check check (version_number > 0),
	constraint learning_object_versions_unique_version unique (learning_object_id, version_number)
);

create index learning_object_versions_object_id_idx
	on facodi.learning_object_versions (learning_object_id);

create table facodi.learning_object_relations (
	id uuid primary key default gen_random_uuid(),
	parent_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	child_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	relation_type text not null,
	position integer,
	weight numeric(8, 4),
	confidence_score numeric(5, 4),
	created_by_mechanism text,
	metadata jsonb not null default '{}'::jsonb,
	created_by uuid,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint learning_object_relations_not_self check (parent_object_id <> child_object_id),
	constraint learning_object_relations_type_check check (
		relation_type = any (array[
			'contains',
			'belongs_to',
			'prerequisite_of',
			'similar_to',
			'generated_from',
			'recommended_for',
			'correlates_with',
			'explains',
			'extends',
			'summarizes',
			'maps_to_odoo'
		])
	),
	constraint learning_object_relations_confidence_check check (
		confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)
	),
	constraint learning_object_relations_weight_check check (weight is null or weight >= 0),
	constraint learning_object_relations_unique unique (parent_object_id, child_object_id, relation_type)
);

create index learning_object_relations_parent_idx
	on facodi.learning_object_relations (parent_object_id, relation_type, position nulls last);

create index learning_object_relations_child_idx
	on facodi.learning_object_relations (child_object_id, relation_type);

create index learning_object_relations_metadata_gin_idx
	on facodi.learning_object_relations using gin (metadata);

create table facodi.legacy_object_links (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	legacy_schema text not null,
	legacy_table text not null,
	legacy_id text not null,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint legacy_object_links_schema_check check (legacy_schema = any (array['public', 'tube', 'facodi', 'odoo'])),
	constraint legacy_object_links_unique_legacy unique (legacy_schema, legacy_table, legacy_id),
	constraint legacy_object_links_unique_object unique (learning_object_id, legacy_schema, legacy_table)
);

create index legacy_object_links_object_id_idx
	on facodi.legacy_object_links (learning_object_id);

create table facodi.tags (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	label text not null,
	language text not null default 'und',
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint tags_slug_not_blank check (length(btrim(slug)) > 0),
	constraint tags_label_not_blank check (length(btrim(label)) > 0)
);

create table facodi.learning_object_tags (
	learning_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	tag_id uuid not null references facodi.tags (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (learning_object_id, tag_id)
);

create index learning_object_tags_tag_id_idx
	on facodi.learning_object_tags (tag_id);

create table facodi.keywords (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	keyword text not null,
	normalized_keyword text not null,
	language text not null default 'und',
	weight numeric(8, 4) not null default 1,
	source text not null default 'manual',
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	constraint keywords_keyword_not_blank check (length(btrim(keyword)) > 0),
	constraint keywords_weight_check check (weight >= 0),
	constraint keywords_unique_object_keyword unique (learning_object_id, normalized_keyword, language)
);

create index keywords_object_id_idx
	on facodi.keywords (learning_object_id);

create index keywords_normalized_keyword_idx
	on facodi.keywords (normalized_keyword);

create table facodi.competencies (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid references facodi.learning_objects (id) on delete cascade,
	code text,
	title text not null,
	description text,
	level text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint competencies_title_not_blank check (length(btrim(title)) > 0)
);

create index competencies_object_id_idx
	on facodi.competencies (learning_object_id);

create unique index competencies_code_key
	on facodi.competencies (code)
	where code is not null;

create table facodi.learning_outcomes (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	competency_id uuid references facodi.competencies (id) on delete set null,
	statement text not null,
	position integer,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint learning_outcomes_statement_not_blank check (length(btrim(statement)) > 0)
);

create index learning_outcomes_object_id_idx
	on facodi.learning_outcomes (learning_object_id, position nulls last);

create index learning_outcomes_competency_id_idx
	on facodi.learning_outcomes (competency_id);

create table facodi.external_sources (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid references facodi.learning_objects (id) on delete set null,
	source_type text not null,
	external_id text,
	source_url text,
	title text,
	metadata jsonb not null default '{}'::jsonb,
	imported_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint external_sources_type_check check (source_type = any (array['youtube', 'odoo', 'document', 'website', 'manual', 'other']))
);

create unique index external_sources_source_key
	on facodi.external_sources (source_type, external_id)
	where external_id is not null;

create index external_sources_object_id_idx
	on facodi.external_sources (learning_object_id);

create table facodi.youtube_channels (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid references facodi.learning_objects (id) on delete set null,
	youtube_channel_id text not null unique,
	canonical_url text,
	title text,
	description text,
	language text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index youtube_channels_object_id_idx
	on facodi.youtube_channels (learning_object_id);

create table facodi.youtube_videos (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid references facodi.learning_objects (id) on delete set null,
	youtube_video_id text not null,
	canonical_url text not null,
	title text,
	description text,
	channel_id text,
	channel_title text,
	duration_seconds integer,
	published_at timestamptz,
	thumbnails jsonb not null default '{}'::jsonb,
	tags text[] not null default '{}'::text[],
	language text,
	metadata jsonb not null default '{}'::jsonb,
	status text not null default 'pending',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint youtube_videos_youtube_id_not_blank check (length(btrim(youtube_video_id)) > 0),
	constraint youtube_videos_status_check check (status = any (array['pending', 'processing', 'processed', 'published', 'failed', 'archived'])),
	constraint youtube_videos_duration_check check (duration_seconds is null or duration_seconds >= 0),
	constraint youtube_videos_youtube_video_id_key unique (youtube_video_id)
);

create index youtube_videos_object_id_idx
	on facodi.youtube_videos (learning_object_id);

create index youtube_videos_status_idx
	on facodi.youtube_videos (status, created_at desc);

create index youtube_videos_metadata_gin_idx
	on facodi.youtube_videos using gin (metadata);

create table facodi.documents (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid references facodi.learning_objects (id) on delete set null,
	source_url text,
	title text not null,
	mime_type text,
	storage_path text,
	checksum text,
	language text not null default 'und',
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index documents_checksum_key
	on facodi.documents (checksum)
	where checksum is not null;

create index documents_object_id_idx
	on facodi.documents (learning_object_id);

create table facodi.courses (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid unique references facodi.learning_objects (id) on delete set null,
	code text,
	external_source text not null default 'manual',
	external_id text,
	odoo_channel_id integer,
	slug text not null unique,
	title text not null,
	normalized_title text,
	summary text,
	description_html text,
	degree_type text,
	language text default 'pt',
	school text,
	source_url text,
	plan_url text,
	status text not null default 'draft',
	published boolean not null default false,
	metadata jsonb not null default '{}'::jsonb,
	synced_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint courses_status_check check (status = any (array['draft', 'active', 'archived'])),
	constraint courses_title_not_blank check (length(btrim(title)) > 0),
	constraint courses_slug_not_blank check (length(btrim(slug)) > 0)
);

create unique index courses_code_key
	on facodi.courses (code)
	where code is not null;

create unique index courses_external_key
	on facodi.courses (external_source, external_id)
	where external_id is not null;

create index courses_learning_object_id_idx
	on facodi.courses (learning_object_id);

create table facodi.curricular_units (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid unique references facodi.learning_objects (id) on delete set null,
	course_id uuid not null references facodi.courses (id) on delete cascade,
	code text,
	external_source text not null default 'manual',
	external_id text,
	odoo_slide_id integer,
	slug text,
	title text not null,
	normalized_title text,
	summary text,
	description_html text,
	year integer,
	semester integer,
	ects numeric(5, 2),
	position integer,
	language text default 'pt',
	source_url text,
	plan_url text,
	status text not null default 'draft',
	published boolean not null default false,
	metadata jsonb not null default '{}'::jsonb,
	synced_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint curricular_units_status_check check (status = any (array['draft', 'active', 'archived'])),
	constraint curricular_units_title_not_blank check (length(btrim(title)) > 0),
	constraint curricular_units_year_check check (year is null or year > 0),
	constraint curricular_units_semester_check check (semester is null or semester > 0),
	constraint curricular_units_ects_check check (ects is null or ects >= 0)
);

create unique index curricular_units_course_code_key
	on facodi.curricular_units (course_id, code)
	where code is not null;

create unique index curricular_units_external_key
	on facodi.curricular_units (external_source, external_id)
	where external_id is not null;

create index curricular_units_course_id_idx
	on facodi.curricular_units (course_id, year, semester, position);

create index curricular_units_learning_object_id_idx
	on facodi.curricular_units (learning_object_id);

create table facodi.analysis_jobs (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid references facodi.learning_objects (id) on delete set null,
	video_id uuid references facodi.youtube_videos (id) on delete set null,
	youtube_video_id text,
	input_url text,
	job_type text not null default 'classify_youtube_video',
	status text not null default 'queued',
	current_step text not null default 'created',
	requested_by uuid,
	request_source text not null default 'edge_function',
	attempts integer not null default 0,
	error_code text,
	error_message text,
	input_payload jsonb not null default '{}'::jsonb,
	result_payload jsonb not null default '{}'::jsonb,
	started_at timestamptz,
	completed_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint analysis_jobs_attempts_check check (attempts >= 0),
	constraint analysis_jobs_job_type_check check (job_type = any (array[
		'classify_youtube_video',
		'sync_course_catalog',
		'generate_embeddings',
		'import_youtube_video',
		'import_youtube_channel',
		'analyze_video',
		'match_video_to_curriculum',
		'generate_playlist',
		'generate_module',
		'generate_course_structure',
		'sync_object_to_odoo',
		'pull_odoo_records',
		'push_odoo_learning_object'
	])),
	constraint analysis_jobs_status_check check (status = any (array['queued', 'running', 'succeeded', 'failed', 'needs_review', 'cancelled', 'retrying']))
);

create index analysis_jobs_learning_object_id_idx
	on facodi.analysis_jobs (learning_object_id);

create index analysis_jobs_video_id_idx
	on facodi.analysis_jobs (video_id);

create index analysis_jobs_requested_by_idx
	on facodi.analysis_jobs (requested_by, created_at desc);

create index analysis_jobs_status_idx
	on facodi.analysis_jobs (status, job_type, created_at desc);

create table facodi.analysis_job_events (
	id uuid primary key default gen_random_uuid(),
	job_id uuid not null references facodi.analysis_jobs (id) on delete cascade,
	event_type text not null,
	message text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create index analysis_job_events_job_id_idx
	on facodi.analysis_job_events (job_id, created_at);

create table facodi.analysis_results (
	id uuid primary key default gen_random_uuid(),
	job_id uuid references facodi.analysis_jobs (id) on delete set null,
	learning_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	result_type text not null,
	provider text,
	provider_model text,
	summary text,
	payload jsonb not null default '{}'::jsonb,
	confidence_score numeric(5, 4),
	created_at timestamptz not null default now(),
	constraint analysis_results_confidence_check check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1))
);

create index analysis_results_job_id_idx
	on facodi.analysis_results (job_id);

create index analysis_results_object_type_idx
	on facodi.analysis_results (learning_object_id, result_type, created_at desc);

create index analysis_results_payload_gin_idx
	on facodi.analysis_results using gin (payload);

create table facodi.embeddings (
	id uuid primary key default gen_random_uuid(),
	learning_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	provider text not null,
	model text not null,
	dimensions integer,
	embedding jsonb not null,
	content_hash text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	constraint embeddings_dimensions_check check (dimensions is null or dimensions > 0)
);

create unique index embeddings_object_model_hash_key
	on facodi.embeddings (learning_object_id, provider, model, content_hash)
	where content_hash is not null;

create index embeddings_object_id_idx
	on facodi.embeddings (learning_object_id);

create table facodi.semantic_matches (
	id uuid primary key default gen_random_uuid(),
	source_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	target_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	match_type text not null default 'similar_to',
	score numeric(8, 5) not null,
	confidence_score numeric(5, 4),
	algorithm_version text,
	explanation text,
	evidence jsonb not null default '[]'::jsonb,
	metadata jsonb not null default '{}'::jsonb,
	created_by_mechanism text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint semantic_matches_not_self check (source_object_id <> target_object_id),
	constraint semantic_matches_score_check check (score >= 0),
	constraint semantic_matches_confidence_check check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
	constraint semantic_matches_unique unique (source_object_id, target_object_id, match_type, algorithm_version)
);

create index semantic_matches_source_idx
	on facodi.semantic_matches (source_object_id, match_type, score desc);

create index semantic_matches_target_idx
	on facodi.semantic_matches (target_object_id, match_type, score desc);

create index semantic_matches_evidence_gin_idx
	on facodi.semantic_matches using gin (evidence);

create table facodi.recommendations (
	id uuid primary key default gen_random_uuid(),
	subject_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	recommended_object_id uuid not null references facodi.learning_objects (id) on delete cascade,
	recommendation_type text not null,
	score numeric(8, 5) not null,
	reason text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	expires_at timestamptz,
	constraint recommendations_score_check check (score >= 0),
	constraint recommendations_unique unique (subject_object_id, recommended_object_id, recommendation_type)
);

create index recommendations_subject_idx
	on facodi.recommendations (subject_object_id, recommendation_type, score desc);

create index recommendations_recommended_idx
	on facodi.recommendations (recommended_object_id);

create table facodi.generated_structures (
	id uuid primary key default gen_random_uuid(),
	root_object_id uuid references facodi.learning_objects (id) on delete set null,
	structure_type text not null,
	status text not null default 'draft',
	prompt jsonb not null default '{}'::jsonb,
	result jsonb not null default '{}'::jsonb,
	generated_by text,
	created_by uuid,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint generated_structures_type_check check (structure_type = any (array['playlist', 'module', 'course', 'curriculum_mapping'])),
	constraint generated_structures_status_check check (status = any (array['draft', 'accepted', 'rejected', 'superseded']))
);

create index generated_structures_root_idx
	on facodi.generated_structures (root_object_id);

create table facodi.video_classifications (
	id uuid primary key default gen_random_uuid(),
	video_id uuid not null references facodi.youtube_videos (id) on delete cascade,
	course_id uuid references facodi.courses (id) on delete set null,
	curricular_unit_id uuid references facodi.curricular_units (id) on delete set null,
	model_run_id uuid,
	confidence numeric(5, 4) not null default 0,
	confidence_level text,
	status text not null default 'pending',
	needs_review boolean not null default true,
	justification text,
	evidence jsonb not null default '[]'::jsonb,
	metadata jsonb not null default '{}'::jsonb,
	reviewed_by uuid,
	reviewed_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint video_classifications_confidence_check check (confidence >= 0 and confidence <= 1),
	constraint video_classifications_status_check check (status = any (array['pending', 'approved', 'rejected', 'needs_review']))
);

create index video_classifications_video_id_idx
	on facodi.video_classifications (video_id);

create index video_classifications_course_id_idx
	on facodi.video_classifications (course_id);

create index video_classifications_curricular_unit_id_idx
	on facodi.video_classifications (curricular_unit_id);

create table facodi.odoo_instances (
	id uuid primary key default gen_random_uuid(),
	instance_key text not null unique,
	base_url text not null,
	database_name text,
	is_active boolean not null default true,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table facodi.odoo_model_maps (
	id uuid primary key default gen_random_uuid(),
	learning_object_type text not null,
	odoo_model text not null,
	direction text not null default 'push',
	field_map jsonb not null default '{}'::jsonb,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint odoo_model_maps_direction_check check (direction = any (array['push', 'pull', 'bidirectional'])),
	constraint odoo_model_maps_unique unique (learning_object_type, odoo_model, direction)
);

create table facodi.odoo_records (
	id uuid primary key default gen_random_uuid(),
	instance_id uuid not null references facodi.odoo_instances (id) on delete cascade,
	learning_object_id uuid references facodi.learning_objects (id) on delete set null,
	odoo_model text not null,
	odoo_record_id integer not null,
	external_ref text,
	last_sync_direction text,
	last_sync_status text,
	payload jsonb not null default '{}'::jsonb,
	metadata jsonb not null default '{}'::jsonb,
	synced_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint odoo_records_unique_remote unique (instance_id, odoo_model, odoo_record_id),
	constraint odoo_records_direction_check check (last_sync_direction is null or last_sync_direction = any (array['push', 'pull'])),
	constraint odoo_records_status_check check (last_sync_status is null or last_sync_status = any (array['queued', 'running', 'succeeded', 'failed', 'skipped']))
);

create index odoo_records_object_id_idx
	on facodi.odoo_records (learning_object_id);

create table facodi.odoo_sync_jobs (
	id uuid primary key default gen_random_uuid(),
	instance_id uuid references facodi.odoo_instances (id) on delete set null,
	learning_object_id uuid references facodi.learning_objects (id) on delete set null,
	odoo_record_id uuid references facodi.odoo_records (id) on delete set null,
	job_type text not null,
	status text not null default 'queued',
	attempts integer not null default 0,
	max_attempts integer not null default 3,
	error_code text,
	error_message text,
	payload jsonb not null default '{}'::jsonb,
	result jsonb not null default '{}'::jsonb,
	requested_by uuid,
	started_at timestamptz,
	completed_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint odoo_sync_jobs_type_check check (job_type = any (array['sync_object_to_odoo', 'pull_odoo_records', 'push_odoo_learning_object'])),
	constraint odoo_sync_jobs_status_check check (status = any (array['queued', 'running', 'succeeded', 'failed', 'retrying', 'cancelled'])),
	constraint odoo_sync_jobs_attempts_check check (attempts >= 0 and max_attempts > 0)
);

create index odoo_sync_jobs_status_idx
	on facodi.odoo_sync_jobs (status, job_type, created_at desc);

create index odoo_sync_jobs_object_id_idx
	on facodi.odoo_sync_jobs (learning_object_id);

create table facodi.odoo_sync_logs (
	id uuid primary key default gen_random_uuid(),
	job_id uuid references facodi.odoo_sync_jobs (id) on delete cascade,
	level text not null default 'info',
	message text not null,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	constraint odoo_sync_logs_level_check check (level = any (array['debug', 'info', 'warn', 'error']))
);

create index odoo_sync_logs_job_id_idx
	on facodi.odoo_sync_logs (job_id, created_at);

create trigger learning_objects_set_updated_at
	before update on facodi.learning_objects
	for each row execute function facodi.set_updated_at();

create trigger learning_object_relations_set_updated_at
	before update on facodi.learning_object_relations
	for each row execute function facodi.set_updated_at();

create trigger legacy_object_links_set_updated_at
	before update on facodi.legacy_object_links
	for each row execute function facodi.set_updated_at();

create trigger tags_set_updated_at
	before update on facodi.tags
	for each row execute function facodi.set_updated_at();

create trigger competencies_set_updated_at
	before update on facodi.competencies
	for each row execute function facodi.set_updated_at();

create trigger learning_outcomes_set_updated_at
	before update on facodi.learning_outcomes
	for each row execute function facodi.set_updated_at();

create trigger external_sources_set_updated_at
	before update on facodi.external_sources
	for each row execute function facodi.set_updated_at();

create trigger youtube_channels_set_updated_at
	before update on facodi.youtube_channels
	for each row execute function facodi.set_updated_at();

create trigger youtube_videos_set_updated_at
	before update on facodi.youtube_videos
	for each row execute function facodi.set_updated_at();

create trigger documents_set_updated_at
	before update on facodi.documents
	for each row execute function facodi.set_updated_at();

create trigger courses_set_updated_at
	before update on facodi.courses
	for each row execute function facodi.set_updated_at();

create trigger curricular_units_set_updated_at
	before update on facodi.curricular_units
	for each row execute function facodi.set_updated_at();

create trigger analysis_jobs_set_updated_at
	before update on facodi.analysis_jobs
	for each row execute function facodi.set_updated_at();

create trigger semantic_matches_set_updated_at
	before update on facodi.semantic_matches
	for each row execute function facodi.set_updated_at();

create trigger generated_structures_set_updated_at
	before update on facodi.generated_structures
	for each row execute function facodi.set_updated_at();

create trigger video_classifications_set_updated_at
	before update on facodi.video_classifications
	for each row execute function facodi.set_updated_at();

create trigger odoo_instances_set_updated_at
	before update on facodi.odoo_instances
	for each row execute function facodi.set_updated_at();

create trigger odoo_model_maps_set_updated_at
	before update on facodi.odoo_model_maps
	for each row execute function facodi.set_updated_at();

create trigger odoo_records_set_updated_at
	before update on facodi.odoo_records
	for each row execute function facodi.set_updated_at();

create trigger odoo_sync_jobs_set_updated_at
	before update on facodi.odoo_sync_jobs
	for each row execute function facodi.set_updated_at();

alter table facodi.learning_objects enable row level security;
alter table facodi.learning_object_versions enable row level security;
alter table facodi.learning_object_relations enable row level security;
alter table facodi.legacy_object_links enable row level security;
alter table facodi.tags enable row level security;
alter table facodi.learning_object_tags enable row level security;
alter table facodi.keywords enable row level security;
alter table facodi.competencies enable row level security;
alter table facodi.learning_outcomes enable row level security;
alter table facodi.external_sources enable row level security;
alter table facodi.youtube_channels enable row level security;
alter table facodi.youtube_videos enable row level security;
alter table facodi.documents enable row level security;
alter table facodi.courses enable row level security;
alter table facodi.curricular_units enable row level security;
alter table facodi.analysis_jobs enable row level security;
alter table facodi.analysis_job_events enable row level security;
alter table facodi.analysis_results enable row level security;
alter table facodi.embeddings enable row level security;
alter table facodi.semantic_matches enable row level security;
alter table facodi.recommendations enable row level security;
alter table facodi.generated_structures enable row level security;
alter table facodi.video_classifications enable row level security;
alter table facodi.odoo_instances enable row level security;
alter table facodi.odoo_model_maps enable row level security;
alter table facodi.odoo_records enable row level security;
alter table facodi.odoo_sync_jobs enable row level security;
alter table facodi.odoo_sync_logs enable row level security;

create policy public_read_published_learning_objects
	on facodi.learning_objects for select
	to anon, authenticated
	using (published is true and status in ('active', 'published'));

create policy editor_manage_learning_objects
	on facodi.learning_objects for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy public_read_published_courses
	on facodi.courses for select
	to anon, authenticated
	using (published is true and status = 'active');

create policy editor_manage_courses
	on facodi.courses for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy public_read_units_for_published_courses
	on facodi.curricular_units for select
	to anon, authenticated
	using (
		status = 'active'
		and exists (
			select 1
			from facodi.courses c
			where c.id = curricular_units.course_id
				and c.published is true
				and c.status = 'active'
		)
	);

create policy editor_manage_curricular_units
	on facodi.curricular_units for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy public_read_processed_youtube_videos
	on facodi.youtube_videos for select
	to anon, authenticated
	using (status in ('processed', 'published'));

create policy editor_manage_youtube_videos
	on facodi.youtube_videos for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy public_read_tags
	on facodi.tags for select
	to anon, authenticated
	using (true);

create policy editor_manage_tags
	on facodi.tags for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_all_learning_object_support_tables
	on facodi.learning_object_versions for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_learning_object_tags
	on facodi.learning_object_tags for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_keywords
	on facodi.keywords for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_competencies
	on facodi.competencies for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_learning_outcomes
	on facodi.learning_outcomes for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_external_sources
	on facodi.external_sources for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_youtube_channels
	on facodi.youtube_channels for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_documents
	on facodi.documents for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_learning_object_relations
	on facodi.learning_object_relations for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_legacy_object_links
	on facodi.legacy_object_links for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_analysis_jobs
	on facodi.analysis_jobs for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy user_read_own_analysis_jobs
	on facodi.analysis_jobs for select
	to authenticated
	using (requested_by = (select auth.uid()));

create policy editor_manage_analysis_job_events
	on facodi.analysis_job_events for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy user_read_own_analysis_job_events
	on facodi.analysis_job_events for select
	to authenticated
	using (
		exists (
			select 1
			from facodi.analysis_jobs j
			where j.id = analysis_job_events.job_id
				and j.requested_by = (select auth.uid())
		)
	);

create policy editor_manage_private_facodi_tables
	on facodi.analysis_results for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_embeddings
	on facodi.embeddings for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_semantic_matches
	on facodi.semantic_matches for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_recommendations
	on facodi.recommendations for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_generated_structures
	on facodi.generated_structures for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_video_classifications
	on facodi.video_classifications for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_odoo_tables
	on facodi.odoo_instances for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_odoo_model_maps
	on facodi.odoo_model_maps for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_odoo_records
	on facodi.odoo_records for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_odoo_sync_jobs
	on facodi.odoo_sync_jobs for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

create policy editor_manage_odoo_sync_logs
	on facodi.odoo_sync_logs for all
	to authenticated
	using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']))
	with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['editor', 'admin']));

grant select on all tables in schema facodi to anon;
grant select, insert, update, delete on all tables in schema facodi to authenticated;
grant all on all tables in schema facodi to service_role;

do $$
begin
	if to_regclass('tube.course_matches') is not null then
		alter table tube.course_matches drop constraint if exists course_matches_facodi_course_id_fkey;
		alter table tube.course_matches
			add constraint course_matches_facodi_course_id_fkey
			foreign key (facodi_course_id) references facodi.courses (id) on delete cascade not valid;
		create index if not exists course_matches_facodi_course_id_idx
			on tube.course_matches (facodi_course_id);
	end if;

	if to_regclass('tube.unit_matches') is not null then
		alter table tube.unit_matches drop constraint if exists unit_matches_facodi_curricular_unit_id_fkey;
		alter table tube.unit_matches
			add constraint unit_matches_facodi_curricular_unit_id_fkey
			foreign key (facodi_curricular_unit_id) references facodi.curricular_units (id) on delete cascade not valid;
		create index if not exists unit_matches_facodi_curricular_unit_id_idx
			on tube.unit_matches (facodi_curricular_unit_id);
	end if;

	if to_regclass('tube.modules') is not null then
		alter table tube.modules drop constraint if exists modules_facodi_course_id_fkey;
		alter table tube.modules drop constraint if exists modules_facodi_curricular_unit_id_fkey;
		alter table tube.modules
			add constraint modules_facodi_course_id_fkey
			foreign key (facodi_course_id) references facodi.courses (id) on delete set null not valid;
		alter table tube.modules
			add constraint modules_facodi_curricular_unit_id_fkey
			foreign key (facodi_curricular_unit_id) references facodi.curricular_units (id) on delete set null not valid;
		create index if not exists modules_facodi_course_id_idx
			on tube.modules (facodi_course_id);
		create index if not exists modules_facodi_curricular_unit_id_idx
			on tube.modules (facodi_curricular_unit_id);
	end if;

	if to_regclass('tube.facodi_video_publications') is not null then
		alter table tube.facodi_video_publications drop constraint if exists facodi_video_publications_facodi_video_id_fkey;
		alter table tube.facodi_video_publications
			add constraint facodi_video_publications_facodi_video_id_fkey
			foreign key (facodi_video_id) references facodi.youtube_videos (id) on delete cascade not valid;
		create index if not exists facodi_video_publications_facodi_video_id_idx
			on tube.facodi_video_publications (facodi_video_id);
	end if;
end;
$$;

create or replace function tube.publish_module_to_facodi(
	p_module_id uuid,
	p_actor_id uuid default null::uuid
)
returns table(module_id uuid, published_count integer)
language plpgsql
security definer
set search_path = tube, facodi, public, pg_temp
as $$
declare
	v_module tube.modules%rowtype;
	v_video record;
	v_facodi_video_id uuid;
	v_unit_id uuid;
	v_course_id uuid;
	v_count integer := 0;
begin
	if current_user not in ('service_role', 'postgres') then
		raise exception 'tube.publish_module_to_facodi is restricted to service role';
	end if;

	select *
	into v_module
	from tube.modules
	where id = p_module_id;

	if not found then
		raise exception 'module % not found', p_module_id using errcode = 'P0002';
	end if;

	v_unit_id := v_module.facodi_curricular_unit_id;
	v_course_id := v_module.facodi_course_id;

	if v_unit_id is null then
		select um.facodi_curricular_unit_id
		into v_unit_id
		from tube.unit_matches um
		where um.module_id = p_module_id
		order by um.score desc nulls last, um.created_at desc
		limit 1;
	end if;

	if v_course_id is null and v_unit_id is not null then
		select cu.course_id
		into v_course_id
		from facodi.curricular_units cu
		where cu.id = v_unit_id;
	end if;

	if v_course_id is null then
		select cm.facodi_course_id
		into v_course_id
		from tube.course_modules cmod
		join tube.course_matches cm on cm.course_candidate_id = cmod.course_candidate_id
		where cmod.module_id = p_module_id
		order by cm.score desc nulls last, cm.created_at desc
		limit 1;
	end if;

	if exists (select 1 from facodi.courses where id = v_course_id)
		 or exists (select 1 from facodi.curricular_units where id = v_unit_id) then
		update tube.modules
		set facodi_course_id = case when exists (select 1 from facodi.courses where id = v_course_id) then coalesce(facodi_course_id, v_course_id) else facodi_course_id end,
				facodi_curricular_unit_id = case when exists (select 1 from facodi.curricular_units where id = v_unit_id) then coalesce(facodi_curricular_unit_id, v_unit_id) else facodi_curricular_unit_id end,
				updated_at = now()
		where id = p_module_id;
	end if;

	for v_video in
		select
			v.id,
			v.youtube_video_id,
			v.title,
			v.description,
			v.duration_seconds,
			v.published_at,
			v.thumbnail_url,
			v.language,
			v.metadata,
			ch.youtube_channel_id,
			ch.title as channel_title
		from tube.module_videos mv
		join tube.videos v on v.id = mv.video_id
		join tube.channels ch on ch.id = v.channel_id
		where mv.module_id = p_module_id
		order by mv.position nulls last, mv.created_at, v.created_at
	loop
		insert into facodi.youtube_videos (
			youtube_video_id,
			canonical_url,
			title,
			description,
			channel_id,
			channel_title,
			duration_seconds,
			published_at,
			thumbnails,
			language,
			metadata,
			status,
			updated_at
		)
		values (
			v_video.youtube_video_id,
			format('https://www.youtube.com/watch?v=%s', v_video.youtube_video_id),
			v_video.title,
			v_video.description,
			v_video.youtube_channel_id,
			v_video.channel_title,
			v_video.duration_seconds,
			v_video.published_at,
			jsonb_build_object('default', jsonb_build_object('url', v_video.thumbnail_url)),
			coalesce(v_video.language, 'und'),
			coalesce(v_video.metadata, '{}'::jsonb) || jsonb_build_object(
				'tube',
				jsonb_build_object(
					'video_id', v_video.id,
					'module_id', p_module_id
				)
			),
			'processed',
			now()
		)
		on conflict (youtube_video_id) do update
			set canonical_url = excluded.canonical_url,
					title = excluded.title,
					description = excluded.description,
					channel_id = excluded.channel_id,
					channel_title = excluded.channel_title,
					duration_seconds = excluded.duration_seconds,
					published_at = excluded.published_at,
					thumbnails = excluded.thumbnails,
					language = excluded.language,
					metadata = coalesce(facodi.youtube_videos.metadata, '{}'::jsonb) || excluded.metadata,
					status = excluded.status,
					updated_at = now()
		returning id into v_facodi_video_id;

		insert into tube.facodi_video_publications (
			tube_video_id,
			module_id,
			facodi_video_id,
			published_by,
			published_at,
			metadata
		)
		values (
			v_video.id,
			p_module_id,
			v_facodi_video_id,
			p_actor_id,
			now(),
			jsonb_build_object('source', 'tube.publish_module_to_facodi')
		)
		on conflict (tube_video_id) do update
			set module_id = excluded.module_id,
					facodi_video_id = excluded.facodi_video_id,
					published_by = excluded.published_by,
					published_at = excluded.published_at,
					metadata = coalesce(tube.facodi_video_publications.metadata, '{}'::jsonb) || excluded.metadata,
					updated_at = now();

		if v_unit_id is not null and exists (select 1 from facodi.curricular_units where id = v_unit_id) then
			insert into facodi.video_classifications (
				video_id,
				course_id,
				curricular_unit_id,
				confidence,
				confidence_level,
				status,
				needs_review,
				justification,
				evidence,
				metadata,
				reviewed_by,
				reviewed_at
			)
			select
				v_facodi_video_id,
				coalesce(v_course_id, cu.course_id),
				v_unit_id,
				1.0,
				'high',
				'approved',
				false,
				'Published from curated Tube module',
				jsonb_build_array(
					jsonb_build_object(
						'module_id', p_module_id,
						'tube_video_id', v_video.id
					)
				),
				jsonb_build_object(
					'source', 'tube.publish_module_to_facodi',
					'tube_module_id', p_module_id
				),
				p_actor_id,
				now()
			from facodi.curricular_units cu
			where cu.id = v_unit_id
				and not exists (
					select 1
					from facodi.video_classifications vc
					where vc.video_id = v_facodi_video_id
						and vc.curricular_unit_id = v_unit_id
				);
		end if;

		v_count := v_count + 1;
	end loop;

	update tube.curation_queue
	set status = 'published',
			published_at = coalesce(published_at, now()),
			reviewed_by = coalesce(reviewed_by, p_actor_id),
			reviewed_at = coalesce(reviewed_at, now()),
			updated_at = now()
	where entity_type = 'module'
		and entity_id = p_module_id
		and status in ('approved', 'edited');

	return query select p_module_id, v_count;
end;
$$;

revoke all on function tube.publish_module_to_facodi(uuid, uuid) from public, anon, authenticated;
grant execute on function tube.publish_module_to_facodi(uuid, uuid) to service_role;
