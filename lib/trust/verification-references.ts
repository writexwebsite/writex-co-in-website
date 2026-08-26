import "server-only";

import { randomBytes } from "crypto";
import { dbQuery } from "@/lib/db";

export type TrustVerificationType =
  | "representative"
  | "invoice"
  | "payment"
  | "enquiry";

function createReference(prefix: "WX-VRF" | "WX-FR") {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function createVerificationReferenceValue() {
  return createReference("WX-VRF");
}

export function createFraudReportReferenceValue() {
  return createReference("WX-FR");
}

export async function recordSuccessfulVerification({
  verificationType,
  maskedInput,
  correlationId,
  dataSource,
  expiresAt
}: {
  verificationType: TrustVerificationType;
  maskedInput: string;
  correlationId: string;
  dataSource: string;
  expiresAt?: Date | null;
}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const verificationReference = createVerificationReferenceValue();
    const result = await dbQuery<{ verification_reference: string; verified_at: Date }>(
      `
        insert into trust_verification_events (
          verification_reference,
          verification_type,
          result,
          masked_input,
          correlation_id,
          data_source,
          expires_at
        )
        values ($1, $2, 'verified', $3, $4, $5, $6)
        on conflict (verification_reference) do nothing
        returning verification_reference, verified_at
      `,
      [
        verificationReference,
        verificationType,
        maskedInput,
        correlationId,
        dataSource,
        expiresAt ?? null
      ]
    );

    if (result.rows[0]) return result.rows[0];
  }

  throw new Error("A verification reference could not be generated.");
}

export async function getOrCreateSuccessfulVerification({
  verificationType,
  maskedInput,
  correlationId,
  dataSource,
  expiresAt
}: {
  verificationType: TrustVerificationType;
  maskedInput: string;
  correlationId: string;
  dataSource: string;
  expiresAt?: Date | null;
}) {
  const existing = await dbQuery<{
    verification_reference: string;
    verified_at: Date;
  }>(
    `
      select verification_reference, verified_at
      from trust_verification_events
      where verification_type = $1
        and result = 'verified'
        and correlation_id = $2
        and data_source = $3
      order by verified_at desc
      limit 1
    `,
    [verificationType, correlationId, dataSource]
  );

  if (existing.rows[0]) return existing.rows[0];

  return recordSuccessfulVerification({
    verificationType,
    maskedInput,
    correlationId,
    dataSource,
    expiresAt
  });
}
