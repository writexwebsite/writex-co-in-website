begin;

create table if not exists festival_asset_review_batches (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  display_name text not null,
  status text not null default 'visual_review_required'
    check (status in ('visual_review_required','in_review','review_complete','archived')),
  manifest_checksum_sha256 text not null,
  total_items integer not null check (total_items > 0),
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists festival_asset_review_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references festival_asset_review_batches(id) on delete restrict,
  stable_asset_id text not null,
  display_name text not null,
  festival_slug text not null,
  festival_name text not null,
  category text not null check (category in ('header','ground','axo','ambient','feature')),
  subcategory text not null,
  source_s3_key text not null,
  thumbnail_s3_key text not null,
  checksum_sha256 text not null,
  mime_type text not null,
  width integer not null,
  height integer not null,
  metadata_json jsonb not null default '{}'::jsonb,
  review_state text not null default 'visual_review_required'
    check (review_state in ('visual_review_required','approved','rejected','improvement_requested','hidden','source_required')),
  review_note text,
  reviewed_by uuid references admin_users(id) on delete set null,
  reviewed_at timestamptz,
  promoted_library_asset_id uuid references festival_asset_library(id) on delete restrict,
  promoted_version_asset_id uuid references holiday_theme_assets(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, stable_asset_id)
);

create table if not exists festival_asset_review_audit (
  id uuid primary key default gen_random_uuid(),
  review_item_id uuid not null references festival_asset_review_items(id) on delete restrict,
  actor_admin_user_id uuid references admin_users(id) on delete set null,
  action text not null,
  previous_state text,
  next_state text,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists festival_asset_review_items_queue_idx
  on festival_asset_review_items (batch_id, review_state, festival_slug, category, created_at);
create index if not exists festival_asset_review_items_filter_idx
  on festival_asset_review_items (festival_slug, category, review_state);
create index if not exists festival_asset_review_audit_item_idx
  on festival_asset_review_audit (review_item_id, created_at desc);

revoke all on festival_asset_review_batches from public;
revoke all on festival_asset_review_items from public;
revoke all on festival_asset_review_audit from public;

commit;
