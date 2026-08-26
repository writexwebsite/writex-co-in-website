create table if not exists designer_hero_packs (
  id uuid primary key default gen_random_uuid(),
  festival_pack_id uuid not null unique references festival_pack_imports(id) on delete restrict,
  theme_id uuid not null references holiday_themes(id) on delete restrict,
  festival_slug text not null,
  variant_slug text not null,
  display_name text not null,
  target_support text not null check (target_support in ('client','employee','both')),
  source_s3_key text not null,
  source_file_name text not null,
  source_checksum_sha256 text not null,
  source_width integer not null,
  source_height integer not null,
  mobile_source_s3_key text,
  focal_points jsonb not null default '{"desktop":{"x":50,"y":50},"tablet":{"x":50,"y":50},"mobile":{"x":50,"y":50}}'::jsonb,
  overlay_mode text not null default 'auto' check (overlay_mode in ('light_safe','dark_safe','auto')),
  form_placement text not null default 'right' check (form_placement in ('left','right')),
  status text not null default 'draft' check (status in ('draft','ready','approved','active','archived')),
  notes text,
  artwork_only_confirmed boolean not null default false,
  created_by uuid not null references admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (festival_slug, variant_slug, festival_pack_id)
);

create table if not exists designer_hero_pack_derivatives (
  id uuid primary key default gen_random_uuid(),
  designer_hero_pack_id uuid not null references designer_hero_packs(id) on delete restrict,
  width integer not null,
  format text not null check (format in ('avif','webp','jpeg')),
  s3_key text not null,
  file_size bigint not null,
  checksum_sha256 text not null,
  created_at timestamptz not null default now(),
  unique (designer_hero_pack_id, width, format)
);

create index if not exists designer_hero_pack_scope_idx
  on designer_hero_packs(festival_slug, variant_slug, status);

revoke all on designer_hero_packs from public;
revoke all on designer_hero_pack_derivatives from public;
