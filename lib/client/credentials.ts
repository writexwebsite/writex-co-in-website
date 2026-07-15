import "server-only";

import bcrypt from "bcryptjs";
import { notConfigured } from "@/lib/api/response";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { randomToken } from "@/lib/security";

export function normalizeInvoiceId(value: string) { return value.trim().toUpperCase(); }
export function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function peppered(value: string) {
  const pepper = process.env.CLIENT_ACCESS_CODE_PEPPER;
  if (!pepper) throw notConfigured("Client access-code security is not configured.");
  return `${value}${pepper}`;
}

export async function verifyClientAccessCode(invoiceId: string, whatsapp: string, accessCode: string) {
  if (!isDatabaseConfigured()) throw notConfigured("Client credential storage is not configured.");
  const normalizedInvoice = normalizeInvoiceId(invoiceId);
  const normalizedWhatsapp = normalizeWhatsapp(whatsapp);
  const result = await dbQuery<{ id: string; access_code_hash: string; is_active: boolean; failed_attempt_count: number; locked_until: string | null }>(`
    select id, access_code_hash, is_active, failed_attempt_count, locked_until
    from client_portal_credentials where invoice_id = $1 and whatsapp_normalized = $2 limit 1
  `, [normalizedInvoice, normalizedWhatsapp]);
  const credential = result.rows[0];
  const locked = credential?.locked_until && new Date(credential.locked_until).getTime() > Date.now();
  const valid = Boolean(credential && credential.is_active && !locked && await bcrypt.compare(peppered(accessCode), credential.access_code_hash));

  if (!valid) {
    if (credential) {
      const maxAttempts = Number(process.env.CLIENT_LOGIN_MAX_ATTEMPTS || 6);
      const lockMinutes = Number(process.env.CLIENT_LOGIN_LOCK_MINUTES || 15);
      const next = credential.failed_attempt_count + 1;
      await dbQuery(`update client_portal_credentials set failed_attempt_count = $2, locked_until = case when $2 >= $3 then now() + ($4 || ' minutes')::interval else locked_until end, updated_at = now() where id = $1`, [credential.id, next, maxAttempts, lockMinutes]);
    }
    return false;
  }

  await dbQuery("update client_portal_credentials set failed_attempt_count = 0, locked_until = null, last_login_at = now(), updated_at = now() where id = $1", [credential!.id]);
  return true;
}

export async function createOrRotateClientAccessCode(invoiceId: string, whatsapp: string, adminUserId?: string) {
  if (!isDatabaseConfigured()) throw notConfigured("Client credential storage is not configured.");
  const accessCode = randomToken(9).replace(/[-_]/g, "A").slice(0, 12);
  const hash = await bcrypt.hash(peppered(accessCode), 12);
  await dbQuery(`
    insert into client_portal_credentials (invoice_id, whatsapp_normalized, access_code_hash, created_by_admin_user_id)
    values ($1, $2, $3, $4)
    on conflict (invoice_id) do update set whatsapp_normalized = excluded.whatsapp_normalized, access_code_hash = excluded.access_code_hash, is_active = true, failed_attempt_count = 0, locked_until = null, code_rotated_at = now(), updated_at = now()
  `, [normalizeInvoiceId(invoiceId), normalizeWhatsapp(whatsapp), hash, adminUserId ?? null]);
  return accessCode;
}
