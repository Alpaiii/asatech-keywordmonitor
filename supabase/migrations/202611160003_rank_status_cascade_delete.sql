create function public.guard_immutable_rank_status_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and not exists (
    select 1
    from public.keyword_targets
    where id = old.keyword_target_id
      and workspace_id = old.workspace_id
  ) then
    return old;
  end if;

  raise exception 'Rank history is immutable'
    using errcode = '23514';
end;
$$;

drop trigger rank_status_snapshots_immutable
on public.rank_status_snapshots;

create trigger rank_status_snapshots_immutable
before update or delete on public.rank_status_snapshots
for each row execute function public.guard_immutable_rank_status_snapshot();
