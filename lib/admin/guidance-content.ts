export const adminGuidanceRoles = [
  "super_admin",
  "hr_admin",
  "hiring_manager",
  "assessor",
  "interviewer",
  "website_experience_admin",
  "read_only_auditor"
] as const;

export type AdminGuidanceRole = (typeof adminGuidanceRoles)[number];

export type AdminHelpArticle = {
  id: string;
  title: string;
  module: string;
  roles: AdminGuidanceRole[];
  version: string;
  lastUpdated: string;
  owner: string;
  active: boolean;
  purpose: string;
  actions: string[];
  mistakes: string[];
  sensitive?: string;
  href?: string;
  resources?: Array<{ label: string; href: string }>;
};

const allRoles = [...adminGuidanceRoles];
const hiringRoles: AdminGuidanceRole[] = [
  "super_admin",
  "hr_admin",
  "hiring_manager",
  "assessor",
  "interviewer",
  "read_only_auditor"
];

export const adminHelpArticles: AdminHelpArticle[] = [
  {
    id: "overview-dashboard-v1",
    title: "Overview Dashboard",
    module: "Getting Started",
    roles: allRoles,
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "WriteX Operations",
    active: true,
    purpose: "Orient yourself to priority work, provider health and restricted operations.",
    actions: ["Review Action Centre counts", "Open the module owning the next action", "Check system health before retrying integrations"],
    mistakes: ["Treating counts as final decisions", "Retrying a blocked provider without checking health"],
    href: "/admin/dashboard"
  },
  {
    id: "employees-academy-access-v1",
    title: "Employees and Academy Access",
    module: "People & Access",
    roles: ["super_admin"],
    version: "1.1",
    lastUpdated: "2026-08-24",
    owner: "Website Administration",
    active: true,
    purpose: "Manage employment, reporting lines, Academy access, Academy role and sync status from the Website Admin source of truth.",
    actions: [
      "Keep the Active directory as the normal operational view",
      "Use Academy area and role filters to work from the same directory across Sales and Development / Operations",
      "For Delivery, create the Manager, Team Leader and Delivery Trainer before enabling Senior and Junior SME learners",
      "Keep the Delivery Trainer assignment separate: both Senior and Junior SMEs report directly to the Team Leader",
      "Verify credentials and a Healthy sync result before handing Academy access to the employee",
      "Open Manage for lifecycle and Academy access actions",
      "Deactivate to revoke Academy access while preserving history",
      "Archive historical employees instead of deleting dependent records",
      "Use Academy Sync Attention to resolve failed or pending sync"
    ],
    mistakes: [
      "Creating the same employee separately inside the Academy",
      "Assigning a Delivery Trainer as the operational reporting parent",
      "Enabling Delivery access before the required reporting and Trainer relationships are valid",
      "Permanently deleting an employee who has learning, practice, audit or business history",
      "Treating a pending or failed Academy sync as completed access"
    ],
    sensitive: "Website Admin remains the employee source of truth. Permanent deletion is restricted to dependency-free records and requires the governed confirmation flow.",
    href: "/admin/employees"
  },
  {
    id: "academy-ai-usage-budgets-v1",
    title: "Academy AI Usage and Budgets",
    module: "AI Governance",
    roles: ["super_admin"],
    version: "1.0",
    lastUpdated: "2026-08-18",
    owner: "Website Administration",
    active: true,
    purpose: "Review Academy AI usage and control the master operating budget without exposing provider credentials.",
    actions: [
      "Confirm the authorised Academy model",
      "Review response events, tokens, cost and projected month-end spend",
      "Keep the operating target and hard ceiling within Founder authority",
      "Pause paid generation when the master safety control requires it",
      "Investigate attribution or pricing-source warnings before changing limits"
    ],
    mistakes: [
      "Assuming an application estimate is the provider invoice",
      "Increasing the master ceiling without Founder approval",
      "Switching or escalating models silently"
    ],
    sensitive: "Do not display or copy API keys, service-account secrets or provider credentials into Admin notes.",
    href: "/admin/ai-governance"
  },
  {
    id: "trust-centre-operations-v1",
    title: "Trust Centre Operations",
    module: "Trust Centre",
    roles: ["super_admin"],
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "Trust & Safety",
    active: true,
    purpose: "Monitor representative sync, verification providers and suspicious reports.",
    actions: ["Review last-good sync", "Inspect provider health", "Resolve suspicious-report evidence safely"],
    mistakes: ["Publishing a representative without eligibility", "Exposing full mobiles, hashes or provider payloads"],
    sensitive: "Trust publishing requires Joined status, active HRMS state, approved designation, official mobile and explicit approval.",
    href: "/admin/trust-centre"
  },
  {
    id: "client-portal-operations-v1",
    title: "Client Portal Operations",
    module: "Client Portal",
    roles: ["super_admin"],
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "Client Operations",
    active: true,
    purpose: "Review portal access, sessions, provider health and temporary sanitized test access.",
    actions: ["Search by safe reference", "Revoke compromised sessions", "Launch test access only from the Admin surface"],
    mistakes: ["Sharing a temporary link publicly", "Treating unavailable provider data as verified"],
    href: "/admin/client-portal"
  },
  {
    id: "hiring-applications-v1",
    title: "Applications",
    module: "Smart Hiring",
    roles: hiringRoles,
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "People Operations",
    active: true,
    purpose: "Review candidate eligibility, disclosures and stage history without exposing protected signals.",
    actions: ["Review the submitted role evidence", "Record an eligibility decision with a reason", "Request clarification before a high-risk conclusion"],
    mistakes: ["Automatic rejection from one signal", "Using relationship disclosure as proof of collusion"],
    href: "/admin/hiring/applications"
  },
  {
    id: "hiring-assessments-v1",
    title: "Assessments and Integrity Review",
    module: "Assessments",
    roles: ["super_admin", "hiring_manager", "assessor", "read_only_auditor"],
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "Assessment Operations",
    active: true,
    purpose: "Score the exact assessment version and review telemetry as advisory evidence.",
    actions: ["Check the question version", "Apply the published rubric", "Record a human integrity conclusion"],
    mistakes: ["Calling a candidate fraudulent from telemetry alone", "Ignoring approved accommodations"],
    sensitive: "Advisory signals require human review and a recorded reason.",
    href: "/admin/hiring/assessments"
  },
  {
    id: "question-bank-v1",
    title: "Question Bank",
    module: "Assessments",
    roles: ["super_admin", "hiring_manager"],
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "Assessment Operations",
    active: true,
    purpose: "Manage custom question versions while preserving protected base questions.",
    actions: ["Create a new version", "Review role and category", "Keep base questions protected"],
    mistakes: ["Editing a version already used by a candidate", "Removing the protected assessment foundation"],
    href: "/admin/hiring/question-bank"
  },
  {
    id: "interviews-v1",
    title: "Interviews",
    module: "Interviews",
    roles: ["super_admin", "hr_admin", "hiring_manager", "interviewer"],
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "People Operations",
    active: true,
    purpose: "Schedule structured interviews and record scorecards with role-appropriate access.",
    actions: ["Confirm the assigned interviewer", "Use structured criteria", "Record a reasoned recommendation"],
    mistakes: ["Unstructured sensitive notes", "Changing assessment evidence from an interview screen"],
    href: "/admin/hiring/interviews"
  },
  {
    id: "connected-candidates-v1",
    title: "Connected Candidate Review",
    module: "Smart Hiring",
    roles: ["super_admin", "hiring_manager", "read_only_auditor"],
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "People Risk",
    active: true,
    purpose: "Review declared or detected candidate links without automatic fraud labels.",
    actions: ["Compare link reasons", "Document false positives", "Recommend access separation when needed"],
    mistakes: ["Rejecting candidates solely for knowing each other", "Exposing risk indicators to candidates"],
    sensitive: "High-risk links require authorised human approval and documented controls.",
    href: "/admin/hiring/connected-candidates"
  },
  {
    id: "verification-centre-v1",
    title: "Verification Centre",
    module: "Verification Centre",
    roles: ["super_admin", "hr_admin", "hiring_manager", "read_only_auditor"],
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "People Operations",
    active: true,
    purpose: "Request and review sensitive documents only after shortlist.",
    actions: ["Confirm consent", "Review identity and education evidence", "Record discrepancies and candidate explanations"],
    mistakes: ["Requesting Aadhaar or education documents in the public form", "Approving with unresolved identity mismatch"],
    sensitive: "Background approval requires an explicit decision reason and unresolved-discrepancy check.",
    href: "/admin/hiring/verification-centre"
  },
  {
    id: "hiring-settings-v1",
    title: "Application Form Options",
    module: "Smart Hiring",
    roles: ["super_admin"],
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "People Operations",
    active: true,
    purpose: "Manage structured public application options while preserving historical values.",
    actions: ["Activate or deactivate options", "Set display order", "Add approved options"],
    mistakes: ["Expecting old applications to be rewritten", "Trying to enable non-full-time employment without founder authorisation"],
    sensitive: "Full-time employment is a protected system condition.",
    href: "/admin/hiring/settings"
  },
  {
    id: "system-health-v1",
    title: "S3, SES and System Health",
    module: "System Health",
    roles: ["super_admin", "read_only_auditor"],
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "Platform Operations",
    active: true,
    purpose: "Review current integration state without exposing credentials.",
    actions: ["Check safe health states", "Use correlation IDs for external escalation", "Confirm last successful operation"],
    mistakes: ["Pasting credentials into notes", "Treating a configured environment value as a successful live check"],
    href: "/admin/system-health"
  },
  {
    id: "audit-logs-v1",
    title: "Audit Logs",
    module: "Audit Logs",
    roles: ["super_admin", "read_only_auditor"],
    version: "1.0",
    lastUpdated: "2026-07-27",
    owner: "Platform Operations",
    active: true,
    purpose: "Review traceable operational actions using safe, minimised metadata.",
    actions: ["Filter by entity and action", "Follow correlation references", "Escalate unexplained high-impact changes"],
    mistakes: ["Exporting unnecessary personal data", "Editing evidence outside the source workflow"],
    href: "/admin/audit-logs"
  },
  {
    id: "festival-studio-quick-start-v2",
    title: "Festival Studio Quick Start",
    module: "Festival Studio",
    roles: ["super_admin", "website_experience_admin", "read_only_auditor"],
    version: "3.0",
    lastUpdated: "2026-08-10",
    owner: "Website Experience",
    active: true,
    purpose: "Select, preview and safely publish a complete festival experience without configuring every asset manually.",
    actions: ["Festival select karein", "Approved Design Variant choose karein", "Login design preview karein", "Recommended Setup use karein", "Header choose karein", "Ground choose karein", "Footer choose karein", "AXO choose karein", "Ambient Effect choose karein", "Feature Effect choose karein", "Sound ON/OFF set karein", "Save karein", "Refresh ke baad verify karein", "Private Preview dekhein", "Apply Now sirf final review ke baad karein", "Future event ko Schedule karein", "Ek region ka pack Remove karein", "Restore Previous se exact pack wapas layein", "Turn Off Festival se setup preserve karke public theme band karein", "Restore Normal Website se emergency reset karein"],
    mistakes: ["Assuming a private preview is public", "Using Restore Normal Website when only a temporary Turn Off is needed", "Enabling sound without a visitor-started control"],
    href: "/admin/website-experience/festival-studio",
    resources: [
      { label: "Download Hinglish PDF Guide", href: "/guides/festival-studio-admin-guide-hinglish.pdf" },
      { label: "Open Hinglish Markdown Guide", href: "/guides/festival-studio-admin-guide-hinglish.md" }
    ]
  }
];

