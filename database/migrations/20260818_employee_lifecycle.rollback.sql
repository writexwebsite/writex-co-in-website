drop index if exists employees_lifecycle_directory_idx;

alter table employees
  drop constraint if exists employees_archive_previous_status_check,
  drop column if exists lifecycle_version,
  drop column if exists archive_previous_academy_enabled,
  drop column if exists archive_previous_employment_status,
  drop column if exists archived_by_admin_id,
  drop column if exists archived_at;
