import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ClientLogoutButton } from "@/components/client/ClientLogoutButton";
import type { MyWritexCustomer } from "@/lib/my-writex/types";
import { DesktopCustomerNavigation, MobileCustomerBottomNavigation, MobileCustomerNavigation } from "@/components/my-writex/MyWritexNavigation";

export function MyWritexShell({ customer, children }: { customer: MyWritexCustomer; children: ReactNode }) {
  return (
    <div className="my-writex-product selection:bg-[#6339c6] selection:text-white">
      <aside className="mw-sidebar" aria-label="My WriteX sidebar">
        <div className="mw-sidebar-brand">
          <BrandLogo className="mw-sidebar-logo-full" markClassName="w-32" sizes="128px" />
          <span className="mw-sidebar-logo-compact text-sm font-semibold text-[var(--mw-primary)]" aria-label="WriteX">WX</span>
        </div>
        <div className="mw-sidebar-customer mx-3 border-y border-[var(--mw-line)] py-4">
          <p className="mw-meta">Signed in as</p>
          <p className="mt-1 text-sm font-semibold text-[var(--mw-ink)]">{customer.preferredName}</p>
          <p className="mw-meta mt-1 truncate">@{customer.writeXId}</p>
        </div>
        <DesktopCustomerNavigation />
        <div className="mw-sidebar-logout mt-3 w-full"><ClientLogoutButton /></div>
      </aside>

      <div className="mw-app-area">
        <header className="mw-mobile-topbar">
          <BrandLogo markClassName="w-24" sizes="96px" />
          <div className="flex items-center gap-8">
            <span className="hidden items-center gap-2 text-xs font-medium text-[var(--mw-muted)] min-[430px]:inline-flex"><ShieldCheck className="h-4 w-4 text-[var(--mw-green)]" strokeWidth={1.75} />Secure</span>
            <MobileCustomerNavigation />
          </div>
        </header>
        <main className="mw-main">{children}</main>
      </div>
      <MobileCustomerBottomNavigation />
    </div>
  );
}

export function InvoiceWorkspaceShell({ invoiceReference, customerName, children }: { invoiceReference: string; customerName?: string; children: ReactNode }) {
  return (
    <div className="my-writex-product">
      <header className="border-b border-[var(--mw-line)] bg-white">
        <div className="mx-auto flex h-16 max-w-[1260px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <BrandLogo markClassName="w-28" sizes="112px" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block"><p className="mw-eyebrow">Quick Project Workspace</p><p className="mw-meta mt-1">{customerName || `Invoice ${invoiceReference}`}</p></div>
            <ClientLogoutButton />
          </div>
        </div>
      </header>
      <nav aria-label="Project workspace navigation" className="sticky top-0 z-20 border-b border-[var(--mw-line)] bg-white">
        <div className="mw-segmented-nav mx-auto max-w-[1260px] px-4 sm:px-6 lg:px-10">
          {[['/client/overview','Overview'],['/client/project#quality','Quality'],['/client/project#files','Files'],['/client/project#invoice','Invoice & Payment'],['/client/requests','Requests'],['/client/support','Support']].map(([href,label]) => <Link key={href} href={href}>{label}</Link>)}
        </div>
      </nav>
      <main className="mw-main">{children}</main>
    </div>
  );
}
