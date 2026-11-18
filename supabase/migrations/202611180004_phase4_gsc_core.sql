create extension if not exists pgcrypto;

create type public.oauth_provider as enum ('gsc', 'ga4');
create type public.oauth_connection_status as enum ('connected', 'disconnected', 'revoked', 'error');
create type public.sync_provider as enum ('gsc', 'ga4');
create type public.sync_job_status as enum ('pending', 'running', 'completed', 'completed_with_errors', 'failed');
create type public.gsc_search_type as enum ('web', 'image', 'video', 'news');

alter table public.projects
add column if not exists gsc_property_uri text;

create table public.oauth_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider public.oauth_provider not null,
  encrypted_refresh_token text not null check (encrypted_refresh_token <> ''),
  scopes text[] not null default '{}',
  status public.oauth_connection_status not null default 'connected',
  last_error text,
  last_refresh_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider),
  unique (id, workspace_id)
);

create table public.project_properties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  oauth_connection_id uuid not null references public.oauth_connections(id) on delete cascade,
  provider public.oauth_provider not null,
  property_uri text not null check (property_uri <> ''),
  property_name text,
  permission_level text,
  is_default boolean not null default false,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  unique (project_id, provider),
  unique (id, workspace_id),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade,
  foreign key (oauth_connection_id, workspace_id)
    references public.oauth_connections(id, workspace_id) on delete cascade
);

create table public.gsc_daily_property_metrics (
  project_id uuid not null,
  date date not null,
  search_type public.gsc_search_type not null default 'web',
  country text not null default '',
  device text not null default '',
  clicks bigint not null default 0,
  impressions bigint not null default 0,
  ctr numeric(10, 6) not null default 0,
  position numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  primary key (project_id, date, search_type, country, device)
);

create table public.gsc_query_daily (
  project_id uuid not null,
  date date not null,
  query text not null,
  page text not null,
  country text not null default '',
  device text not null default '',
  search_type public.gsc_search_type not null default 'web',
  clicks bigint not null default 0,
  impressions bigint not null default 0,
  ctr numeric(10, 6) not null default 0,
  position numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  primary key (project_id, date, query, page, country, device, search_type)
);

create table public.gsc_page_daily (
  project_id uuid not null,
  date date not null,
  page text not null,
  country text not null default '',
  device text not null default '',
  search_type public.gsc_search_type not null default 'web',
  clicks bigint not null default 0,
  impressions bigint not null default 0,
  ctr numeric(10, 6) not null default 0,
  position numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  primary key (project_id, date, page, country, device, search_type)
);

create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  provider public.sync_provider not null,
  status public.sync_job_status not null default 'pending',
  search_type public.gsc_search_type not null default 'web',
  date_range_start date not null,
  date_range_end date not null,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  next_attempt_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  rows_processed integer not null default 0,
  rows_inserted integer not null default 0,
  rows_updated integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, provider, search_type, date_range_start, date_range_end),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade
);

create table public.gsc_target_keyword_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  keyword_target_id uuid not null,
  query text not null,
  date date not null,
  search_type public.gsc_search_type not null default 'web',
  country text not null default '',
  device text not null default '',
  clicks bigint not null default 0,
  impressions bigint not null default 0,
  ctr numeric(10, 6) not null default 0,
  position numeric(5, 2) not null default 0,
  matched_at timestamptz not null default now(),
  unique (keyword_target_id, query, date, search_type, country, device),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade,
  foreign key (keyword_target_id, workspace_id)
    references public.keyword_targets(id, workspace_id) on delete cascade
);

create index oauth_connections_workspace_idx on public.oauth_connections (workspace_id);
create index project_properties_workspace_idx on public.project_properties (workspace_id);
create index project_properties_project_idx on public.project_properties (project_id);
create index gsc_daily_property_metrics_project_date_idx on public.gsc_daily_property_metrics (project_id, date desc);
create index gsc_query_daily_project_date_idx on public.gsc_query_daily (project_id, date desc);
create index gsc_query_daily_project_query_idx on public.gsc_query_daily (project_id, query);
create index gsc_page_daily_project_date_idx on public.gsc_page_daily (project_id, date desc);
create index gsc_page_daily_project_page_idx on public.gsc_page_daily (project_id, page);
create index sync_jobs_project_provider_idx on public.sync_jobs (project_id, provider);
create index sync_jobs_status_idx on public.sync_jobs (status);
create index gsc_target_keyword_snapshots_target_idx on public.gsc_target_keyword_snapshots (keyword_target_id);
create index gsc_target_keyword_snapshots_project_idx on public.gsc_target_keyword_snapshots (project_id);

create trigger oauth_connections_set_updated_at
before update on public.oauth_connections
for each row execute function public.set_updated_at();

create trigger sync_jobs_set_updated_at
before update on public.sync_jobs
for each row execute function public.set_updated_at();

alter table public.oauth_connections enable row level security;
alter table public.project_properties enable row level security;
alter table public.gsc_daily_property_metrics enable row level security;
alter table public.gsc_query_daily enable row level security;
alter table public.gsc_page_daily enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.gsc_target_keyword_snapshots enable row level security;

create policy "project_properties_select_members"
on public.project_properties for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "gsc_daily_property_metrics_select_members"
on public.gsc_daily_property_metrics for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = gsc_daily_property_metrics.project_id
      and public.is_workspace_member(p.workspace_id)
  )
);

create policy "gsc_query_daily_select_members"
on public.gsc_query_daily for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = gsc_query_daily.project_id
      and public.is_workspace_member(p.workspace_id)
  )
);

create policy "gsc_page_daily_select_members"
on public.gsc_page_daily for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = gsc_page_daily.project_id
      and public.is_workspace_member(p.workspace_id)
  )
);

create policy "sync_jobs_select_members"
on public.sync_jobs for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "gsc_target_keyword_snapshots_select_members"
on public.gsc_target_keyword_snapshots for select
to authenticated
using (public.is_workspace_member(workspace_id));