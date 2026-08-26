import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  Cloud,
  DatabaseZap,
  Eye,
  FileClock,
  FileQuestion,
  FileSearch,
  Gauge,
  Handshake,
  HeartHandshake,
  ImagePlus,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MessageSquareWarning,
  NotebookTabs,
  Pause,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ServerCog,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TestTube2,
  UserCog,
  UsersRound
} from "lucide-react";

export type AdminNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
  superAdminOnly?: boolean;
  roles?: string[];
  hiring?: boolean;
};

export type AdminNavigationGroup = AdminNavigationItem & {
  items: AdminNavigationItem[];
  advancedItems?: AdminNavigationItem[];
};

export const adminSearchActions: AdminNavigationItem[] = [
  { href: "/admin/website-experience/designer-hero-packs", label: "Add New Event Pack", icon: ImagePlus, keywords: ["designer hero pack", "8k hero", "future festival", "new variant"] },
  { href: "/admin/website-experience/festival-studio?section=overview#festival-status", label: "Festival Status", icon: SlidersHorizontal, keywords: ["active festival", "current theme"] },
  { href: "/admin/website-experience/festival-studio?section=configure#recommended-setup", label: "Use Recommended Festival Setup", icon: Sparkles, keywords: ["recommended setup", "holiday", "theme"] },
  { href: "/admin/website-experience/festival-studio?section=configure#decorate-header", label: "Decorate Header", icon: SlidersHorizontal, keywords: ["lights", "mala", "maala", "garland", "lantern", "bells"] },
  { href: "/admin/website-experience/festival-studio?section=configure#decorate-ground", label: "Ground & Page-bottom Decorations", icon: SlidersHorizontal, keywords: ["floor", "ground", "page bottom"] },
  { href: "/admin/website-experience/festival-studio?section=configure#decorate-axo", label: "Decorate AXO", icon: SlidersHorizontal, keywords: ["axo library", "mascot"] },
  { href: "/admin/website-experience/festival-studio?section=configure#festival-effects", label: "Festival Scene Effects", icon: Sparkles, keywords: ["fireworks", "snow", "snowfall", "reindeer", "colour", "motion"] },
  { href: "/admin/website-experience/festival-studio?section=configure#festival-sound", label: "Festival Sound", icon: SlidersHorizontal, keywords: ["audio", "ambience", "mute", "volume"] },
  { href: "/admin/website-experience/festival-studio?section=preview", label: "Preview Festival", icon: Eye, keywords: ["desktop", "tablet", "mobile", "private preview"] },
  { href: "/admin/website-experience/festival-studio?section=schedule", label: "Apply or Schedule Festival", icon: CalendarDays, keywords: ["apply now", "schedule", "switch festival"] },
  { href: "/admin/website-experience/festival-studio?section=overview#turn-off-festival", label: "Turn Off Festival", icon: Pause, keywords: ["disable holiday", "normal website"] },
  { href: "/admin/website-experience/festival-studio?section=overview#restore-normal-website", label: "Restore Normal Website", icon: RotateCcw, keywords: ["restore default", "emergency reset", "normal website"] },
  { href: "/admin/website-experience/festival-studio?section=configure#advanced-customisation", label: "Advanced Customisation", icon: Settings, keywords: ["asset versions", "fallback", "technical details"] },
  { href: "/admin/website-experience/festival-studio?section=history", label: "Festival Theme History", icon: Archive, keywords: ["asset versions", "previous theme"] },
  { href: "/admin/help?search=festival", label: "Festival Help & Tutorials", icon: BookOpen, keywords: ["how to use", "festival auto-pilot", "help"] }
];

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    keywords: ["today", "tasks", "home", "command centre"],
    items: [
      { href: "/admin/dashboard#todays-tasks", label: "Today's Tasks", icon: LayoutDashboard },
      { href: "/admin/action-centre", label: "Action Centre", icon: BellRing, keywords: ["approvals", "queues", "critical", "alerts"] }
    ]
  },
  {
    href: "/admin/employees",
    label: "Employees",
    icon: UsersRound,
    superAdminOnly: true,
    keywords: ["people", "employee directory", "academy access", "team", "manager"],
    items: [
      { href: "/admin/employees", label: "Employee Directory", icon: UsersRound, superAdminOnly: true },
      { href: "/admin/employees#teams", label: "Teams & Departments", icon: UserCog, superAdminOnly: true },
      { href: "/admin/employees?sync=attention", label: "Academy Sync Attention", icon: RefreshCw, superAdminOnly: true }
    ]
  },
  {
    href: "/admin/sales-delivery",
    label: "Sales & Delivery",
    icon: CircleDollarSign,
    keywords: ["lead", "order", "assignment", "delivery", "payment"],
    items: [
      { href: "/admin/leads", label: "New Leads", icon: FileSearch, keywords: ["quote", "enquiry"] },
      { href: "/admin/crm", label: "Follow-ups Due", icon: UsersRound, keywords: ["crm", "communication"] },
      { href: "/admin/manager-review", label: "Orders & Assignments", icon: ClipboardCheck },
      { href: "/admin/revisions", label: "Deliveries & Revisions", icon: FileClock },
      { href: "/admin/sales-delivery#payment-issues", label: "Payment & Issue Attention", icon: CircleDollarSign, keywords: ["payment proof", "sla", "issue"] },
      { href: "/admin/founder-report", label: "Reports", icon: Gauge }
    ],
    advancedItems: [
      { href: "/admin/payments", label: "Payment Proof Queue", icon: CircleDollarSign },
      { href: "/admin/sla", label: "SLA Alerts", icon: Activity }
    ]
  },
  {
    href: "/admin/clients",
    label: "Clients",
    icon: UsersRound,
    superAdminOnly: true,
    keywords: ["client portal", "invoice", "request", "document"],
    items: [
      { href: "/admin/client-portal", label: "Search & Profile", icon: UsersRound, superAdminOnly: true, keywords: ["find client", "invoice"] },
      { href: "/admin/client-portal/support-requests", label: "Requests", icon: LifeBuoy, superAdminOnly: true },
      { href: "/admin/client-portal/files", label: "Documents", icon: Archive, superAdminOnly: true },
      { href: "/admin/crm", label: "Communication", icon: Mail },
      { href: "/admin/client-portal/sessions", label: "History", icon: Activity, superAdminOnly: true, keywords: ["access history", "sessions"] }
    ],
    advancedItems: [
      { href: "/admin/client-portal/temporary-testing", label: "Temporary Testing", icon: TestTube2, superAdminOnly: true }
    ]
  },
  {
    href: "/admin/hiring",
    label: "Hiring",
    icon: BriefcaseBusiness,
    hiring: true,
    keywords: ["applicant", "candidate", "cv", "interview"],
    items: [
      { href: "/admin/hiring", label: "Today", icon: ClipboardCheck, hiring: true },
      { href: "/admin/hiring/applications", label: "Candidates", icon: UsersRound, hiring: true },
      { href: "/admin/hiring/interviews", label: "Interviews", icon: CalendarDays, hiring: true },
      { href: "/admin/hiring/talent-pool", label: "Talent Pool", icon: Star, hiring: true },
      { href: "/admin/hiring/settings", label: "Settings", icon: Settings, hiring: true }
    ],
    advancedItems: [
      { href: "/admin/hiring/assessments", label: "Assessments", icon: ClipboardCheck, hiring: true },
      { href: "/admin/hiring/question-bank", label: "Assessment Questions", icon: NotebookTabs, hiring: true },
      { href: "/admin/hiring/referrals", label: "Referrals", icon: Share2, hiring: true },
      { href: "/admin/hiring/connected-candidates", label: "Connected Candidates", icon: Handshake, hiring: true },
      { href: "/admin/hiring/hrms-sync", label: "HRMS Sync", icon: DatabaseZap, hiring: true },
      { href: "/admin/hiring/trust-publishing", label: "Trust Publishing", icon: Cloud, hiring: true },
      { href: "/admin/hiring/analytics", label: "Hiring Analytics", icon: Gauge, hiring: true },
      { href: "/admin/hiring/settings", label: "Hiring Settings", icon: Settings, hiring: true, superAdminOnly: true }
    ]
  },
  {
    href: "/admin/verification",
    label: "Verification",
    icon: ShieldCheck,
    keywords: ["pending", "needs info", "verified", "rejected", "trust"],
    items: [
      { href: "/admin/verification?status=pending", label: "Pending", icon: FileClock },
      { href: "/admin/verification?status=needs_information", label: "Needs Information", icon: FileQuestion },
      { href: "/admin/verification?status=verified", label: "Verified", icon: ShieldCheck },
      { href: "/admin/verification?status=rejected", label: "Rejected", icon: MessageSquareWarning }
    ],
    advancedItems: [
      { href: "/admin/hiring/verification-centre", label: "Candidate Verification", icon: ShieldCheck, hiring: true },
      { href: "/admin/invoice-verification", label: "Invoice Verification", icon: ReceiptText, superAdminOnly: true },
      { href: "/admin/payment-verification", label: "Payment Verification", icon: CircleDollarSign, superAdminOnly: true },
      { href: "/admin/enquiry-verification", label: "Enquiry Verification", icon: FileQuestion, superAdminOnly: true },
      { href: "/admin/trust-centre", label: "Trust Centre", icon: ShieldCheck, superAdminOnly: true },
      { href: "/admin/representatives", label: "Representatives", icon: HeartHandshake, superAdminOnly: true },
      { href: "/admin/suspicious-reports", label: "Suspicious Reports", icon: MessageSquareWarning, superAdminOnly: true }
    ]
  },
  {
    href: "/admin/website-experience/festival-studio",
    label: "Festival Studio",
    icon: Sparkles,
    roles: ["super_admin", "website_experience_admin", "read_only_auditor"],
    keywords: ["holiday", "festival", "theme", "website", "assets", "schedule"],
    items: [
      { href: "/admin/website-experience/festival-studio?section=overview", label: "Festival Status", icon: SlidersHorizontal },
      { href: "/admin/website-experience/festival-studio?section=configure", label: "Configure Festival", icon: Sparkles },
      { href: "/admin/website-experience/festival-studio?section=preview", label: "Private Preview", icon: Eye },
      { href: "/admin/website-experience/festival-studio?section=schedule", label: "Apply or Schedule", icon: CalendarDays },
      { href: "/admin/website-experience/festival-studio?section=history", label: "Theme History", icon: Archive }
    ],
    advancedItems: [
      { href: "/admin/website-experience/festival-assets/review", label: "Founder Visual Review", icon: Eye, roles: ["super_admin"] },
      { href: "/admin/website-experience/festival-assets", label: "Festival Asset Library", icon: Archive, roles: ["super_admin"] },
      { href: "/admin/website-experience/designer-hero-packs", label: "Designer Hero Packs", icon: ImagePlus, roles: ["super_admin"] }
    ]
  },
  {
    href: "/admin/system",
    label: "System",
    icon: Settings,
    keywords: ["users", "roles", "notifications", "audit", "health"],
    items: [
      { href: "/admin/roles-permissions#users", label: "Users", icon: UsersRound, superAdminOnly: true },
      { href: "/admin/roles-permissions", label: "Roles", icon: UserCog, superAdminOnly: true },
      { href: "/admin/email", label: "Notifications", icon: Mail, superAdminOnly: true },
      { href: "/admin/system#website-status", label: "Website & Festival Status", icon: Activity },
      { href: "/admin/audit-logs", label: "Audit Activity", icon: FileSearch },
      { href: "/admin/settings", label: "Advanced Settings", icon: SlidersHorizontal }
    ],
    advancedItems: [
      { href: "/admin/ai-governance", label: "AI Usage & Budgets", icon: Gauge, superAdminOnly: true, keywords: ["openai", "academy budget", "token usage", "ai cost", "hard limit"] },
      { href: "/admin/integration-logs", label: "Integrations", icon: Gauge },
      { href: "/admin/storage", label: "Storage", icon: Cloud, superAdminOnly: true },
      { href: "/admin/sync-jobs", label: "Sync Jobs", icon: RefreshCw, superAdminOnly: true },
      { href: "/admin/system-health", label: "System Diagnostics", icon: ServerCog, superAdminOnly: true },
      { href: "/admin/help", label: "Help & Tutorials", icon: BookOpen }
    ]
  }
];

