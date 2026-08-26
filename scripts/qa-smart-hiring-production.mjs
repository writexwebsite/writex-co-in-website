import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightPath = process.env.PLAYWRIGHT_CORE_PATH;
if (!playwrightPath) throw new Error("PLAYWRIGHT_CORE_PATH is required.");
const { chromium } = await import(pathToFileURL(playwrightPath).href);
const baseUrl = process.env.QA_BASE_URL || "https://www.writex.co.in";
const chromePath = process.env.QA_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputDirectory = process.env.QA_SCREENSHOT_DIR || path.resolve("docs/smart-hiring-qa");
const mode = process.argv[2] || "public";
await fs.mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const results = { mode, consoleErrors: [], checks: [] };

function observeConsole(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") results.consoleErrors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => results.consoleErrors.push(`${label}: ${error.message}`));
}

async function auditResponsiveRoutes() {
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "laptop", width: 1024, height: 768 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile390", width: 390, height: 844 },
    { name: "mobile360", width: 360, height: 800 }
  ];
  const routes = ["/careers", "/careers/academic-writer", "/careers/sales-executive", "/careers/application-status"];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: "light" });
    const page = await context.newPage();
    observeConsole(page, viewport.name);
    for (const route of routes) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      const metrics = await page.evaluate(() => ({
        h1: document.querySelector("h1")?.textContent?.trim() || "",
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      }));
      results.checks.push({ route, viewport: viewport.name, status: response?.status(), ...metrics });
      if (route === "/careers") {
        await page.screenshot({ path: path.join(outputDirectory, `careers-${viewport.name}.png`), fullPage: true });
      }
    }
    await context.close();
  }
  const darkContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  const darkPage = await darkContext.newPage();
  observeConsole(darkPage, "dark-mobile");
  const darkResponse = await darkPage.goto(`${baseUrl}/careers`, { waitUntil: "networkidle" });
  const darkOverflow = await darkPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  results.checks.push({ route: "/careers", viewport: "dark-mobile", status: darkResponse?.status(), overflow: darkOverflow });
  await darkPage.screenshot({ path: path.join(outputDirectory, "careers-dark-mobile.png"), fullPage: true });
  await darkContext.close();
}

const commonValues = {
  fullName: "WriteX QA Candidate",
  email: process.env.QA_CANDIDATE_EMAIL || "business@writex.co.in",
  mobile: process.env.QA_CANDIDATE_MOBILE || "9876543210",
  city: "Kolkata",
  state: "West Bengal"
};

async function chooseSearchable(page, name, label) {
  const root = page.locator(`input[type="hidden"][name="${name}"]`).locator("..");
  const combobox = root.getByRole("combobox");
  await combobox.fill(label);
  await combobox.press("Enter");
  if ((await root.locator(`input[type="hidden"][name="${name}"]`).inputValue()) === "") {
    throw new Error(`${name} did not accept ${label}.`);
  }
}

async function chooseMultiple(page, name, labels) {
  const root = page.locator(`input[type="hidden"][name="${name}"]`).locator("..");
  await root.locator("summary").click();
  for (const label of labels) await root.getByText(label, { exact: true }).click();
  await root.getByRole("button", { name: /^Finish selecting/ }).click();
}

