begin;

alter table hiring_notifications
  add column if not exists correlation_id text,
  add column if not exists last_attempted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists hiring_notifications_application_status_idx
  on hiring_notifications (application_id, status, created_at desc);

create index if not exists hiring_notifications_correlation_idx
  on hiring_notifications (correlation_id)
  where correlation_id is not null;

commit;