const hiringRoles = new Set([
  "super_admin",
  "hr_admin",
  "hiring_manager",
  "assessor",
  "interviewer",
  "read_only_auditor"
]);

function canViewItem(
  item: Pick<AdminNavigationItem, "superAdminOnly" | "roles" | "hiring">,
  role: string,
  hiringEnabled: boolean
) {
  if (item.superAdminOnly && role !== "super_admin") return false;
  if (item.roles && !item.roles.includes(role)) return false;
  if (item.hiring && (!hiringEnabled || !hiringRoles.has(role))) return false;
  return true;
}

export function getVisibleAdminNavigation({
  role,
  hiringEnabled
}: {
  role: string;
  hiringEnabled: boolean;
}) {
  return adminNavigationGroups
    .filter((group) => canViewItem(group, role, hiringEnabled))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canViewItem(item, role, hiringEnabled)),
      advancedItems: (group.advancedItems || []).filter((item) =>
        canViewItem(item, role, hiringEnabled)
      )
    }))
    .filter((group) => group.items.length > 0 || group.advancedItems.length > 0);
}

function hrefPath(href: string) {
  return href.split(/[?#]/, 1)[0];
}

export function isAdminNavigationItemActive(pathname: string, href: string) {
  const path = hrefPath(href);
  if (pathname === path) return true;
  const exactParents = new Set([
    "/admin/hiring",
    "/admin/help",
    "/admin/client-portal",
    "/admin/trust-centre",
    "/admin/website-experience/festival-studio",
    "/admin/dashboard",
    "/admin/system"
  ]);
  return !exactParents.has(path) && pathname.startsWith(`${path}/`);
}

export function isAdminNavigationGroupActive(
  pathname: string,
  group: AdminNavigationGroup
) {
  if (isAdminNavigationItemActive(pathname, group.href)) return true;
  return [...group.items, ...(group.advancedItems || [])].some((item) =>
    isAdminNavigationItemActive(pathname, item.href)
  );
}

export function findAdminNavigationItem(pathname: string) {
  return adminNavigationGroups
    .flatMap((group) => [group, ...group.items, ...(group.advancedItems || [])])
    .find((item) => isAdminNavigationItemActive(pathname, item.href));
}
