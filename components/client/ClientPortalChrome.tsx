import Link from "next/link";
import type { ReactNode } from "react";
import {
  FileText,
  FlaskConical,
  FolderLock,
  Headphones,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck
} from "lucide-react";
import type { ClientSession } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { ClientLogoutButton } from "@/components/client/ClientLogoutButton";
import { ThemeMenu } from "@/components/theme/ThemeMenu";

const navigation = [
  { href: "/client/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/client/invoices", label: "Billing", icon: ReceiptText },
  { href: "/client/project", label: "Project", icon: FileText },
  { href: "/client/files", label: "Files", icon: FolderLock },
  { href: "/client/support", label: "Support", icon: Headphones },
  { href: "/client/security", label: "Trust & Safety", icon: ShieldCheck }
];

export function ClientPortalChrome({
  session,
  title,
  eyebrow,
  children
}: {
  session: ClientSession;
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-wxBg text-wxIndigo900">
      <header className="border-b border-wxBorder bg-wxSurface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/client/overview" aria-label="WriteX client portal">
            <BrandLogo markClassName="w-32 sm:w-36" sizes="144px" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeMenu />
            <ClientLogoutButton />
          </div>
        </div>
      </header>
      {session.testSession ? (
        <div
          role="status"
          className="border-b border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-900 dark:bg-orange-950/45 dark:text-orange-100"
        >
          <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:px-6">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-bold">Test Session</p>
              <p className="mt-0.5 text-xs leading-5">
                This portal is showing sanitized demonstration data. Real
                payments, downloads, customer actions, and external
                notifications are disabled.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mx-auto grid max-w-7xl gap-0 md:grid-cols-[14rem_minmax(0,1fr)]">
        <nav
          aria-label="Client portal navigation"
          className="border-b border-wxBorder bg-wxSurface px-4 py-3 md:min-h-[calc(100vh-73px)] md:border-b-0 md:border-r md:px-4 md:py-6"
        >
          <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold text-wxIndigo500 transition hover:bg-wxSurfaceSoft hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-6 hidden border-t border-wxBorder pt-5 md:block">
            <p className="text-xs font-semibold uppercase text-wxIndigo500">
              {session.testSession ? "Test invoice" : "Verified invoice"}
            </p>
            <p className="mt-1 break-all text-sm font-semibold">
              {session.invoiceId}
            </p>
          </div>
        </nav>
        <main className="min-w-0 px-4 py-7 sm:px-6 md:px-8 md:py-9">
          <header className="mb-7">
            <p className="text-xs font-bold uppercase text-wxViolet700">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h1>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
