import type { ReactNode } from "react";
import { ThemeMenu } from "@/components/theme/ThemeMenu";
import { AxoLoginTransition } from "@/components/auth/axo/AxoLoginTransition";
import { AxoStaticFallback } from "@/components/auth/axo/AxoStaticFallback";
import type { AxoStoryVariant } from "@/lib/auth/axoStoryConfig";
import { BrandLogo } from "@/components/BrandLogo";

type AuthShellProps = {
  variant: AxoStoryVariant;
  children: ReactNode;
};

export function AuthShell({ variant, children }: AuthShellProps) {
  const copy = variant === "client"
    ? {
        title: "Your work. Your progress. Your access.",
        description: "One secure workspace for status, payment, preview, and delivery."
      }
    : {
        title: "One workplace. The right view for every role.",
        description: "Sign in once to reach the tools and work assigned to you."
  };

  return (
    <main className="wx-auth-shell relative min-h-[100svh] overflow-hidden text-wxIndigo900">
      <a href="#auth-first-input" className="sr-only z-[100] rounded-md bg-wxSurface px-4 py-3 font-semibold text-wxIndigo900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to login form
      </a>
      <div aria-hidden className="wx-auth-unified-background pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="wx-auth-global-facets pointer-events-none absolute inset-0 bg-[url('/images/auth/axo/background-facets.svg')] bg-cover bg-center"
      />
      <div aria-hidden className="wx-auth-global-ambience pointer-events-none absolute inset-0" />
      <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6"><ThemeMenu /></div>

      <div className="relative z-10 mx-auto grid min-h-[100svh] w-full min-w-0 max-w-[120rem] grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,58fr)_minmax(28rem,42fr)]">
        <section
          aria-label="WriteX brand"
          className="wx-auth-brand-panel relative hidden min-h-[100svh] overflow-hidden lg:block"
        >
          <div aria-hidden className="wx-auth-left-elements pointer-events-none absolute inset-0">
            <span className="wx-auth-platform-light" />
          </div>
          <div className="wx-auth-brand-copy absolute left-[9.5%] top-[5.5%] z-20 max-w-[24rem]">
            <BrandLogo
              markClassName="wx-auth-hero-logo w-[18rem] xl:w-[22.5rem]"
              sizes="(min-width: 1280px) 360px, 288px"
            />
            <h2 className="mt-5 max-w-[22rem] text-[clamp(1.65rem,2.1vw,2.2rem)] font-medium leading-[1.12] text-wxIndigo900">
              {copy.title}
            </h2>
            <p className="mt-3 max-w-[21rem] text-[15px] leading-6 text-wxIndigo500">
              {copy.description}
            </p>
            <span aria-hidden className="mt-5 block h-1 w-24 rounded-full bg-[linear-gradient(90deg,#6D28D9_0_58%,#F97316_58%_100%)]" />
          </div>

          <div className="wx-auth-art-stage absolute bottom-[-2%] right-[-2%] top-[-1%] z-10 w-[108%] max-w-[64rem]">
            <AxoStaticFallback priority variant={variant} />
          </div>
          <div aria-hidden className="wx-auth-crystal-cluster pointer-events-none absolute">
            <span className="wx-auth-crystal wx-auth-crystal-a" />
            <span className="wx-auth-crystal wx-auth-crystal-b" />
            <span className="wx-auth-crystal wx-auth-crystal-c" />
            <span className="wx-auth-crystal wx-auth-crystal-d" />
            <span className="wx-auth-crystal wx-auth-crystal-e" />
          </div>
        </section>
        <aside aria-label={variant === "client" ? "Client login" : "Employee login"} className="relative flex min-h-[100svh] min-w-0 items-start justify-center px-4 pb-8 pt-20 sm:px-8 sm:pt-24 lg:items-center lg:px-6 lg:py-7 xl:px-8 2xl:px-10">
          <div className="w-full min-w-0 max-w-[32rem]">
            <AxoLoginTransition>{children}</AxoLoginTransition>
          </div>
        </aside>
      </div>
    </main>
  );
}

