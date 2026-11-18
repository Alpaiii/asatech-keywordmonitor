create function public.guard_project_archive_owner_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is distinct from old.archived_at
    and not public.is_workspace_owner(old.workspace_id) then
    raise exception 'Only workspace owners can change project archive status'
      using errcode = '42501';
  end if;

  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'Projects cannot be moved between workspaces'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger projects_guard_archive_owner_only
before update on public.projects
for each row execute function public.guard_project_archive_owner_only();
