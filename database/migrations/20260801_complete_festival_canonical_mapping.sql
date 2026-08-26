begin;

-- The target catalogue remains visible even when this designer package has no source.
insert into festival_hero_groups (
  festival_name, festival_slug, source_status, source_message,
  default_variant_slug, created_at, updated_at
)
select name, slug, 'source_required',
  'No processed Hero/Background asset exists in the current Festivals.zip package.',
  null, now(), now()
from holiday_themes
where slug <> 'default' and status <> 'archived'
on conflict (festival_slug) do nothing;

with aliases(raw_slug, canonical_slug, canonical_name, family_name) as (values
  ('bhogali-bihu', 'bhogali-bihu', 'Bhogali Bihu', 'Bihu'),
  ('chaat-puja', 'chhath-puja', 'Chhath Puja', null),
  ('children-day', 'childrens-day', 'Children''s Day', null),
  ('christmas', 'christmas', 'Christmas', null),
  ('diwali', 'diwali', 'Diwali', null),
  ('durga-puja', 'durga-puja', 'Durga Puja', null),
  ('dussehra', 'dussehra', 'Dussehra', null),
  ('eid-festival', 'eid', 'Eid', null),
  ('fathers-day', 'fathers-day', 'Father''s Day', null),
  ('gandhi-jayanti', 'gandhi-jayanti', 'Gandhi Jayanti', null),
  ('ganesh-chaturthi', 'ganesh-chaturthi', 'Ganesh Chaturthi', null),
  ('gurunanak-jayanti', 'guru-nanak-jayanti', 'Guru Nanak Jayanti', null),
  ('halloween', 'halloween', 'Halloween', null),
  ('happy-new-year', 'new-year', 'New Year', null),
  ('independence-day', 'independence-day', 'Independence Day', null),
  ('kati-bihu', 'kati-bihu', 'Kati Bihu', 'Bihu'),
  ('mothers-day', 'mothers-day', 'Mother''s Day', null),
  ('onam', 'onam', 'Onam', null),
  ('pongal', 'pongal', 'Pongal', null),
  ('raksha-bandhan', 'raksha-bandhan', 'Raksha Bandhan', null),
  ('rath-yatra', 'rath-yatra', 'Rath Yatra', null),
  ('republic-day', 'republic-day', 'Republic Day', null),
  ('rongali-bihu', 'rongali-bihu', 'Rongali Bihu', 'Bihu'),
  ('saraswati-puja', 'saraswati-puja', 'Saraswati Puja', null),
  ('st-patrick-day', 'st-patricks-day', 'St. Patrick''s Day', null),
  ('thaipusam', 'thaipusam', 'Thaipusam', null),
  ('valentine-day', 'valentines-day', 'Valentine''s Day', null),
  ('yoga-day', 'international-yoga-day', 'International Yoga Day', null)
), updated as (
  update festival_pack_imports p
  set manifest_json = p.manifest_json || jsonb_build_object(
      'festivalSlug', a.canonical_slug,
      'festivalName', a.canonical_name,
      'variantSlug', coalesce(nullif(p.manifest_json->>'variantSlug', ''), 'source-' || a.raw_slug),
      'variantName', coalesce(nullif(p.manifest_json->>'variantName', ''), 'Default Variant'),
      'sourceEventName', coalesce(p.manifest_json->>'eventName', p.manifest_json->>'festivalName', a.raw_slug),
      'eventFamily', a.family_name,
      'clientCompatible', true,
      'employeeCompatible', true
    ), updated_at = now()
  from aliases a
  where p.manifest_json->>'packType' = 'responsive_festival_hero'
    and coalesce(p.manifest_json->>'festivalSlug', p.manifest_json->>'slug') = a.raw_slug
  returning a.canonical_slug
)
insert into festival_hero_groups (
  festival_name, festival_slug, source_status, source_message,
  default_variant_slug, created_at, updated_at
)
select a.canonical_name, a.canonical_slug, 'ready',
  jsonb_build_object('sourceName', a.raw_slug, 'family', a.family_name)::text,
  min(coalesce(nullif(p.manifest_json->>'variantSlug', ''), 'source-' || a.raw_slug)),
  now(), now()
from aliases a
join festival_pack_imports p
  on p.manifest_json->>'packType' = 'responsive_festival_hero'
 and p.manifest_json->>'festivalSlug' = a.canonical_slug
group by a.canonical_name, a.canonical_slug, a.raw_slug, a.family_name
on conflict (festival_slug) do update set
  festival_name = excluded.festival_name,
  source_status = 'ready',
  source_message = excluded.source_message,
  default_variant_slug = coalesce(festival_hero_groups.default_variant_slug, excluded.default_variant_slug),
  updated_at = now();

-- Use a separate statement so PostgreSQL observes the manifest updates above.
insert into festival_hero_groups (
  festival_name, festival_slug, source_status, source_message,
  default_variant_slug, created_at, updated_at
)
select max(p.manifest_json->>'festivalName'), p.manifest_json->>'festivalSlug',
  'ready',
  jsonb_build_object(
    'sourceName', max(coalesce(p.manifest_json->>'sourceEventName', p.manifest_json->>'slug')),
    'family', max(p.manifest_json->>'eventFamily')
  )::text,
  min(p.manifest_json->>'variantSlug'), now(), now()
from festival_pack_imports p
where p.manifest_json->>'packType' = 'responsive_festival_hero'
  and nullif(p.manifest_json->>'festivalSlug', '') is not null
group by p.manifest_json->>'festivalSlug'
on conflict (festival_slug) do update set
  festival_name = excluded.festival_name,
  source_status = 'ready',
  source_message = excluded.source_message,
  default_variant_slug = coalesce(festival_hero_groups.default_variant_slug, excluded.default_variant_slug),
  updated_at = now();

-- Holi is a confirmed source gap in this package; never fabricate a pack.
insert into festival_hero_groups (
  festival_name, festival_slug, source_status, source_message, created_at, updated_at
) values (
  'Holi', 'holi', 'source_required',
  'Festivals.zip contains no approved Holi source artwork.', now(), now()
)
on conflict (festival_slug) do update set
  source_status = 'source_required',
  source_message = excluded.source_message,
  updated_at = now();

commit;
