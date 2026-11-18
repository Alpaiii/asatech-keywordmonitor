drop policy "rank_checkins_insert_members"
on public.rank_checkins;

create policy "rank_checkins_insert_manual_members"
on public.rank_checkins for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
  and source = 'manual'
);

drop policy "rank_status_snapshots_insert_members"
on public.rank_status_snapshots;

drop policy "keyword_targets_delete_members"
on public.keyword_targets;

create policy "keyword_targets_delete_owners"
on public.keyword_targets for delete
to authenticated
using (public.is_workspace_owner(workspace_id));

create function public.rank_evidence_path_is_valid(
  object_name text,
  target_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    cardinality(storage.foldername(object_name)) = 3
    and (storage.foldername(object_name))[1] = target_workspace_id::text
    and exists (
      select 1
      from public.rank_checkins
      where workspace_id = target_workspace_id
        and keyword_target_id = ((storage.foldername(object_name))[2])::uuid
        and id = ((storage.foldername(object_name))[3])::uuid
    );
$$;

revoke all on function public.rank_evidence_path_is_valid(text, uuid) from public;
grant execute on function public.rank_evidence_path_is_valid(text, uuid)
to authenticated;

drop policy "rank_evidence_objects_insert_members"
on storage.objects;

create policy "rank_evidence_objects_insert_members"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'rank-evidence'
  and owner_id = auth.uid()::text
  and public.rank_evidence_path_is_valid(
    name,
    ((storage.foldername(name))[1])::uuid
  )
);