const festivalArticleTitles = [
  "Use Recommended Festival Setup",
  "Select a Festival and Design Variant",
  "Decorate the Header",
  "Add Garlands, Lights, Bells and Lanterns",
  "Decorate Ground & Page Bottom",
  "Select and Configure Festival AXO",
  "Add Snowfall, Fireworks, Colours and Reindeer",
  "Configure Festival Sound",
  "Preview Before Applying",
  "Apply a Festival Theme",
  "Switch Between Festivals",
  "Turn Off a Festival",
  "Restore the Normal WriteX Website",
  "Configure Mobile and Dark Mode",
  "Use Advanced Customisation",
  "Fix an Asset That Is Not Showing",
  "Fix a Selected Variant Mismatch",
  "Manage Asset Versions",
  "Festival Auto-Pilot",
  "Emergency Festival Reset"
] as const;

adminHelpArticles.push(...festivalArticleTitles.map((title, index): AdminHelpArticle => ({
  id: `festival-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-v2`,
  title,
  module: "Festival Studio",
  roles: ["super_admin", "website_experience_admin", "read_only_auditor"],
  version: "2.0",
  lastUpdated: "2026-08-01",
  owner: "Website Experience",
  active: true,
  purpose: index === 11
    ? "Temporarily deactivate the public festival while preserving its saved configuration for later use."
    : index === 12 || index === 19
      ? "Return every festival surface to the normal WriteX experience when an emergency or incomplete state requires a complete reset."
      : `Complete ${title.toLowerCase()} using the visible Festival Studio controls.`,
  actions: index === 11
    ? ["Open Festival Status", "Select Turn Off Festival", "Review the preserved configuration notice", "Confirm Turn Off", "Verify the normal website is visible"]
    : index === 12 || index === 19
      ? ["Open Festival Status", "Select Restore Normal Website", "Review every surface that will be reset", "Confirm the emergency reset", "Verify Header, Ground, AXO, effects, sound and login screens are normal"]
      : ["Open Festival Studio", "Select the relevant visible section", "Choose or adjust an approved option", "Preview the private draft", "Apply only after the preview is correct"],
  mistakes: ["Skipping private preview", "Changing unrelated approved sections", "Expecting a saved draft to be public"],
  href: `/admin/website-experience/festival-studio?section=${index >= 8 && index <= 9 ? "preview" : index === 10 ? "schedule" : "configure"}`
})));

