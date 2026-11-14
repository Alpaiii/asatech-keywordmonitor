create extension if not exists pgcrypto;

create type public.workspace_role as enum ('owner', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  site_url text not null check (site_url ~ '^https?://'),
  domain text not null check (char_length(trim(domain)) between 1 and 253),
  default_country text not null default 'ID' check (default_country ~ '^[A-Z]{2}$'),
  default_language text not null default 'id' check (default_language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  timezone text not null default 'Asia/Jakarta',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, domain)
);

create index projects_workspace_created_idx on public.projects (workspace_id, created_at desc);
create index workspace_members_user_idx on public.workspace_members (user_id, workspace_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_owner(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  profile_name text;
begin
  profile_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Pengguna');

  insert into public.profiles (id, display_name)
  values (new.id, profile_name);

  insert into public.workspaces (name, owner_id)
  values (profile_name || ' Workspace', new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;

create policy "profiles_select_self_or_coworker"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.workspace_members own_membership
    join public.workspace_members target_membership
      on target_membership.workspace_id = own_membership.workspace_id
    where own_membership.user_id = auth.uid()
      and target_membership.user_id = profiles.id
  )
);

create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "workspaces_select_members"
on public.workspaces for select
to authenticated
using (public.is_workspace_member(id));

create policy "workspaces_update_owner"
on public.workspaces for update
to authenticated
using (public.is_workspace_owner(id))
with check (public.is_workspace_owner(id) and owner_id = auth.uid());

create policy "workspace_members_select_members"
on public.workspace_members for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert_owner"
on public.workspace_members for insert
to authenticated
with check (public.is_workspace_owner(workspace_id));

create policy "workspace_members_update_owner"
on public.workspace_members for update
to authenticated
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

create policy "workspace_members_delete_owner"
on public.workspace_members for delete
to authenticated
using (public.is_workspace_owner(workspace_id) and user_id <> auth.uid());

create policy "projects_select_members"
on public.projects for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "projects_insert_members"
on public.projects for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy "projects_update_members"
on public.projects for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "projects_delete_owner"
on public.projects for delete
to authenticated
using (public.is_workspace_owner(workspace_id));