async function fillApplication(page, role, suffix) {
  for (const [name, value] of Object.entries(commonValues)) {
    await page.locator(`[name="${name}"]`).fill(name === "fullName" ? `${value} ${suffix}` : value);
  }
  await chooseSearchable(page, "qualification", "Bachelor's Degree");
  await chooseSearchable(page, "currentEmploymentStatus", "Not currently employed");
  await chooseSearchable(page, "joiningAvailability", "Immediate");
  await chooseSearchable(page, "workMode", "Office");
  await page.locator('input[name="fullTimeCommitment"][value="Yes"]').check();
  await chooseSearchable(page, "referralSource", "WriteX website");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  if (role === "academic_writer") {
    await chooseMultiple(page, "subjectExpertise", ["Management"]);
    await chooseMultiple(page, "academicLevels", ["Undergraduate", "Postgraduate"]);
    await chooseSearchable(page, "writingExperience", "2-4 years");
    await chooseSearchable(page, "researchExperience", "Intermediate");
    await chooseSearchable(page, "editingExperience", "Intermediate");
    await chooseMultiple(page, "referencingStyles", ["APA", "Harvard"]);
    await chooseSearchable(page, "aiUsageSelection", "I do not use AI tools");
    await page.locator('[name="salaryExpectation"]').fill("25000");
  } else {
    await chooseSearchable(page, "totalExperience", "2-4 years");
    await chooseMultiple(page, "previousIndustry", ["Education"]);
    await chooseMultiple(page, "languages", ["English", "Hindi"]);
    await chooseSearchable(page, "languageProficiency", "Professional");
    await chooseMultiple(page, "communicationComfort", ["Voice calls", "WhatsApp/chat"]);
    await chooseMultiple(page, "leadHandling", ["Inbound leads"]);
    await chooseSearchable(page, "targetHistory", "INR 1-3 lakh");
    await chooseSearchable(page, "conversionExperience", "Direct conversion responsibility");
    await chooseMultiple(page, "objectionHandling", ["Price objection", "Trust objection"]);
    await chooseSearchable(page, "salaryStructure", "Fixed + incentive");
    await page.locator('[name="salaryExpectation"]').fill("25000");
  }
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

async function submitApplication(role, suffix, testInvalidFile = false) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const page = await context.newPage();
  observeConsole(page, role);
  await page.goto(`${baseUrl}/careers/${role === "academic_writer" ? "academic-writer" : "sales-executive"}`, { waitUntil: "networkidle" });
  await fillApplication(page, role, suffix);
  const cv = page.locator('input[name="cv"]');
  if (testInvalidFile) {
    await cv.setInputFiles({ name: "qa-disguised.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ-not-a-pdf") });
  } else {
    await cv.setInputFiles({ name: "qa-cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% WriteX sanitized QA\n%%EOF") });
  }
  if (role === "sales_executive") {
    await page.locator('input[name="voiceIntroduction"]').setInputFiles({ name: "qa-voice.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("ID3WriteX sanitized QA") });
  }
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.locator('input[name="knowsApplicantOrEmployee"][value="no"]').check();
  await page.locator('input[name="consent"]').check();
  await page.locator('input[name="assessmentMonitoringConsent"]').check();
  await page.locator('input[name="declaration"]').check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForTimeout(300);
  if (!(await page.getByRole("button", { name: "Submit Application" }).count())) {
    const validationMessage = (await page.locator('[role="alert"]:not(#__next-route-announcer__)').first().textContent().catch(() => "")) || "The review step did not open.";
    await page.screenshot({ path: path.join(outputDirectory, `${role}-review-step-error.png`), fullPage: true });
    throw new Error(`${role} review step failed: ${validationMessage}`);
  }
  await page.getByRole("button", { name: "Submit Application" }).click();
  if (testInvalidFile) {
    const alert = page.locator('[role="alert"]').filter({ hasText: "uploaded file content" });
    await alert.waitFor({ state: "visible" });
    results.checks.push({ invalidFileRejected: (await alert.textContent())?.includes("does not match") === true });
    await cv.setInputFiles({ name: "qa-cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% WriteX sanitized QA\n%%EOF") });
    await page.getByRole("button", { name: "Submit Application" }).click();
  }
  const submissionResult = await Promise.race([
    page.getByRole("heading", { name: "Application received" }).waitFor({ state: "visible", timeout: 30000 }).then(() => ({ ok: true, message: "" })),
    page.locator('[role="alert"]:not(#__next-route-announcer__)').first().waitFor({ state: "visible", timeout: 30000 }).then(async () => ({ ok: false, message: (await page.locator('[role="alert"]:not(#__next-route-announcer__)').first().textContent()) || "Unknown application error" }))
  ]);
  if (!submissionResult.ok) {
    await page.screenshot({ path: path.join(outputDirectory, `${role}-submission-error.png`), fullPage: true });
    throw new Error(`${role} submission failed: ${submissionResult.message}`);
  }
  const reference = (await page.locator("p.font-mono").textContent())?.trim();
  await page.screenshot({ path: path.join(outputDirectory, `${role}-submitted.png`), fullPage: true });
  if (!reference?.startsWith("WX-HR-")) throw new Error(`${role} did not return an application reference.`);
  await page.goto(`${baseUrl}/careers/application-status`, { waitUntil: "networkidle" });
  await page.locator('[name="applicationReference"]').fill(reference);
  await page.locator('[name="contact"]').fill(commonValues.email);
  await page.getByRole("button", { name: "Check status" }).click();
  await page.getByRole("heading", { name: "Application received" }).waitFor({ state: "visible" });
  await context.close();
  return reference;
}

async function runPublic() {
  await auditResponsiveRoutes();
  const writerReference = await submitApplication("academic_writer", "Writer", true);
  const salesReference = await submitApplication("sales_executive", "Sales", false);
  return { writerReference, salesReference };
}

async function adminFetch(page, url, body, method = "POST") {
  return page.evaluate(async ({ url, body, method }) => {
    const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, json: await response.json().catch(() => null) };
  }, { url, body, method });
}

async function loginAdmin(page, email, password) {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin/dashboard", { timeout: 30000 });
}

