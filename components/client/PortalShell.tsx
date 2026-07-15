import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeMenu } from "@/components/theme/ThemeMenu";
import { DemoBanner } from "@/components/demo/DemoBanner";

export function PortalShell({
  children,
  eyebrow,
  title,
  subtitle,
  isDemo = false
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  isDemo?: boolean;
}) {
  return (
    <div className="min-h-screen bg-wxBg text-wxIndigo900">
      <header className="border-b border-wxBorder bg-wxSurface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <BrandLogo markClassName="h-9 w-32" />
          <div className="flex items-center gap-2">
            {isDemo ? <span className="rounded-full border border-wxBorder px-2.5 py-1 text-xs font-bold text-wxViolet700">Demo</span> : null}
            <ThemeMenu />
          </div>
        </div>
      </header>
      {isDemo ? <DemoBanner client /> : null}

      {title ? (
        <section className="mx-auto max-w-6xl px-5 py-8">
          {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-wxViolet700">{eyebrow}</p> : null}
          <h1 className="max-w-3xl text-3xl font-semibold md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-3 max-w-2xl text-sm leading-6 text-wxIndigo500 md:text-base">{subtitle}</p> : null}
        </section>
      ) : null}

      <main className="mx-auto max-w-6xl px-5 py-8 pb-12 sm:py-10">{children}</main>
    </div>
  );
}
