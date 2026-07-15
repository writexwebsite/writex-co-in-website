import "server-only";

import { Pool, type QueryResultRow } from "pg";

const globalForPg = globalThis as typeof globalThis & {
  writexPgPool?: Pool;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabasePool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalForPg.writexPgPool) {
    globalForPg.writexPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 5000),
      idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 30000),
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" }
    });
  }

  return globalForPg.writexPgPool;
}

export async function dbQuery<T extends QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  const result = await getDatabasePool().query<T>(text, values);

  return result;
}

export async function optionalDbQuery<T extends QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  if (!isDatabaseConfigured()) return null;

  return dbQuery<T>(text, values);
}

export async function withDbTransaction<T>(
  callback: (query: <R extends QueryResultRow>(text: string, values?: unknown[]) => Promise<R[]>) => Promise<T>
) {
  const client = await getDatabasePool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(async <R extends QueryResultRow>(
      text: string,
      values: unknown[] = []
    ) => {
      const queryResult = await client.query<R>(text, values);

      return queryResult.rows;
    });
    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type QuoteLeadInsert = {
  name: string;
  email?: string;
  whatsapp: string;
  country: string;
  serviceRequired: string;
  academicLevel: string;
  subject: string;
  wordCount?: number;
  deadline: string;
  instructions: string;
  documentCondition?: string;
  referencingStyle?: string;
  urgency?: string;
  rubricAvailable?: string;
  draftAvailable?: string;
  supervisorCommentsAvailable?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  leadIntelligence?: unknown;
  uploadedFileAssetId?: string | null;
  source: string;
  status?: string;
  leadPriority?: string;
  leadQuality?: string;
  pagePath?: string;
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  deviceType?: string;
  sourceChannel?: string;
};

export type QuoteFileAsset = {
  id: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  asset_type: string;
  quote_lead_id: string | null;
};

export async function getQuoteFileAsset(fileAssetId: string) {
  const result = await dbQuery<QuoteFileAsset>(
    `
      select id, file_name, mime_type, file_size, asset_type, quote_lead_id
      from file_assets
      where id = $1
        and quote_lead_id is null
        and asset_type in (
          'quote_brief',
          'rubric',
          'draft',
          'sop_prompt',
          'dissertation_chapter',
          'other'
        )
      limit 1
    `,
    [fileAssetId]
  );

  return result.rows[0] ?? null;
}

export async function linkFileAssetToQuoteLead({
  fileAssetId,
  quoteLeadId
}: {
  fileAssetId: string;
  quoteLeadId: string;
}) {
  await dbQuery(
    `
      update file_assets
      set quote_lead_id = $2
      where id = $1
        and (quote_lead_id is null or quote_lead_id = $2)
    `,
    [fileAssetId, quoteLeadId]
  );
}

export async function insertQuoteLead(lead: QuoteLeadInsert) {
  const result = await dbQuery<{ id: string; created_at: Date }>(
    `
      insert into quote_leads (
        name,
        email,
        whatsapp,
        country,
        service_required,
        academic_level,
        subject,
        word_count,
        deadline,
        instructions,
        document_condition,
        referencing_style,
        urgency,
        rubric_available,
        draft_available,
        supervisor_comments_available,
        file_name,
        file_size,
        file_type,
        lead_intelligence,
        uploaded_file_asset_id,
        source,
        status,
        lead_priority,
        lead_quality,
        page_path,
        landing_page,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        device_type,
        source_channel
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
      returning id, created_at
    `,
    [
      lead.name,
      lead.email || null,
      lead.whatsapp,
      lead.country,
      lead.serviceRequired,
      lead.academicLevel,
      lead.subject,
      lead.wordCount ?? null,
      lead.deadline,
      lead.instructions,
      lead.documentCondition ?? null,
      lead.referencingStyle ?? null,
      lead.urgency ?? null,
      lead.rubricAvailable ?? null,
      lead.draftAvailable ?? null,
      lead.supervisorCommentsAvailable ?? null,
      lead.fileName ?? null,
      lead.fileSize ?? null,
      lead.fileType ?? null,
      lead.leadIntelligence ? JSON.stringify(lead.leadIntelligence) : null,
      lead.uploadedFileAssetId ?? null,
      lead.source,
      lead.status ?? "new",
      lead.leadPriority ?? "normal",
      lead.leadQuality ?? "unqualified",
      lead.pagePath ?? null,
      lead.landingPage ?? null,
      lead.referrer ?? null,
      lead.utmSource ?? null,
      lead.utmMedium ?? null,
      lead.utmCampaign ?? null,
      lead.utmTerm ?? null,
      lead.utmContent ?? null,
      lead.deviceType ?? null,
      lead.sourceChannel ?? null
    ]
  );

  return result.rows[0];
}