async function runPermissions() {
  const password = process.env.QA_ADMIN_PASSWORD;
  const writer = process.env.QA_WRITER_REFERENCE;
  const sales = process.env.QA_SALES_REFERENCE;
  const interviewerId = process.env.QA_INTERVIEWER_ID;
  if (!password || !writer || !sales || !interviewerId) throw new Error("Permission QA environment is incomplete.");
  const roles = [
    { key: "auditor", email: process.env.QA_AUDITOR_EMAIL || "qa-smart-hiring-auditor@writex.co.in" },
    { key: "assessor", email: process.env.QA_ASSESSOR_EMAIL || "qa-smart-hiring-assessor@writex.co.in" },
    { key: "interviewer", email: process.env.QA_INTERVIEWER_EMAIL || "qa-smart-hiring-interviewer@writex.co.in" }
  ];

  for (const role of roles) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 } });
    const page = await context.newPage();
    observeConsole(page, `permissions-${role.key}`);
    await loginAdmin(page, role.email, password);
    const applications = await page.goto(`${baseUrl}/admin/hiring/applications`, { waitUntil: "networkidle" });
    const applicationOperationVisible = await page.locator('form').filter({ has: page.locator('[name="applicationReference"]') }).count() > 0;
    const deniedApplicationMutation = await adminFetch(page, "/api/admin/hiring/operations", { resource:"application", applicationReference:writer, action:"add_note", note:"Sanitized role-boundary QA note.", reason:"Production permission QA" });

    if (role.key === "auditor") {
      const assessment = await page.goto(`${baseUrl}/admin/hiring/assessments`, { waitUntil: "networkidle" });
      const assessmentOperationVisible = await page.locator('form').filter({ has: page.locator('[name="applicationReference"]') }).count() > 0;
      results.checks.push({ role:role.key, applications:applications?.status(), assessment:assessment?.status(), applicationOperationVisible, assessmentOperationVisible, deniedApplicationMutation:deniedApplicationMutation.status });
    } else if (role.key === "assessor") {
      const assessment = await page.goto(`${baseUrl}/admin/hiring/assessments`, { waitUntil: "networkidle" });
      const assessmentOperationVisible = await page.locator('form').filter({ has: page.locator('[name="applicationReference"]') }).count() > 0;
      const score = await adminFetch(page, "/api/admin/hiring/operations", { resource:"assessment", applicationReference:writer, action:"score", humanScore:81, vivaScore:79, recommendation:"review", notes:"Sanitized assessor permission QA.", reason:"Production permission QA" });
      const deniedQuestion = await adminFetch(page, "/api/admin/hiring/questions", { role:"academic_writer", category:"permission_qa", section:"written", difficulty:"foundation", prompt:"This question must not be created by the assessor role.", variants:[], scoringRubric:{accuracy:100}, expectedCompetencies:["permission boundary"], active:false, changeReason:"Production permission QA" });
      results.checks.push({ role:role.key, applications:applications?.status(), assessment:assessment?.status(), applicationOperationVisible, assessmentOperationVisible, deniedApplicationMutation:deniedApplicationMutation.status, score:score.status, deniedQuestion:deniedQuestion.status });
    } else {
      const interviews = await page.goto(`${baseUrl}/admin/hiring/interviews`, { waitUntil: "networkidle" });
      const interviewOperationVisible = await page.locator('form').filter({ has: page.locator('[name="applicationReference"]') }).count() > 0;
      const schedule = await adminFetch(page, "/api/admin/hiring/operations", { resource:"interview", applicationReference:sales, action:"schedule", interviewType:"screening", interviewerAdminUserId:interviewerId, scheduledAt:new Date(Date.now()+72*3600000).toISOString(), durationMinutes:30, notes:"Sanitized interviewer permission QA.", reason:"Production permission QA" });
      const deniedAssessment = await adminFetch(page, "/api/admin/hiring/operations", { resource:"assessment", applicationReference:writer, action:"score", humanScore:80, recommendation:"review", notes:"Must be denied.", reason:"Production permission QA" });
      const deniedVerification = await adminFetch(page, "/api/admin/hiring/operations", { resource:"verification", applicationReference:sales, action:"open_case", verificationType:"employment", method:"manual_review", notes:"Must be denied by role boundary.", reason:"Production permission QA" });
      results.checks.push({ role:role.key, applications:applications?.status(), interviews:interviews?.status(), applicationOperationVisible, interviewOperationVisible, deniedApplicationMutation:deniedApplicationMutation.status, schedule:schedule.status, deniedAssessment:deniedAssessment.status, deniedVerification:deniedVerification.status });
    }
    await context.close();
  }
}

