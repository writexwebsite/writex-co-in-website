import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FolderLock,
  Headphones,
  ReceiptText,
  ShieldCheck
} from "lucide-react";
import type {
  Availability,
  ClientPortalOverview
} from "@/lib/client/portal-data";
import type {
  BillingInvoice,
  ClientDeliverable,
  ProjectSummary
} from "@/lib/client/providers";

function Surface({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function StateMessage({
  message,
  icon: Icon = Clock3
}: {
  message: string;
  icon?: typeof Clock3;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 text-sm text-wxIndigo500">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-wxViolet700" aria-hidden />
      <p className="leading-6">{message}</p>
    </div>
  );
}

function formatMoney(value?: number, currency = "INR") {
  if (typeof value !== "number") return "Not available";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function ClientOverviewPanels({
  overview
}: {
  overview: ClientPortalOverview;
}) {
  const name = overview.client.displayName
    ? `Welcome, ${overview.client.displayName}`
    : "Welcome to your WriteX workspace";

  return (
    <div className="space-y-6">
      <Surface>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-wxViolet700">
              Invoice {overview.client.invoiceReference}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-wxIndigo500">
              Your verified billing, project, files, support, and safety
              information appears here as each official system becomes
              available.
            </p>
          </div>
          <span
            className={`inline-flex min-h-9 items-center gap-2 self-start rounded-full border px-3 text-xs font-semibold ${
              overview.isTestSession
                ? "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200"
                : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
            }`}
          >
            {overview.isTestSession ? (
              <Clock3 className="h-4 w-4" aria-hidden />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            )}
            {overview.trust.invoice.label}
          </span>
        </div>
      </Surface>

      <div className="grid gap-6 lg:grid-cols-2">
        <BillingPanel billing={overview.billing} />
        <TrustPanel overview={overview} />
        <ProjectPanel project={overview.project} />
        <FilesPanel files={overview.files} />
      </div>

      <Surface>
        <div className="flex items-start gap-4">
          <Headphones className="mt-1 h-6 w-6 text-wxViolet700" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold">Support & Safety</h2>
            <p className="mt-2 text-sm leading-6 text-wxIndigo500">
              Contact WriteX, review official payment guidance, or report
              anything suspicious without exposing internal account details.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="wx-gradient-action inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white" href="/client/support">
                {overview.isTestSession
                  ? "Review test safeguards"
                  : "Contact support"}{" "}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {!overview.isTestSession ? (
                <Link className="inline-flex min-h-11 items-center rounded-md border border-wxBorder px-4 text-sm font-semibold" href="/trust-centre/report">
                  Report suspicious activity
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </Surface>
    </div>
  );
}

export function BillingPanel({
  billing
}: {
  billing: Availability<BillingInvoice>;
}) {
  return (
    <Surface>
      <div className="mb-4 flex items-center gap-3">
        <ReceiptText className="h-5 w-5 text-wxViolet700" aria-hidden />
        <h2 className="text-lg font-semibold">Billing & Order Overview</h2>
      </div>
      {billing.state === "available" ? (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-wxIndigo500">Payment status</dt>
            <dd className="mt-1 font-semibold">
              {billing.data.paymentStatus || "Not available"}
            </dd>
          </div>
          <div>
            <dt className="text-wxIndigo500">Balance</dt>
            <dd className="mt-1 font-semibold">
              {formatMoney(
                billing.data.balanceAmount,
                billing.data.currency || "INR"
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <StateMessage message={billing.message} />
      )}
      <Link href="/client/invoices" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-wxViolet700">
        Open billing <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Surface>
  );
}

export function TrustPanel({
  overview
}: {
  overview: ClientPortalOverview;
}) {
  return (
    <Surface>
      <div className="mb-4 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-wxViolet700" aria-hidden />
        <h2 className="text-lg font-semibold">Trust & Verification</h2>
      </div>
      <div className="space-y-3 text-sm">
        <p
          className={`flex items-center gap-2 font-semibold ${
            overview.isTestSession
              ? "text-orange-800 dark:text-orange-200"
              : "text-green-700 dark:text-green-300"
          }`}
        >
          {overview.isTestSession ? (
            <Clock3 className="h-4 w-4" aria-hidden />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          )}
          {overview.trust.invoice.label}
        </p>
        <p className="text-wxIndigo500">
          {overview.trust.representative.label}
        </p>
        <p className="text-wxIndigo500">
          Payment: {overview.trust.payment.status || overview.trust.payment.label}
        </p>
        {overview.trust.verificationReference ? (
          <p>
            <span className="text-wxIndigo500">Verification ID: </span>
            <span className="font-semibold">
              {overview.trust.verificationReference}
            </span>
          </p>
        ) : null}
      </div>
      <p className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs leading-5 text-orange-900 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
        {overview.trust.safePaymentNotice}
      </p>
      <Link href="/client/security" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-wxViolet700">
        Open Trust & Safety <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Surface>
  );
}

export function ProjectPanel({
  project
}: {
  project: Availability<ProjectSummary>;
}) {
  return (
    <Surface>
      <div className="mb-4 flex items-center gap-3">
        <FileCheck2 className="h-5 w-5 text-wxViolet700" aria-hidden />
        <h2 className="text-lg font-semibold">Project Progress</h2>
      </div>
      {project.state === "available" ? (
        <>
          <p className="text-xl font-semibold">{project.data.publicStage}</p>
          {project.data.publicMessage ? (
            <p className="mt-2 text-sm text-wxIndigo500">
              {project.data.publicMessage}
            </p>
          ) : null}
        </>
      ) : (
        <StateMessage message={project.message} />
      )}
      <Link href="/client/project" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-wxViolet700">
        Open project <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Surface>
  );
}

export function FilesPanel({
  files
}: {
  files: Availability<ClientDeliverable[]>;
}) {
  return (
    <Surface>
      <div className="mb-4 flex items-center gap-3">
        <FolderLock className="h-5 w-5 text-wxViolet700" aria-hidden />
        <h2 className="text-lg font-semibold">Files & Deliverables</h2>
      </div>
      {files.state === "available" ? (
        <p className="text-sm font-semibold">
          {files.data.length} approved {files.data.length === 1 ? "file" : "files"}
        </p>
      ) : (
        <StateMessage message={files.message} />
      )}
      <Link href="/client/files" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-wxViolet700">
        Open files <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Surface>
  );
}

export function ClientEmptyState({
  title,
  message
}: {
  title: string;
  message: string;
}) {
  return (
    <Surface>
      <AlertCircle className="h-7 w-7 text-wxViolet700" aria-hidden />
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-wxIndigo500">
        {message}
      </p>
    </Surface>
  );
}
