create type public.keyword_device as enum ('desktop', 'mobile', 'tablet');
create type public.keyword_priority as enum ('low', 'medium', 'high', 'critical');
create type public.rank_source as enum ('manual', 'serp_provider');
create type public.keyword_status as enum (
  'no_data',
  'overdue',
  'maintain_warning',
  'stale',
  'achieved',
  'at_risk',
  'on_track'
);

alter table public.projects
add constraint projects_id_workspace_unique unique (id, workspace_id);

create table public.keyword_targets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  phrase text not null check (char_length(trim(phrase)) between 1 and 500),
  canonical_phrase text generated always as (lower(regexp_replace(trim(phrase), '\s+', ' ', 'g'))) stored,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  language_code text not null check (language_code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  device public.keyword_device not null default 'desktop',
  location text not null default '' check (char_length(location) <= 200),
  normalized_location text generated always as (lower(regexp_replace(trim(location), '\s+', ' ', 'g'))) stored,
  target_position smallint not null check (target_position between 1 and 100),
  priority public.keyword_priority not null default 'medium',
  deadline date,
  maintain_enabled boolean not null default false,
  maintain_position_limit smallint check (maintain_position_limit between 1 and 100),
  check_frequency_days smallint not null default 14 check (check_frequency_days between 1 and 365),
  assignee_user_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade,
  foreign key (workspace_id, assignee_user_id)
    references public.workspace_members(workspace_id, user_id) on delete restrict,
  unique (id, workspace_id),
  unique (
    project_id,
    canonical_phrase,
    country_code,
    language_code,
    device,
    normalized_location
  ),
  check (
    (maintain_enabled and maintain_position_limit is not null)
    or (not maintain_enabled)
  )
);

create table public.rank_checkins (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  keyword_target_id uuid not null,
  source public.rank_source not null default 'manual',
  position smallint,
  not_found_top_100 boolean not null default false,
  checked_at timestamptz not null default now(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  device public.keyword_device not null,
  location text not null default '' check (char_length(location) <= 200),
  notes text check (char_length(notes) <= 2000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (keyword_target_id, workspace_id)
    references public.keyword_targets(id, workspace_id) on delete cascade,
  unique (id, workspace_id),
  check (
    (position between 1 and 100 and not not_found_top_100)
    or (position is null and not_found_top_100)
  )
);

create table public.rank_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  rank_checkin_id uuid not null,
  storage_path text not null check (storage_path <> ''),
  file_name text not null check (file_name <> '' and char_length(file_name) <= 255),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (rank_checkin_id, workspace_id)
    references public.rank_checkins(id, workspace_id) on delete cascade,
  unique (storage_path)
);

create table public.rank_status_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  keyword_target_id uuid not null,
  based_on_checkin_id uuid,
  status public.keyword_status not null,
  rule_version text not null check (rule_version <> ''),
  explanation text not null check (explanation <> ''),
  rule_input jsonb not null default '{}'::jsonb,
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (keyword_target_id, workspace_id)
    references public.keyword_targets(id, workspace_id) on delete cascade,
  foreign key (based_on_checkin_id, workspace_id)
    references public.rank_checkins(id, workspace_id) on delete restrict
);

create index keyword_targets_project_created_idx
on public.keyword_targets (project_id, created_at desc);
create index keyword_targets_workspace_assignee_idx
on public.keyword_targets (workspace_id, assignee_user_id);
create index rank_checkins_target_checked_idx
on public.rank_checkins (keyword_target_id, checked_at desc);
create index rank_evidence_checkin_idx
on public.rank_evidence (rank_checkin_id, created_at desc);
create index rank_status_target_evaluated_idx
on public.rank_status_snapshots (keyword_target_id, evaluated_at desc);

create trigger keyword_targets_set_updated_at
before update on public.keyword_targets
for each row execute function public.set_updated_at();

create function public.guard_keyword_target_tenant_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id <> old.workspace_id or new.project_id <> old.project_id then
    raise exception 'Keyword target tenant fields cannot change'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger keyword_targets_guard_tenant_fields
before update on public.keyword_targets
for each row execute function public.guard_keyword_target_tenant_fields();

create function public.guard_immutable_rank_event()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Rank history is immutable'
    using errcode = '23514';
end;
$$;

create trigger rank_checkins_immutable
before update or delete on public.rank_checkins
for each row execute function public.guard_immutable_rank_event();

create trigger rank_status_snapshots_immutable
before update or delete on public.rank_status_snapshots
for each row execute function public.guard_immutable_rank_event();

alter table public.keyword_targets enable row level security;
alter table public.rank_checkins enable row level security;
alter table public.rank_evidence enable row level security;
alter table public.rank_status_snapshots enable row level security;

create policy "keyword_targets_select_members"
on public.keyword_targets for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "keyword_targets_insert_members"
on public.keyword_targets for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

create policy "keyword_targets_update_members"
on public.keyword_targets for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "keyword_targets_delete_members"
on public.keyword_targets for delete
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "rank_checkins_select_members"
on public.rank_checkins for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "rank_checkins_insert_members"
on public.rank_checkins for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

create policy "rank_evidence_select_members"
on public.rank_evidence for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "rank_evidence_insert_members"
on public.rank_evidence for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and uploaded_by = auth.uid()
);

create policy "rank_evidence_delete_uploader_or_owner"
on public.rank_evidence for delete
to authenticated
using (
  uploaded_by = auth.uid()
  or public.is_workspace_owner(workspace_id)
);

create policy "rank_status_snapshots_select_members"
on public.rank_status_snapshots for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "rank_status_snapshots_insert_members"
on public.rank_status_snapshots for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rank-evidence',
  'rank-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "rank_evidence_objects_select_members"
on storage.objects for select
to authenticated
using (
  bucket_id = 'rank-evidence'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

create policy "rank_evidence_objects_insert_members"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'rank-evidence'
  and owner_id = auth.uid()::text
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

create policy "rank_evidence_objects_delete_uploader_or_owner"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'rank-evidence'
  and (
    owner_id = auth.uid()::text
    or public.is_workspace_owner(((storage.foldername(name))[1])::uuid)
  )
);