async function runNotifications() {
  const email = process.env.QA_ADMIN_EMAIL;
  const password = process.env.QA_ADMIN_PASSWORD;
  const adminId = process.env.QA_ADMIN_ID;
  const sales = process.env.QA_SALES_REFERENCE;
  const extra = process.env.QA_EXTRA_REFERENCE;
  if (!email || !password || !adminId || !sales || !extra) throw new Error("Notification QA environment is incomplete.");
  const context = await browser.newContext({ viewport: { width: 1024, height: 800 } });
  const page = await context.newPage();
  observeConsole(page, "notifications");
  await loginAdmin(page, email, password);
  const schedule = await adminFetch(page, "/api/admin/hiring/operations", { resource:"interview", applicationReference:sales, action:"schedule", interviewType:"screening", interviewerAdminUserId:adminId, scheduledAt:new Date(Date.now()+96*3600000).toISOString(), durationMinutes:30, notes:"Sanitized notification QA.", reason:"Production notification QA" });
  const interviewId = schedule.json?.data?.interviewId;
  const reschedule = interviewId ? await adminFetch(page, "/api/admin/hiring/operations", { resource:"interview", applicationReference:sales, action:"reschedule", interviewId, scheduledAt:new Date(Date.now()+120*3600000).toISOString(), notes:"Sanitized reschedule notice.", reason:"Production notification QA" }) : null;
  const additional = await adminFetch(page, "/api/admin/hiring/operations", { resource:"verification", applicationReference:sales, action:"decide", verificationType:"reference", decision:"additional_verification", notes:"Sanitized request for one additional verification document.", reason:"Production notification QA" });
  const selected = await adminFetch(page, "/api/admin/hiring/operations", { resource:"application", applicationReference:sales, action:"set_stage", stage:"selected", reason:"Production QA human selection notice" });
  const talent = await adminFetch(page, "/api/admin/hiring/operations", { resource:"application", applicationReference:sales, action:"set_stage", stage:"talent_pool", reason:"Production QA talent-pool notice" });
  const rejected = await adminFetch(page, "/api/admin/hiring/operations", { resource:"application", applicationReference:extra, action:"set_stage", stage:"rejected", reason:"Production QA human rejection notice" });
  const withdrawn = await adminFetch(page, "/api/admin/hiring/operations", { resource:"application", applicationReference:extra, action:"set_stage", stage:"withdrawn", reason:"Production QA withdrawal acknowledgement" });
  results.checks.push({ schedule:schedule.status, reschedule:reschedule?.status, additional:additional.status, selected:selected.status, talent:talent.status, rejected:rejected.status, withdrawn:withdrawn.status });
  await context.close();
}

async function runAccessibility() {
  const routes = ["/careers", "/careers/academic-writer", "/careers/sales-executive", "/careers/application-status", "/client-login", "/trust-centre"];
  for (const colorScheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme, reducedMotion: "reduce" });
    const page = await context.newPage();
    observeConsole(page, `accessibility-${colorScheme}`);
    for (const route of routes) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      const metrics = await page.evaluate(() => {
        const controls = [...document.querySelectorAll("input,select,textarea")].filter((control) => !control.hasAttribute("aria-hidden") && !control.closest("[aria-hidden]"));
        const missingLabelControls = controls.filter((control) => {
          const id = control.getAttribute("id");
          return !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby") && !control.closest("label") && !(id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
        });
        const undersizedControlElements = [...document.querySelectorAll("button,input:not([type=hidden]),select,textarea")].filter((control) => !control.hasAttribute("aria-hidden") && !control.closest("[aria-hidden]")).filter((control) => {
          const target = control.matches('input[type="checkbox"],input[type="radio"],input[type="file"]') ? control.closest("label") || control : control;
          const rect = target.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
        });
        const describe = (control) => ({ tag:control.tagName.toLowerCase(), name:control.getAttribute("name"), type:control.getAttribute("type"), width:Math.round(control.getBoundingClientRect().width), height:Math.round(control.getBoundingClientRect().height) });
        return { h1Count:document.querySelectorAll("h1").length, missingLabels:missingLabelControls.length, missingLabelControls:missingLabelControls.map(describe), undersizedControls:undersizedControlElements.length, undersizedControlElements:undersizedControlElements.map(describe), overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
      });
      await page.keyboard.press("Tab");
      const focusVisible = await page.evaluate(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement) || active === document.body) return false;
        const style = getComputedStyle(active);
        return style.outlineStyle !== "none" || style.boxShadow !== "none";
      });
      results.checks.push({ route, colorScheme, status:response?.status(), focusVisible, ...metrics });
    }
    await context.close();
  }
}

async function runInvalidAssessmentLinks() {
  const links = [
    { state:"expired", token:process.env.QA_EXPIRED_ASSESSMENT_TOKEN },
    { state:"revoked", token:process.env.QA_REVOKED_ASSESSMENT_TOKEN }
  ];
  if (links.some((item) => !item.token)) throw new Error("Invalid-assessment-link QA environment is incomplete.");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  observeConsole(page, "assessment-link-state");
  for (const item of links) {
    const response = await page.goto(`${baseUrl}/careers/assessment/${item.token}`, { waitUntil:"networkidle" });
    const body = await page.locator("body").innerText();
    results.checks.push({ state:item.state, status:response?.status(), safeUnavailable:!body.includes(item.token) && !body.includes("access_token") });
  }
  await context.close();
}

