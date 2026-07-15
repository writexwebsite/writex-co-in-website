"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UserRound, UsersRound } from "lucide-react";
import { serviceNavItems } from "@/lib/site";
import { cn } from "@/lib/utils";
import { QuoteCTA } from "./QuoteCTA";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { ThemeToggle } from "./theme/ThemeToggle";

const primaryMobileLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" }
];

const resourceMobileLinks = [
  { label: "Help Centre", href: "/help" },
  { label: "Samples", href: "/samples" },
  { label: "Reviews", href: "/reviews" }
];

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          id="mobile-navigation"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-wxBorder bg-white/[0.98] px-4 pb-28 pt-4 shadow-lift xl:hidden"
          initial={false}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0.9, y: -10 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <nav className="grid gap-2" aria-label="Mobile">
            {primaryMobileLinks.map((item, index) => {
              const active = isActivePath(pathname, item.href);

              return (
                <motion.div
                  key={item.href}
                  initial={false}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.38,
                    ease: [0.22, 1, 0.36, 1],
                    delay: index * 0.025
                  }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "block min-h-12 rounded-md px-3 py-3 text-base font-semibold text-wxIndigo700 transition duration-200 hover:bg-wxSurfaceSoft hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700",
                      active && "bg-wxSurfaceSoft text-wxViolet700"
                    )}
                    onClick={onClose}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-wxBorder pt-5">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-wxViolet700">
              Resources
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {resourceMobileLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-12 items-center rounded-md border border-wxBorder bg-wxSurfaceSoft/70 px-3 py-3 text-sm font-semibold text-wxIndigo700 transition hover:border-wxViolet700/70 hover:bg-white hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700",
                    isActivePath(pathname, item.href) &&
                      "border-wxViolet700/70 bg-white text-wxViolet700"
                  )}
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {process.env.NEXT_PUBLIC_FREE_TOOLS_ENABLED === "true" ? (
            <div className="mt-6 border-t border-wxBorder pt-5">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-wxViolet700">Free Tools</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  { label: "CV Builder", href: "/tools/cv-builder" },
                  { label: "SOP Builder", href: "/tools/sop-builder" },
                  { label: "Templates", href: "/templates" }
                ].map((item) => (
                  <Link key={item.href} href={item.href} className={cn("flex min-h-12 items-center rounded-md border border-wxBorder bg-wxSurfaceSoft/70 px-3 py-3 text-sm font-semibold text-wxIndigo700 transition hover:border-wxViolet700/70 hover:bg-white hover:text-wxViolet700", isActivePath(pathname, item.href) && "border-wxViolet700/70 bg-white text-wxViolet700")} onClick={onClose}>{item.label}</Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-wxBorder pt-5">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-wxViolet700">
              Services
            </p>
            <div className="mt-3 grid gap-2">
              {serviceNavItems.map((item, index) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <motion.div
                    key={item.href}
                    initial={false}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.38,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.08 + index * 0.025
                    }}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "block min-h-12 rounded-md border border-wxBorder bg-wxSurfaceSoft/70 px-3 py-3 text-sm font-semibold text-wxIndigo700 transition duration-200 hover:border-wxViolet700/70 hover:bg-white hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700",
                        active && "border-wxViolet700/70 bg-white text-wxViolet700"
                      )}
                      onClick={onClose}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-2 border-t border-wxBorder pt-5 sm:grid-cols-2">
            <Link
              href="/client-login"
              className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-wxViolet700/20 bg-wxSurfaceSoft px-4 text-sm font-semibold text-wxViolet700"
              onClick={onClose}
            >
              <UserRound className="h-4 w-4" aria-hidden />
              Customer Login
            </Link>
            <Link
              href="/employee-login"
              className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-wxBlue500/20 bg-white px-4 text-sm font-semibold text-wxIndigo700"
              onClick={onClose}
            >
              <UsersRound className="h-4 w-4" aria-hidden />
              Team Login
            </Link>
          </div>

          <div className="mt-5 border-t border-wxBorder pt-5">
            <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-wxIndigo500">Appearance</p>
            <ThemeToggle compact />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <WhatsAppCTA label="Get Quote on WhatsApp" />
            <QuoteCTA label="Share Brief for Review" variant="secondary" />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
