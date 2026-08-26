const jobSecret = process.env.JOB_SECRET;
const internalAppUrl = (
  process.env.WRITEX_INTERNAL_APP_URL || "http://127.0.0.1:3002"
).replace(/\/$/u, "");
const dryRun = process.argv.includes("--dry-run");

if (!jobSecret) {
  console.error(
    JSON.stringify({ ok: false, failureReason: "job_not_configured" })
  );
  process.exit(1);
}

try {
  const response = await fetch(
    `${internalAppUrl}/api/jobs/representative-sync${dryRun ? "?dryRun=true" : ""}`,
    {
      method: "POST",
      headers: { "x-job-secret": jobSecret },
      signal: AbortSignal.timeout(60_000)
    }
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    console.error(
      JSON.stringify({
        ok: false,
        status: response.status,
        failureReason: payload?.error?.code || "job_request_failed",
        timestamp: new Date().toISOString()
      })
    );
    process.exit(1);
  }

  const data = payload.data || {};
  console.log(
    JSON.stringify({
      ok: true,
      dryRun: Boolean(data.dryRun),
      received: Number(data.received || 0),
      accepted: data.accepted == null ? undefined : Number(data.accepted),
      created: data.created == null ? undefined : Number(data.created),
      updated: data.updated == null ? undefined : Number(data.updated),
      deactivated:
        data.deactivated == null ? undefined : Number(data.deactivated),
      rejected: Number(data.rejected || 0),
      timestamp: new Date().toISOString()
    })
  );
} catch {
  console.error(
    JSON.stringify({
      ok: false,
      failureReason: "job_request_failed",
      timestamp: new Date().toISOString()
    })
  );
  process.exit(1);
}