async function runAdmin() {
  const email = process.env.QA_ADMIN_EMAIL;
  const password = process.env.QA_ADMIN_PASSWORD;
  const writer = process.env.QA_WRITER_REFERENCE;
  const sales = process.env.QA_SALES_REFERENCE;
  const adminId = process.env.QA_ADMIN_ID;
  if (!email || !password || !writer || !sales || !adminId) throw new Error("Admin QA environment is incomplete.");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  observeConsole(page, "admin");
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin/dashboard", { timeout: 30000 });
  const routes = ["/admin/hiring","/admin/hiring/applications","/admin/hiring/assessments","/admin/hiring/question-bank","/admin/hiring/interviews","/admin/hiring/talent-pool","/admin/hiring/referrals","/admin/hiring/connected-candidates","/admin/hiring/verification-centre","/admin/hiring/retention","/admin/hiring/providers","/admin/system-health"];
  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => ({ heading: document.querySelector("h1")?.textContent?.trim() || "", overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
    results.checks.push({ route, status: response?.status(), ...metrics });
  }
  await page.screenshot({ path: path.join(outputDirectory, "admin-hiring-desktop.png"), fullPage: true });

  const operationResults = [];
  for (const reference of [writer, sales]) {
    operationResults.push(await adminFetch(page, "/api/admin/hiring/operations", { resource:"application", applicationReference:reference, action:"set_stage", stage:"eligibility_review", reason:"Production QA human review" }));
    operationResults.push(await adminFetch(page, "/api/admin/hiring/operations", { resource:"application", applicationReference:reference, action:"add_note", note:"Sanitized production QA note.", reason:"Production QA note control" }));
  }
  const assessmentReminder = await adminFetch(page, "/api/admin/hiring/operations", { resource:"assessment", applicationReference:writer, action:"remind", expiresInHours:4, reason:"Production QA assessment reminder" });
  const assessmentScore = await adminFetch(page, "/api/admin/hiring/operations", { resource:"assessment", applicationReference:writer, action:"score", humanScore:82, vivaScore:78, recommendation:"advance", notes:"Sanitized production QA human score.", reason:"Production QA assessment scoring" });
  const interviewSchedule = await adminFetch(page, "/api/admin/hiring/operations", { resource:"interview", applicationReference:writer, action:"schedule", interviewType:"role_interview", interviewerAdminUserId:adminId, scheduledAt:new Date(Date.now()+48*3600000).toISOString(), durationMinutes:30, notes:"Sanitized structured interview plan.", reason:"Production QA interview scheduling" });
  const interviewId = interviewSchedule.json?.data?.interviewId;
  const interviewComplete = interviewId ? await adminFetch(page, "/api/admin/hiring/operations", { resource:"interview", applicationReference:writer, action:"complete", interviewId, recommendation:"advance", scores:{communication:84,role_fit:86,integrity:90}, notes:"Sanitized structured scorecard.", reason:"Production QA interview completion" }) : null;
  const question = await adminFetch(page, "/api/admin/hiring/questions", { role:"academic_writer", category:"production_qa", section:"written", difficulty:"foundation", prompt:"Explain one safe evidence-review step for this sanitized QA question.", variants:[], scoringRubric:{accuracy:60,clarity:40}, expectedCompetencies:["evidence review"], active:false, changeReason:"Production QA versioning test" });
  const stableQuestionId = question.json?.data?.stableQuestionId;
  const version = stableQuestionId ? await adminFetch(page, `/api/admin/hiring/questions/${stableQuestionId}`, { operation:"create_version", input:{ role:"academic_writer", category:"production_qa", section:"written", difficulty:"foundation", prompt:"Explain two safe evidence-review steps for this sanitized QA question.", variants:[], scoringRubric:{accuracy:60,clarity:40}, expectedCompetencies:["evidence review"], active:false, changeReason:"Production QA version two" } }, "PATCH") : null;
  const protectedMutation = await adminFetch(page, "/api/admin/hiring/questions/WXQ-WR-SOURCE-001", { operation:"archive", reason:"Production QA protected question denial" }, "PATCH");
  const talent = await adminFetch(page, "/api/admin/hiring/operations", { resource:"talent_pool", applicationReference:sales, action:"add", category:"future_hire", skillTags:["communication"], roleTags:["sales"], availability:"QA only", notes:"Sanitized QA talent record.", reason:"Production QA talent workflow" });
  const referral = await adminFetch(page, "/api/admin/hiring/operations", { resource:"referral", applicationReference:sales, action:"save", referralSource:"production_qa", referrerCode:"QA-REFERRER", joinedStatus:"not_joined", payoutStatus:"not_applicable", conflictStatus:"clear", notes:"Sanitized QA referral.", reason:"Production QA referral workflow" });
  const identity = await adminFetch(page, "/api/admin/hiring/operations", { resource:"verification", applicationReference:writer, action:"open_case", verificationType:"identity", method:"manual_document_review", notes:"Sanitized QA verification case.", reason:"Production QA verification workflow" });
  const identityDecision = await adminFetch(page, "/api/admin/hiring/operations", { resource:"verification", applicationReference:writer, action:"decide", verificationType:"identity", decision:"approved_with_conditions", notes:"Sanitized QA evidence was manually reviewed.", conditions:["QA condition only"], reason:"Production QA human decision" });
  const education = await adminFetch(page, "/api/admin/hiring/operations", { resource:"verification", applicationReference:writer, action:"open_case", verificationType:"education", method:"manual_document_review", notes:"Sanitized QA education case.", reason:"Production QA education review" });
  const educationDecision = await adminFetch(page, "/api/admin/hiring/operations", { resource:"verification", applicationReference:writer, action:"decide", verificationType:"education", decision:"approved_for_hiring", notes:"Sanitized QA education evidence reviewed by a human.", reason:"Production QA education decision" });
  const background = await adminFetch(page, "/api/admin/hiring/operations", { resource:"verification", applicationReference:writer, action:"open_case", verificationType:"background", method:"manual_self_declaration_review", notes:"Sanitized QA background case.", reason:"Production QA background review" });
  const backgroundDecision = await adminFetch(page, "/api/admin/hiring/operations", { resource:"verification", applicationReference:writer, action:"decide", verificationType:"background", decision:"approved_with_conditions", notes:"Sanitized QA self-declaration reviewed without unsupported clearance claims.", conditions:["External provider remains unavailable"], reason:"Production QA background decision" });
  const referenceCase = await adminFetch(page, "/api/admin/hiring/operations", { resource:"verification", applicationReference:sales, action:"open_case", verificationType:"reference", method:"manual_reference_review", notes:"Sanitized QA reference case.", reason:"Production QA clarification test" });
  const clarification = await adminFetch(page, "/api/admin/hiring/operations", { resource:"verification", applicationReference:sales, action:"request_clarification", verificationType:"reference", notes:"Please clarify the sanitized reference detail.", reason:"Production QA candidate clarification" });
  const offerGate = await adminFetch(page, "/api/admin/hiring/operations", { resource:"application", applicationReference:writer, action:"set_stage", stage:"offer_released", reason:"Production QA verified offer gate" });
  const hrms = await adminFetch(page, "/api/admin/hiring/operations", { resource:"hrms", applicationReference:writer, action:"retry", reason:"Production QA unavailable-provider check" });
  const trust = await adminFetch(page, "/api/admin/hiring/operations", { resource:"trust_publish", applicationReference:writer, action:"evaluate", reason:"Production QA publishing boundary" });
  const retention = await adminFetch(page, "/api/admin/hiring/operations", { resource:"application", applicationReference:writer, action:"set_retention", retentionCategory:"active_candidate", reviewDueAt:new Date(Date.now()+30*86400000).toISOString(), reason:"Production QA retention workflow" });
  const connected = await adminFetch(page, "/api/admin/hiring/connected-candidates", undefined, "GET");
  const connectedReview = connected.json?.data?.reviews?.find((review) => [review.candidateA?.reference,review.candidateB?.reference].includes(writer) && [review.candidateA?.reference,review.candidateB?.reference].includes(sales));
  const connectedDecision = connectedReview ? await adminFetch(page, `/api/admin/hiring/connected-candidates/${connectedReview.id}`, { decision:"false_positive", reviewerNotes:"Production QA confirmed that shared test infrastructure created these signals; no misconduct finding was made.", finalOfferApproved:false, controls:{separateAssessors:false,separateReportingLines:false,restrictedCrossSystemAccess:false,enhancedProbationMonitoring:false,noDirectWorkAllocationAuthority:false,noSharedApprovalChain:false,postJoiningAuditRequired:false}, controlNotes:"Sanitized production QA false-positive review." }, "PATCH") : null;
  results.checks.push({ operationStatuses: operationResults.map((item) => item.status), assessmentReminder:assessmentReminder.status, assessmentScore:assessmentScore.status, interviewSchedule:interviewSchedule.status, interviewComplete:interviewComplete?.status, question: question.status, version: version?.status, protectedMutation: protectedMutation.status, talent: talent.status, referral: referral.status, identity: identity.status, identityDecision: identityDecision.status, education:education.status, educationDecision:educationDecision.status, background:background.status, backgroundDecision:backgroundDecision.status, referenceCase:referenceCase.status, clarification:clarification.status, offerGate:offerGate.status, connectedList:connected.status, connectedDecision:connectedDecision?.status, hrms: hrms.status, trust: trust.status, retention: retention.status, stableQuestionId });

  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await mobilePage.goto(`${baseUrl}/admin/hiring/applications`, { waitUntil: "networkidle" });
  results.checks.push({ adminMobileOverflow: await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) });
  await mobilePage.screenshot({ path: path.join(outputDirectory, "admin-hiring-mobile.png"), fullPage: true });
  await context.close();
  return { stableQuestionId };
}

