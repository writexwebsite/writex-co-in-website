begin;

alter table file_assets
  drop constraint if exists file_assets_asset_type_check;

alter table file_assets
  add constraint file_assets_asset_type_check
  check (
    asset_type in (
      'quote_brief',
      'rubric',
      'draft',
      'sop_prompt',
      'dissertation_chapter',
      'payment_proof',
      'preview',
      'final_delivery',
      'revision_attachment',
      'trust_report_evidence',
      'other'
    )
  );

create table if not exists trust_verification_events (
  id uuid primary key default gen_random_uuid(),
  verification_reference text not null unique,
  verification_type text not null,
  result text not null,
  masked_input text not null,
  correlation_id text not null,
  data_source text not null,
  verified_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (verification_type in ('representative', 'invoice', 'payment', 'enquiry')),
  check (result in ('verified', 'not_verified', 'unavailable'))
);

create table if not exists trust_suspicious_reports (
  id uuid primary key default gen_random_uuid(),
  report_reference text not null unique,
  report_type text not null,
  reported_identifier text not null,
  related_reference text,
  description text not null,
  evidence_file_asset_id uuid references file_assets(id) on delete set null,
  customer_email text not null,
  customer_mobile text,
  status text not null default 'received',
  correlation_id text not null,
  submission_key text not null unique,
  notification_status text not null default 'pending',
  notification_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    report_type in (
      'Unknown representative',
      'Different payment details',
      'Personal UPI or bank request',
      'Fake invoice',
      'Fake QR code',
      'Brand impersonation',
      'Suspicious WhatsApp or email',
      'Other'
    )
  ),
  check (status in ('received', 'under_review', 'resolved', 'dismissed')),
  check (notification_status in ('pending', 'sent', 'failed'))
);

create index if not exists trust_verification_type_created_idx
  on trust_verification_events(verification_type, created_at desc);
create index if not exists trust_suspicious_reports_status_idx
  on trust_suspicious_reports(status, created_at desc);
create index if not exists trust_suspicious_reports_created_idx
  on trust_suspicious_reports(created_at desc);

drop trigger if exists set_trust_suspicious_reports_updated_at
  on trust_suspicious_reports;
create trigger set_trust_suspicious_reports_updated_at
before update on trust_suspicious_reports
for each row execute function set_updated_at();

commit;
