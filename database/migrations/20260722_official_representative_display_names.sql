begin;

alter table official_representatives
  add column if not exists source_full_name text,
  add column if not exists public_display_name text,
  add column if not exists public_display_name_source text,
  add column if not exists public_display_name_updated_at timestamptz;

update official_representatives
set source_full_name = coalesce(source_full_name, full_name),
    public_display_name = coalesce(public_display_name, full_name),
    public_display_name_source = coalesce(
      public_display_name_source,
      'full_name_fallback'
    ),
    public_display_name_updated_at = coalesce(
      public_display_name_updated_at,
      updated_at,
      now()
    );

alter table official_representatives
  drop constraint if exists official_representatives_public_display_name_source_check,
  drop constraint if exists official_representatives_public_display_name_length_check;

alter table official_representatives
  add constraint official_representatives_public_display_name_source_check
  check (
    public_display_name_source is null or
    public_display_name_source in (
      'lts_public_display_name',
      'management_mapping',
      'lts_sales_display_name',
      'full_name_fallback'
    )
  ),
  add constraint official_representatives_public_display_name_length_check
  check (
    public_display_name is null or
    char_length(public_display_name) between 1 and 120
  );

commit;