async function runAssessment() {
  const token = process.env.QA_ASSESSMENT_TOKEN;
  if (!token) throw new Error("QA_ASSESSMENT_TOKEN is required.");
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const page = await context.newPage();
  observeConsole(page, "assessment");
  const response = await page.goto(`${baseUrl}/careers/assessment/${token}`, { waitUntil: "networkidle" });
  results.checks.push({ assessmentStatus: response?.status(), initialQuestionCountInDom: await page.locator("main h1").count(), watermarkVisible: await page.locator("text=WriteX Assessment").count() > 0 });
  await page.locator("main h1").press("Control+c");
  let questionNumber = 1;
  while (true) {
    const answer = page.getByLabel("Your answer");
    await answer.fill(`Sanitized QA response for question ${questionNumber}. This response verifies autosave and server-side question release.`);
    await page.waitForTimeout(1500);
    const next = page.getByRole("button", { name: "Save and next" });
    if (await next.count()) {
      await next.click();
      questionNumber += 1;
      continue;
    }
    await page.getByRole("button", { name: "Submit assessment" }).click();
    break;
  }
  await page.getByRole("heading", { name: "Assessment submitted" }).waitFor({ state: "visible", timeout: 30000 });
  await page.screenshot({ path: path.join(outputDirectory, "assessment-submitted.png"), fullPage: true });
  await page.reload({ waitUntil: "networkidle" });
  const lockedText = await page.locator("body").innerText();
  results.checks.push({ submittedQuestions: questionNumber, submissionLocked: lockedText.includes("already") || lockedText.includes("submitted") || lockedText.includes("unavailable") });
  await context.close();
  return { submittedQuestions: questionNumber };
}