adminHelpArticles.push({
  id: "designer-hero-pack-v1",
  title: "Add a New Designer Hero Pack",
  module: "Festival Studio",
  roles: ["super_admin", "website_experience_admin"],
  version: "1.0",
  lastUpdated: "2026-08-01",
  owner: "Website Experience",
  active: true,
  purpose: "Create a future festival Login variant from one clean 8K background while WriteX keeps the real logo, tagline and form separate.",
  actions: ["Open Advanced Customisation", "Choose Add New Event Pack", "Enter the Festival and Variant", "Choose Client, Employee or Both", "Upload the clean 8K Hero", "Confirm the artwork contains no interface", "Create the private pack", "Review and preview before applying"],
  mistakes: ["Uploading a screenshot containing a form", "Using this page for Header or AXO decorations", "Assuming a private ready pack is publicly active"],
  href: "/admin/website-experience/designer-hero-packs"
});

export const adminProcessGuides = [
  {
    id: "smart-hiring-process-v1",
    title: "Smart Hiring",
    steps: ["Application", "Eligibility Review", "Assessment", "Human Review", "Interview", "Verification", "Final Approval", "Offer", "Joined", "HRMS Awaiting Connection", "Trust Centre Eligibility"],
    owner: "People Operations",
    blocker: "External HRMS remains unavailable until a live provider is configured.",
    complete: "Joined candidate is approved, audited and safely ready for the next system."
  },
  {
    id: "suspicious-activity-process-v1",
    title: "Suspicious Activity",
    steps: ["Public Report", "DB Reference", "Private S3 Evidence", "SES Notification", "Admin Queue", "Review", "Revoke/Delete", "Audit Closure"],
    owner: "Trust & Safety",
    blocker: "Evidence access or provider health failure.",
    complete: "Case decision and evidence lifecycle are recorded."
  },
  {
    id: "temporary-client-process-v1",
    title: "Temporary Client Testing",
    steps: ["Generate", "Launch Test Portal", "Sanitized Session", "Validate UI", "Logout", "Revoke", "Audit"],
    owner: "Client Operations",
    blocker: "Feature disabled, expired access or invalidated single-use token.",
    complete: "Test session is closed and its audit trail is available."
  },
  {
    id: "representative-process-v1",
    title: "Representative Verification",
    steps: ["LTS Sync", "Active Representative Directory", "Mobile Matching", "Public Verification", "Audit/Health"],
    owner: "Trust & Safety",
    blocker: "LTS health or credential failure; last-good data must remain available.",
    complete: "Active approved representative can be verified without public PII exposure."
  }
];

