const base = process.env.MY_WRITEX_UAT_BASE_URL || "http://127.0.0.1:3000";

function cookieFrom(response) {
  return (response.headers.get("set-cookie") || "").split(";")[0];
}

async function login(identifier, phone) {
  const response = await fetch(`${base}/api/client/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ invoiceId: identifier, whatsapp: phone }),
  });
  if (response.status !== 200) throw new Error(`Login failed for ${identifier}: ${response.status}`);
  return cookieFrom(response);
}

async function call(path, { cookie, method = "GET", body, redirect = "manual" } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    redirect,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await response.json(); } catch { /* A redirect or not-found response may not be JSON. */ }
  return { status: response.status, location: response.headers.get("location"), json };
}

function requirement(idempotencyKey, overrides = {}) {
  return {
    idempotencyKey,
    source: "new_requirement",
    fields: {
      service: "Assignment Support",
      category: "Report",
      title: "Customer B isolation fixture",
      subject: "Business",
      module: "QA101",
      institution: "Local UAT University",
      course: "Local UAT Programme",
      scope: "1,200-word structured report",
      wordCount: "1200",
      deadlineDate: "2026-10-30",
      deadlineTime: "17:00",
      timezone: "Asia/Calcutta",
      urgency: "Standard",
      context: "Local auth-scope test only",
      expectedDeliverable: "Structured report document",
      detailedBrief: "Create a local fixture requirement that is long enough to pass validation.",
      fileNote: "",
    },
    files: [],
    ...overrides,
  };
}

const cookieA = await login("rahulsharma.7k2", "+44 7700 900001");
const cookieB = await login("sarahjones.9m4", "+44 7700 900002");
const cookieInvoice = await login("WX-MW-1001", "+44 7700 900001");

const bKey = `stage3a:qa:b:${Date.now()}`;
const bDraft = await call("/api/my-writex/requests", { cookie: cookieB, method: "POST", body: { operation: "save_draft", ...requirement(bKey) } });
const bRequestId = bDraft.json?.data?.request?.id;
const bSubmit = await call("/api/my-writex/requests", { cookie: cookieB, method: "POST", body: { operation: "submit", ...requirement(bKey, { requestId: bRequestId }) } });
const bRepeat = await call("/api/my-writex/requests", { cookie: cookieB, method: "POST", body: { operation: "submit", ...requirement(bKey, { requestId: bRequestId }) } });
const bRef = bSubmit.json?.data?.request?.publicReference;

const aList = await call("/api/my-writex/requests", { cookie: cookieA });
const aRef = aList.json?.data?.requests?.find((request) => request.publicReference?.startsWith("REQ-"))?.publicReference;
const readyForDiscussion = await call(`/api/dev/my-writex-requests/${encodeURIComponent(aRef)}`, { method: "PATCH", body: { type: "status", status: "Ready for Discussion" } });
const internalNote = await call(`/api/dev/my-writex-requests/${encodeURIComponent(aRef)}`, { method: "PATCH", body: { type: "internal_note", body: "Local UAT readiness note — no customer text or PII." } });
const customerViewAfterInternalNote = await call(`/api/my-writex/requests/${encodeURIComponent(aRef)}`, { cookie: cookieA });
const cancelledB = await call(`/api/my-writex/requests/${encodeURIComponent(bRef)}`, { cookie: cookieB, method: "PATCH", body: { operation: "cancel" } });
const cancelledBAgain = await call(`/api/my-writex/requests/${encodeURIComponent(bRef)}`, { cookie: cookieB, method: "PATCH", body: { operation: "cancel" } });
const invalidSimilar = await call("/api/my-writex/requests", { cookie: cookieA, method: "POST", body: { operation: "save_draft", ...requirement("stage3a:qa:bad-project", { source: "similar_project", sourceProjectId: "project-other-customer" }) } });
const invalidUpcoming = await call("/api/my-writex/requests", { cookie: cookieA, method: "POST", body: { operation: "save_draft", ...requirement("stage3a:qa:bad-upcoming", { source: "upcoming_work", sourceUpcomingId: "upcoming-other-customer" }) } });

const upcomingKey = `stage3a:qa:upcoming-duplicate:${Date.now()}`;
const upcomingPayload = requirement(upcomingKey, { source: "upcoming_work", sourceUpcomingId: "upcoming-2", sourceUpcomingTitle: "ignored" });
const upcomingDraft = await call("/api/my-writex/requests", { cookie: cookieA, method: "POST", body: { operation: "save_draft", ...upcomingPayload } });
const upcomingDuplicate = await call("/api/my-writex/requests", { cookie: cookieA, method: "POST", body: { operation: "submit", ...upcomingPayload, requestId: upcomingDraft.json?.data?.request?.id } });

const checks = {
  unauthenticated_customer_list: (await call("/api/my-writex/requests")).status,
  expired_or_invalid_session: (await call("/api/my-writex/requests", { cookie: "writex_client_session_local=expired-session-token" })).status,
  protected_customer_page_redirect: await call("/my-writex/requests"),
  invoice_to_customer_list: (await call("/api/my-writex/requests", { cookie: cookieInvoice })).status,
  invoice_own_requests: (await call("/api/client/requests", { cookie: cookieInvoice })).status,
  invoice_to_other_invoice: (await call("/api/client/invoices/WX-MW-0951", { cookie: cookieInvoice })).status,
  customer_to_invoice_requests: (await call("/api/client/requests", { cookie: cookieA })).status,
  customer_a_to_customer_b_request: (await call(`/api/my-writex/requests/${encodeURIComponent(bRef)}`, { cookie: cookieA })).status,
  customer_b_to_customer_a_request: (await call(`/api/my-writex/requests/${encodeURIComponent(aRef)}`, { cookie: cookieB })).status,
  unauthenticated_request_detail: (await call(`/api/my-writex/requests/${encodeURIComponent(aRef)}`)).status,
  manipulated_request_reference: (await call("/api/my-writex/requests/REQ-2026-9999", { cookie: cookieA })).status,
  manipulated_similar_project: invalidSimilar.status,
  manipulated_upcoming_item: invalidUpcoming.status,
  customer_b_create: bSubmit.status,
  ready_for_discussion: { status: readyForDiscussion.status, value: readyForDiscussion.json?.data?.request?.status },
  internal_note: internalNote.status,
  customer_view_hides_internal: !JSON.stringify(customerViewAfterInternalNote.json).includes("Local UAT readiness note") && !JSON.stringify(customerViewAfterInternalNote.json).includes("customerMasterId") && !JSON.stringify(customerViewAfterInternalNote.json).includes("idempotencyKey"),
  repeated_cancel: { first: cancelledB.json?.data?.request?.status, second: cancelledBAgain.json?.data?.request?.status },
  repeated_submit: { status: bRepeat.status, created: bRepeat.json?.data?.created, sameReference: bRepeat.json?.data?.request?.publicReference === bRef },
  upcoming_duplicate: { status: upcomingDuplicate.status, created: upcomingDuplicate.json?.data?.created, reference: upcomingDuplicate.json?.data?.request?.publicReference },
};

const expected = {
  unauthenticated_customer_list: 401,
  expired_or_invalid_session: 401,
  invoice_to_customer_list: 403,
  invoice_own_requests: 200,
  customer_to_invoice_requests: 403,
  customer_a_to_customer_b_request: 404,
  customer_b_to_customer_a_request: 404,
  unauthenticated_request_detail: 401,
  manipulated_request_reference: 404,
  manipulated_similar_project: 403,
  manipulated_upcoming_item: 403,
  customer_b_create: 201,
};

const failures = Object.entries(expected).filter(([key, value]) => checks[key] !== value);
if (!checks.protected_customer_page_redirect.location?.includes("/client-login")) failures.push(["protected_customer_page_redirect", checks.protected_customer_page_redirect]);
if (checks.repeated_submit.status !== 200 || checks.repeated_submit.created !== false || !checks.repeated_submit.sameReference) failures.push(["repeated_submit", checks.repeated_submit]);
if (checks.upcoming_duplicate.status !== 200 || checks.upcoming_duplicate.created !== false) failures.push(["upcoming_duplicate", checks.upcoming_duplicate]);
if (checks.ready_for_discussion.status !== 200 || checks.ready_for_discussion.value !== "Ready for Discussion") failures.push(["ready_for_discussion", checks.ready_for_discussion]);
if (checks.internal_note !== 200) failures.push(["internal_note", checks.internal_note]);
if (!checks.customer_view_hides_internal) failures.push(["customer_view_hides_internal", checks.customer_view_hides_internal]);
if (checks.repeated_cancel.first !== "Cancelled" || checks.repeated_cancel.second !== "Cancelled") failures.push(["repeated_cancel", checks.repeated_cancel]);

console.log(JSON.stringify({ ok: failures.length === 0, checks, failures }, null, 2));
if (failures.length) process.exitCode = 1;
