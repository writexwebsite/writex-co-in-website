create table if not exists admin_feature_notice_state (
  admin_user_id uuid not null references admin_users(id) on delete cascade,
  notice_key text not null,
  dismissed_at timestamptz not null default now(),
  primary key (admin_user_id, notice_key)
);

revoke all on admin_feature_notice_state from public;