export const adminGlossary = [
  ["Application Stage", "The safe workflow position assigned to a candidate application."],
  ["Eligibility Review", "A human review of published role requirements and submitted evidence."],
  ["Assessment Session", "A versioned, time-bound role assessment assigned to one candidate."],
  ["Integrity Event", "A recorded assessment event requiring context and human interpretation."],
  ["Advisory Signal", "Evidence that may guide review but cannot decide the outcome automatically."],
  ["Connected Candidate", "A declared or detected link between applicants that requires proportionate review."],
  ["Verification Case", "A post-shortlist document and evidence review record."],
  ["Approved with Conditions", "A human decision that includes explicit follow-up controls."],
  ["HRMS Awaiting Connection", "A truthful state indicating the external HRMS provider is not live."],
  ["Trust Publishing Block", "A condition preventing public representative verification publication."],
  ["Protected Base Question", "A versioned assessment question that cannot be deleted from the system foundation."],
  ["Signed URL", "A short-lived, scoped private-file access URL."],
  ["Revoked File", "A private object whose access has been withdrawn."],
  ["Test Session", "A sanitized temporary client-portal session that cannot expose real client data."],
  ["Audit Event", "A traceable record of a sensitive or operational action."]
] as const;

export function getRoleGuidanceArticles(role: string) {
  return adminHelpArticles.filter(
    (article) =>
      article.active && article.roles.includes(role as AdminGuidanceRole)
  );
}
