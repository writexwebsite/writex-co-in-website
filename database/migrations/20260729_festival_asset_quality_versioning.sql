begin;

alter table holiday_theme_assets
  add column if not exists quality_status text not null default 'needs_visual_review',
  add column if not exists version_number integer not null default 1,
  add column if not exists previous_asset_id uuid null,
  add column if not exists intended_object text null,
  add column if not exists intended_festival text null,
  add column if not exists asset_category text null,
  add column if not exists visual_style text null,
  add column if not exists size_restrictions text null,
  add column if not exists usage_locations text[] not null default '{}'::text[],
  add column if not exists clarity_confirmation_at timestamptz null,
  add column if not exists clarity_confirmation_by uuid null;

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_quality_status_check;

alter table holiday_theme_assets
  add constraint holiday_theme_assets_quality_status_check
  check (
    quality_status in (
      'draft',
      'needs_visual_review',
      'ambiguous',
      'rejected',
      'approved',
      'approved_with_size_restrictions',
      'needs_replacement',
      'archived'
    )
  );

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_version_number_check;

alter table holiday_theme_assets
  add constraint holiday_theme_assets_version_number_check
  check (version_number > 0);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'holiday_theme_assets_previous_asset_id_fkey'
  ) then
    alter table holiday_theme_assets
      add constraint holiday_theme_assets_previous_asset_id_fkey
      foreign key (previous_asset_id)
      references holiday_theme_assets(id)
      on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'holiday_theme_assets_clarity_confirmation_by_fkey'
  ) then
    alter table holiday_theme_assets
      add constraint holiday_theme_assets_clarity_confirmation_by_fkey
      foreign key (clarity_confirmation_by)
      references admin_users(id)
      on delete set null;
  end if;
end
$$;

update holiday_theme_assets
set quality_status = case
  when review_status = 'approved' then 'approved'
  when review_status = 'rejected' then 'rejected'
  when review_status = 'archived' then 'archived'
  else 'needs_visual_review'
end
where quality_status = 'needs_visual_review';

create index if not exists holiday_theme_assets_quality_review_idx
  on holiday_theme_assets (
    theme_id,
    quality_status,
    status,
    created_at desc
  );

create index if not exists holiday_theme_assets_previous_version_idx
  on holiday_theme_assets (previous_asset_id)
  where previous_asset_id is not null;

commit;
