begin;

create table if not exists representative_sync_state (
  source_system text primary key,
  last_attempted_at timestamptz,
  last_successful_at timestamptz,
  received integer not null default 0,
  created integer not null default 0,
  updated integer not null default 0,
  deactivated integer not null default 0,
  rejected integer not null default 0,
  safe_failure_reason text,
  last_trigger text,
  last_run_was_dry_run boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint representative_sync_state_source_check
    check (source_system in ('lts')),
  constraint representative_sync_state_trigger_check
    check (last_trigger is null or last_trigger in ('manual_admin', 'scheduled', 'dry_run')),
  constraint representative_sync_state_counts_check
    check (
      received >= 0 and created >= 0 and updated >= 0 and
      deactivated >= 0 and rejected >= 0
    )
);

insert into representative_sync_state (source_system)
values ('lts')
on conflict (source_system) do nothing;

commit;
