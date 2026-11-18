create function public.guard_workspace_membership_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id
    or new.user_id is distinct from old.user_id then
    raise exception 'Workspace membership identity cannot change'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger workspace_members_guard_identity
before update on public.workspace_members
for each row execute function public.guard_workspace_membership_identity();

create function public.guard_rank_checkin_target_context()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_country_code text;
  target_device public.keyword_device;
  target_location text;
begin
  select country_code, device, location
  into target_country_code, target_device, target_location
  from public.keyword_targets
  where id = new.keyword_target_id
    and workspace_id = new.workspace_id;

  if not found then
    raise exception 'Rank check-in target does not exist in workspace'
      using errcode = '23503';
  end if;

  if new.checked_at > now()
    or new.country_code <> target_country_code
    or new.device <> target_device
    or lower(regexp_replace(trim(new.location), '\s+', ' ', 'g'))
      <> lower(regexp_replace(trim(target_location), '\s+', ' ', 'g')) then
    raise exception 'Rank check-in context must match keyword target'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger rank_checkins_guard_target_context
before insert on public.rank_checkins
for each row execute function public.guard_rank_checkin_target_context();

create function public.guard_rank_evidence_storage_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  select keyword_target_id
  into target_id
  from public.rank_checkins
  where id = new.rank_checkin_id
    and workspace_id = new.workspace_id;

  if not found then
    raise exception 'Rank evidence check-in does not exist in workspace'
      using errcode = '23503';
  end if;

  if cardinality(storage.foldername(new.storage_path)) <> 3
    or (storage.foldername(new.storage_path))[1] <> new.workspace_id::text
    or (storage.foldername(new.storage_path))[2] <> target_id::text
    or (storage.foldername(new.storage_path))[3] <> new.rank_checkin_id::text then
    raise exception 'Rank evidence path does not match check-in context'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'rank-evidence'
      and name = new.storage_path
      and owner_id = auth.uid()::text
  ) then
    raise exception 'Rank evidence object does not exist'
      using errcode = '23503';
  end if;

  return new;
end;
$$;

create trigger rank_evidence_guard_storage_path
before insert on public.rank_evidence
for each row execute function public.guard_rank_evidence_storage_path();

create function public.guard_rank_status_checkin_target()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.based_on_checkin_id is not null and not exists (
    select 1
    from public.rank_checkins
    where id = new.based_on_checkin_id
      and workspace_id = new.workspace_id
      and keyword_target_id = new.keyword_target_id
  ) then
    raise exception 'Status snapshot check-in does not belong to keyword target'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger rank_status_snapshots_guard_checkin_target
before insert on public.rank_status_snapshots
for each row execute function public.guard_rank_status_checkin_target();
