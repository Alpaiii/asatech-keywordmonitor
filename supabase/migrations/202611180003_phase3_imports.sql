create type public.import_type as enum ('keyword_targets', 'rank_checkins');
create type public.import_status as enum (
  'previewed',
  'processing',
  'completed',
  'completed_with_errors',
  'failed'
);
create type public.import_row_status as enum (
  'valid',
  'invalid',
  'succeeded',
  'failed'
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type public.import_type not null,
  status public.import_status not null default 'previewed',
  file_name text not null check (char_length(file_name) between 1 and 255),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  total_rows integer not null default 0 check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  invalid_rows integer not null default 0 check (invalid_rows >= 0),
  succeeded_rows integer not null default 0 check (succeeded_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (workspace_id, type, idempotency_key),
  unique (id, workspace_id)
);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null,
  workspace_id uuid not null,
  row_number integer not null check (row_number >= 2),
  status public.import_row_status not null,
  input jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  result jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  foreign key (import_id, workspace_id)
    references public.imports(id, workspace_id) on delete cascade,
  unique (import_id, row_number)
);

create index imports_workspace_created_idx
on public.imports (workspace_id, created_at desc);
create index import_rows_import_row_idx
on public.import_rows (import_id, row_number);

alter table public.imports enable row level security;
alter table public.import_rows enable row level security;

create policy "imports_select_members"
on public.imports for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "import_rows_select_members"
on public.import_rows for select to authenticated
using (public.is_workspace_member(workspace_id));

create function public.claim_import(target_import_id uuid, target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.imports
  set status = 'processing', started_at = now()
  where id = target_import_id
    and created_by = target_user_id
    and status = 'previewed';
  return found;
end;
$$;

revoke all on function public.claim_import(uuid, uuid) from public;
grant execute on function public.claim_import(uuid, uuid) to service_role;
