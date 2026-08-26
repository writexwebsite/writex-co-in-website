begin;

alter table holiday_themes
  add column if not exists experience_level text not null default 'standard';

update holiday_themes
set festival_type = case
  when slug = 'default' then 'system_default'
  when slug in (
    'republic-day',
    'independence-day',
    'gandhi-jayanti',
    'netaji-jayanti',
    'childrens-day'
  ) then 'national_holiday'
  when slug in (
    'diwali',
    'dussehra',
    'durga-puja',
    'kali-puja',
    'janmashtami',
    'ganesh-chaturthi',
    'eid',
    'eid-al-fitr',
    'eid-al-adha',
    'muharram',
    'christmas',
    'easter'
  ) then 'religious_festival'
  when slug in (
    'holi',
    'raksha-bandhan',
    'makar-sankranti',
    'pongal',
    'onam',
    'baisakhi'
  ) then 'cultural_festival'
  when slug in (
    'new-year',
    'valentines-day',
    'womens-day',
    'teachers-day',
    'labour-day',
    'world-environment-day',
    'international-yoga-day'
  ) then 'global_observance'
  when slug = 'company-anniversary' then 'company_event'
  when slug = 'recruitment-drive' then 'recruitment_campaign'
  when slug in (
    'annual-report-season',
    'admission-season',
    'financial-year-end',
    'examination-admission-season'
  ) then 'business_season'
  when slug = 'founders-day' then 'internal_milestone'
  else 'custom_one_time_event'
end
where festival_type not in (
  'national_holiday',
  'religious_festival',
  'cultural_festival',
  'global_observance',
  'company_event',
  'recruitment_campaign',
  'business_season',
  'internal_milestone',
  'custom_one_time_event',
  'system_default'
);

update holiday_themes
set name = 'Company Anniversary'
where slug = 'company-anniversary'
  and name = 'Founder / Company Anniversary';

update holiday_themes
set status = 'archived',
    is_enabled = false,
    built_in = false,
    archived_at = coalesce(archived_at, now()),
    updated_at = now()
where slug in ('eid', 'examination-admission-season')
  and built_in = true
  and status <> 'active';

update holiday_themes
set experience_level = case
  when slug = 'default' then 'accent_only'
  when animation_level = 'none' then 'accent_only'
  when animation_level = 'standard' then 'enhanced'
  else 'standard'
end
where experience_level not in ('accent_only', 'standard', 'enhanced')
   or experience_level = 'standard';

alter table holiday_themes
  drop constraint if exists holiday_themes_festival_type_check;
alter table holiday_themes
  add constraint holiday_themes_festival_type_check
  check (
    festival_type in (
      'national_holiday',
      'religious_festival',
      'cultural_festival',
      'global_observance',
      'company_event',
      'recruitment_campaign',
      'business_season',
      'internal_milestone',
      'custom_one_time_event',
      'system_default'
    )
  );

alter table holiday_themes
  drop constraint if exists holiday_themes_experience_level_check;
alter table holiday_themes
  add constraint holiday_themes_experience_level_check
  check (experience_level in ('accent_only', 'standard', 'enhanced'));

create index if not exists holiday_themes_category_idx
  on holiday_themes (festival_type, status, name);

commit;
