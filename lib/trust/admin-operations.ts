import "server-only";

import { dbQuery } from "@/lib/db";
import { deleteFileFromS3 } from "@/lib/storage/s3";
import { getTrustProviderStatus } from "@/lib/trust/providers";
import { maskTrustIdentifier } from "@/lib/trust/reporting-validation";

export type AdminSuspiciousReport = {
  id: string;
  reference: string;
  reportType: string;
  maskedIdentifier: string;
  relatedReference: string | null;
  description: string;
  customerEmail: string;
  maskedCustomerMobile: string | null;
  status: "received" | "under_review" | "resolved" | "dismissed";
  notificationStatus: "pending" | "sent" | "failed";
  evidenceFileAssetId: string | null;
  evidenceRevokedAt: string | null;
  createdAt: string;
};

type ReportRow = {
  id: string;
  report_reference: string;
  report_type: string;
  reported_identifier: string;
  related_reference: string | null;
  description: string;
  customer_email: string;
  customer_mobile: string | null;
  status: AdminSuspiciousReport["status"];
  notification_status: AdminSuspiciousReport["notificationStatus"];
  evidence_file_asset_id: string | null;
  evidence_revoked_at: Date | null;
  created_at: Date;
};

export async function listSuspiciousReportsForAdmin(limit = 100) {
  const result = await dbQuery<ReportRow>(
    `
      select id, report_reference, report_type, reported_identifier,
             related_reference, description, customer_email, customer_mobile,
             status, notification_status, evidence_file_asset_id,
             evidence_revoked_at, created_at
      from trust_suspicious_reports
      order by created_at desc
      limit $1
    `,
    [Math.min(Math.max(limit, 1), 250)]
  );

  return result.rows.map(
    (row): AdminSuspiciousReport => ({
      id: row.id,
      reference: row.report_reference,
      reportType: row.report_type,
      maskedIdentifier: maskTrustIdentifier(row.reported_identifier),
      relatedReference: row.related_reference,
      description: row.description,
      customerEmail: row.customer_email,
      maskedCustomerMobile: row.customer_mobile
        ? maskTrustIdentifier(row.customer_mobile)
        : null,
      status: row.status,
      notificationStatus: row.notification_status,
      evidenceFileAssetId: row.evidence_file_asset_id,
      evidenceRevokedAt: row.evidence_revoked_at?.toISOString() || null,
      createdAt: row.created_at.toISOString()
    })
  );
}

export async function updateSuspiciousReportStatus({
  reportId,
  status
}: {
  reportId: string;
  status: AdminSuspiciousReport["status"];
}) {
  const result = await dbQuery<ReportRow>(
    `
      update trust_suspicious_reports
      set status = $2
      where id = $1
      returning id, report_reference, report_type, reported_identifier,
                related_reference, description, customer_email, customer_mobile,
                status, notification_status, evidence_file_asset_id,
                evidence_revoked_at, created_at
    `,
    [reportId, status]
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    reference: row.report_reference,
    reportType: row.report_type,
    maskedIdentifier: maskTrustIdentifier(row.reported_identifier),
    relatedReference: row.related_reference,
    description: row.description,
    customerEmail: row.customer_email,
    maskedCustomerMobile: row.customer_mobile
      ? maskTrustIdentifier(row.customer_mobile)
      : null,
    status: row.status,
    notificationStatus: row.notification_status,
    evidenceFileAssetId: row.evidence_file_asset_id,
    evidenceRevokedAt: row.evidence_revoked_at?.toISOString() || null,
    createdAt: row.created_at.toISOString()
  } satisfies AdminSuspiciousReport;
}

export async function revokeSuspiciousReportEvidence({
  reportId,
  adminUserId,
  reason
}: {
  reportId: string;
  adminUserId: string;
  reason: string;
}) {
  const result = await dbQuery<{
    file_asset_id: string | null;
    s3_key: string | null;
    evidence_revoked_at: Date | null;
  }>(
    `
      select
        report.evidence_file_asset_id as file_asset_id,
        asset.s3_key,
        report.evidence_revoked_at
      from trust_suspicious_reports report
      left join file_assets asset on asset.id = report.evidence_file_asset_id
      where report.id = $1
      limit 1
    `,
    [reportId]
  );
  const evidence = result.rows[0];
  if (!evidence) return null;
  if (evidence.evidence_revoked_at) {
    return {
      revoked: true,
      alreadyRevoked: true,
      fileAssetId: evidence.file_asset_id,
      revokedAt: evidence.evidence_revoked_at.toISOString()
    };
  }
  if (!evidence.file_asset_id || !evidence.s3_key) {
    return {
      revoked: false,
      alreadyRevoked: false,
      fileAssetId: null,
      revokedAt: null
    };
  }

  await deleteFileFromS3(evidence.s3_key);
  const revoked = await dbQuery<{ evidence_revoked_at: Date }>(
    `
      update trust_suspicious_reports
      set evidence_revoked_at = now(),
          evidence_revoked_by_admin_id = $2,
          evidence_revocation_reason = $3,
          updated_at = now()
      where id = $1 and evidence_revoked_at is null
      returning evidence_revoked_at
    `,
    [reportId, adminUserId, reason]
  );

  return {
    revoked: true,
    alreadyRevoked: false,
    fileAssetId: evidence.file_asset_id,
    revokedAt: revoked.rows[0]?.evidence_revoked_at.toISOString() || null
  };
}

export async function getTrustOperationsSummary() {
  const [reportResult, verificationResult, healthResult] = await Promise.all([
    dbQuery<{ status: string; count: string }>(
      `
        select status, count(*)::text as count
        from trust_suspicious_reports
        group by status
      `
    ),
    dbQuery<{ verification_type: string; count: string }>(
      `
        select verification_type, count(*)::text as count
        from trust_verification_events
        where created_at >= now() - interval '30 days'
        group by verification_type
      `
    ),
    dbQuery<{
      system: string;
      endpoint: string;
      status: string;
      created_at: Date;
    }>(
      `
        select distinct on (system, endpoint)
               system, endpoint, status, created_at
        from integration_logs
        where system in ('lts', 'pmt', 'trust_centre', 'amazon_ses', 'aws_s3')
        order by system, endpoint, created_at desc
      `
    )
  ]);

  return {
    providers: getTrustProviderStatus(),
    reports: Object.fromEntries(
      reportResult.rows.map((row) => [row.status, Number(row.count)])
    ),
    verifications30Days: Object.fromEntries(
      verificationResult.rows.map((row) => [
        row.verification_type,
        Number(row.count)
      ])
    ),
    externalHealth: healthResult.rows.map((row) => ({
      system: row.system,
      endpoint: row.endpoint,
      status: row.status,
      checkedAt: row.created_at.toISOString()
    }))
  };
}