async function runConnectedReview() {
  const email=process.env.QA_ADMIN_EMAIL;
  const password=process.env.QA_ADMIN_PASSWORD;
  const first=process.env.QA_WRITER_REFERENCE;
  const second=process.env.QA_SALES_REFERENCE;
  const firstCandidate=process.env.QA_FIRST_CANDIDATE_REFERENCE;
  const secondCandidate=process.env.QA_SECOND_CANDIDATE_REFERENCE;
  if(!email||!password||!first||!second||!firstCandidate||!secondCandidate)throw new Error("Connected review QA environment is incomplete.");
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  observeConsole(page,"connected-review");
  await page.goto(`${baseUrl}/admin/login`,{waitUntil:"networkidle"});
  await page.getByLabel("Email",{exact:true}).fill(email);
  await page.getByLabel("Password",{exact:true}).fill(password);
  await page.getByRole("button",{name:"Sign in"}).click();
  await page.waitForURL("**/admin/dashboard",{timeout:30000});
  const observedAt=new Date().toISOString();
  const firstObservation=await adminFetch(page,"/api/admin/hiring/candidate-observations",{candidateReference:firstCandidate,applicationRole:"Subject Matter Expert",department:"Academic",reportingLineReference:"qa-line-a",accessDomains:["project_files"],applicationStatus:"assessment",appliedAt:observedAt,disclosure:{knowsApplicantOrEmployee:false},indicators:{deviceFingerprint:"sanitized-qa-shared-device",browserDeviceProfile:"sanitized-qa-browser",assessmentAnswers:["Sanitized QA answer pattern for connected-candidate review."]}});
  const secondObservation=await adminFetch(page,"/api/admin/hiring/candidate-observations",{candidateReference:secondCandidate,applicationRole:"Sales Executive",department:"Sales",reportingLineReference:"qa-line-b",accessDomains:["customer_records"],applicationStatus:"applied",appliedAt:observedAt,disclosure:{knowsApplicantOrEmployee:true,name:"Sanitized QA Candidate",relationship:"Professional acquaintance",role:"Subject Matter Expert applicant",disclosureDetails:"Declared solely for production QA.",relatedCandidateReference:firstCandidate},indicators:{deviceFingerprint:"sanitized-qa-shared-device",browserDeviceProfile:"sanitized-qa-browser",assessmentAnswers:["Sanitized QA answer pattern for connected-candidate review."]}});
  const list=await adminFetch(page,"/api/admin/hiring/connected-candidates",undefined,"GET");
  const review=list.json?.data?.reviews?.find((item)=>[item.candidateA?.reference,item.candidateB?.reference].includes(firstCandidate)&&[item.candidateA?.reference,item.candidateB?.reference].includes(secondCandidate));
  const decision=review?await adminFetch(page,`/api/admin/hiring/connected-candidates/${review.id}`,{decision:"false_positive",reviewerNotes:"Production QA confirmed shared test infrastructure; this is not a misconduct finding.",finalOfferApproved:false,controls:{separateAssessors:false,separateReportingLines:false,restrictedCrossSystemAccess:false,enhancedProbationMonitoring:false,noDirectWorkAllocationAuthority:false,noSharedApprovalChain:false,postJoiningAuditRequired:false},controlNotes:"Sanitized production QA review."},"PATCH"):null;
  results.checks.push({firstObservation:firstObservation.status,secondObservation:secondObservation.status,connectedList:list.status,reviewFound:Boolean(review),riskLevel:review?.riskLevel||null,automaticRejection:review?.automaticRejection,decision:decision?.status,decisionError:decision?.status&&decision.status>=400?decision.json?.error?.message||"generic error":null});
  await context.close();
  return{reviewFound:Boolean(review),decision:decision?.status||null};
}

