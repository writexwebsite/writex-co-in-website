begin;

alter table official_representatives
  add column if not exists lts_public_display_name text,
  add column if not exists manual_public_display_name text,
  add column if not exists manual_public_display_name_updated_at timestamptz;

update official_representatives
set lts_public_display_name = case
      when lts_public_display_name is not null then lts_public_display_name
      when public_display_name_source in (
        'lts_public_display_name',
        'lts_sales_display_name'
      ) then public_display_name
      else null
    end,
    manual_public_display_name = case
      when manual_public_display_name is not null then manual_public_display_name
      when public_display_name_source = 'manual_override' then public_display_name
      else null
    end,
    manual_public_display_name_updated_at = case
      when manual_public_display_name_updated_at is not null
        then manual_public_display_name_updated_at
      when public_display_name_source = 'manual_override'
        then coalesce(public_display_name_updated_at, updated_at, now())
      else null
    end;

alter table official_representatives
  drop constraint if exists official_representatives_public_display_name_source_check,
  drop constraint if exists official_representatives_public_display_name_length_check,
  drop constraint if exists official_representatives_lts_public_display_name_length_check,
  drop constraint if exists official_representatives_manual_public_display_name_length_check;

alter table official_representatives
  add constraint official_representatives_public_display_name_source_check
  check (
    public_display_name_source is null or
    public_display_name_source in (
      'manual_override',
      'lts_public_display_name',
      'management_mapping',
      'lts_sales_display_name',
      'full_name_fallback'
    )
  ),
  add constraint official_representatives_public_display_name_length_check
  check (
    public_display_name is null or
    char_length(public_display_name) between 1 and 100
  ),
  add constraint official_representatives_lts_public_display_name_length_check
  check (
    lts_public_display_name is null or
    char_length(lts_public_display_name) between 1 and 100
  ),
  add constraint official_representatives_manual_public_display_name_length_check
  check (
    manual_public_display_name is null or
    char_length(manual_public_display_name) between 1 and 100
  );

commit;