async function runFileSecurity() {
  const email=process.env.QA_ADMIN_EMAIL;
  const password=process.env.QA_ADMIN_PASSWORD;
  const reference=process.env.QA_WRITER_REFERENCE;
  if(!email||!password||!reference)throw new Error("File-security QA environment is incomplete.");
  const context=await browser.newContext({viewport:{width:1024,height:800}});
  const page=await context.newPage();
  observeConsole(page,"file-security");
  await page.goto(`${baseUrl}/admin/login`,{waitUntil:"networkidle"});
  await page.getByLabel("Email",{exact:true}).fill(email);
  await page.getByLabel("Password",{exact:true}).fill(password);
  await page.getByRole("button",{name:"Sign in"}).click();
  await page.waitForURL("**/admin/dashboard",{timeout:30000});
  const upload=await page.evaluate(async(reference)=>{const form=new FormData();form.set("applicationReference",reference);form.set("verificationType","identity");form.set("documentKind","sanitized_qa_identity");form.set("reason","Production QA private verification evidence test");form.set("file",new File([new TextEncoder().encode("%PDF-1.4\n% sanitized verification QA\n%%EOF")],"qa-verification.pdf",{type:"application/pdf"}));const response=await fetch("/api/admin/hiring/verification-documents",{method:"POST",body:form});return{status:response.status,json:await response.json().catch(()=>null)};},reference);
  const fileId=upload.json?.data?.fileId;
  const signed=fileId?await adminFetch(page,`/api/admin/hiring/files/${fileId}`,{action:"signed_url",reason:"Production QA signed retrieval"}):null;
  const signedUrl=signed?.json?.data?.url;
  const download=signedUrl?await fetch(signedUrl):null;
  const anonymousContext=await browser.newContext();
  const anonymousPage=await anonymousContext.newPage();
  await anonymousPage.goto(`${baseUrl}/careers`,{waitUntil:"domcontentloaded"});
  const anonymous=fileId?await adminFetch(anonymousPage,`/api/admin/hiring/files/${fileId}`,{action:"signed_url",reason:"Production QA anonymous denial"}):null;
  await anonymousContext.close();
  const revoke=fileId?await adminFetch(page,`/api/admin/hiring/files/${fileId}`,{action:"revoke",reason:"Production QA evidence revocation"}):null;
  const deniedAfterRevoke=fileId?await adminFetch(page,`/api/admin/hiring/files/${fileId}`,{action:"signed_url",reason:"Production QA post-revocation denial"}):null;
  const deletionWithoutConfirmation=fileId?await adminFetch(page,`/api/admin/hiring/files/${fileId}`,{action:"delete",reason:"Production QA confirmation enforcement"}):null;
  const deletion=fileId?await adminFetch(page,`/api/admin/hiring/files/${fileId}`,{action:"delete",reason:"Production QA secure deletion",confirmation:"CONFIRM"}):null;
  results.checks.push({upload:upload.status,scanStatus:upload.json?.data?.scanStatus,signed:signed?.status,download:download?.status,anonymous:anonymous?.status,revoke:revoke?.status,deniedAfterRevoke:deniedAfterRevoke?.status,deletionWithoutConfirmation:deletionWithoutConfirmation?.status,deletion:deletion?.status});
  await context.close();
  return{fileIdCreated:Boolean(fileId)};
}

try {
  const data = mode === "public" ? await runPublic() : mode === "admin" ? await runAdmin() : mode === "assessment" ? await runAssessment() : mode === "connected" ? await runConnectedReview() : mode === "files" ? await runFileSecurity() : mode === "permissions" ? await runPermissions() : mode === "notifications" ? await runNotifications() : mode === "accessibility" ? await runAccessibility() : mode === "invalid-links" ? await runInvalidAssessmentLinks() : mode === "single" ? { reference: await submitApplication(process.env.QA_CANDIDATE_ROLE === "writer" ? "academic_writer" : "sales_executive", "Connected", false) } : await auditResponsiveRoutes();
  results.data = data;
  results.ok = results.consoleErrors.length === 0 && results.checks.every((check) => check.overflow !== true && check.adminMobileOverflow !== true);
  process.stdout.write(`QA_RESULT=${JSON.stringify(results)}\n`);
} finally {
  await browser.close();
}
