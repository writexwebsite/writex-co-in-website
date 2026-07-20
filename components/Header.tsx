"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Menu, UserRound, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { serviceNavItems } from "@/lib/site";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";
import { MobileMenu } from "./MobileMenu";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { ThemeMenu } from "./theme/ThemeMenu";

const desktopNavItems = [
  { label: "About Us", href: "/about-us" },
  { label: "Trust Centre™", href: "/trust-centre" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" }
];

const resourceNavItems = [
  { label: "Help Centre", description: "Read practical, evergreen guidance", href: "/help" },
  { label: "Samples", description: "Review anonymised support examples", href: "/samples" },
  { label: "Reviews", description: "See why students trust the process", href: "/reviews" }
];

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const servicesActive = useMemo(
    () => serviceNavItems.some((item) => isActivePath(pathname, item.href)),
    [pathname]
  );

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-50 border-b text-wxIndigo700 backdrop-blur-xl transition-all duration-200",
        scrolled
          ? "border-wxBorder bg-[var(--wx-header)] shadow-[0_16px_45px_rgba(85,22,242,0.12)]"
          : "border-wxBorder/80 bg-[var(--wx-header)]"
      )}
      initial={false}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={cn(
          "mx-auto flex min-h-[4.5rem] max-w-[90rem] items-center justify-between gap-3 px-4 transition-all duration-200 sm:px-6 lg:px-8",
          scrolled ? "py-2" : "py-2.5"
        )}
      >
        <BrandLogo
          className="shrink-0"
          markClassName={cn(
            "transition-all duration-200",
            scrolled ? "w-36" : "w-40"
          )}
          sizes="160px"
        />

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main">
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
            onFocus={() => setServicesOpen(true)}
            onBlur={(event) => {
              const nextElement = event.relatedTarget;

              if (
                !(nextElement instanceof Node) ||
                !event.currentTarget.contains(nextElement)
              ) {
                setServicesOpen(false);
              }
            }}
          >
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-wxIndigo700 transition duration-200 hover:-translate-y-0.5 hover:bg-wxSurfaceSoft hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700",
                servicesActive && "bg-wxSurfaceSoft text-wxViolet700"
              )}
              aria-expanded={servicesOpen}
              aria-haspopup="menu"
              onClick={() => setServicesOpen((value) => !value)}
            >
              Services
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition duration-300",
                  servicesOpen && "rotate-180"
                )}
                aria-hidden
              />
            </button>

            <AnimatePresence>
              {servicesOpen ? (
                <motion.div
                  className="absolute left-0 top-[calc(100%+0.75rem)] w-80 overflow-hidden rounded-md bg-white/[0.97] p-2 shadow-lift"
                  initial={
                    shouldReduceMotion ? false : { opacity: 0.9, y: 10, scale: 0.98 }
                  }
                  animate={
                    shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }
                  }
                  exit={
                    shouldReduceMotion ? undefined : { opacity: 0.9, y: 8, scale: 0.98 }
                  }
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  role="menu"
                  onMouseLeave={() => setServicesOpen(false)}
                >
                  {serviceNavItems.map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={cn(
                          "block rounded-md px-3 py-3 text-sm font-semibold text-wxIndigo700 transition duration-300 hover:bg-wxSurfaceSoft hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700",
                          active && "bg-wxSurfaceSoft text-wxViolet700"
                        )}
                        onClick={() => {
                          trackQuoteEvent(quoteTrackingEvents.headerServiceClick, { href: item.href });
                          setServicesOpen(false);
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div
            className="relative"
            onMouseEnter={() => setResourcesOpen(true)}
            onMouseLeave={() => setResourcesOpen(false)}
            onFocus={() => setResourcesOpen(true)}
            onBlur={(event) => {
              const nextElement = event.relatedTarget;
              if (!(nextElement instanceof Node) || !event.currentTarget.contains(nextElement)) {
                setResourcesOpen(false);
              }
            }}
          >
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-wxIndigo700 transition duration-200 hover:-translate-y-0.5 hover:bg-wxSurfaceSoft hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700",
                resourceNavItems.some((item) => isActivePath(pathname, item.href)) && "bg-wxSurfaceSoft text-wxViolet700"
              )}
              aria-expanded={resourcesOpen}
              aria-haspopup="menu"
              onClick={() => setResourcesOpen((value) => !value)}
            >
              Resources
              <ChevronDown className={cn("h-4 w-4 transition duration-300", resourcesOpen && "rotate-180")} aria-hidden />
            </button>
            <AnimatePresence>
              {resourcesOpen ? (
                <motion.div
                  role="menu"
                  className="absolute left-0 top-[calc(100%+0.75rem)] w-72 rounded-md border border-wxBorder bg-wxSurface p-2 shadow-lift"
                  initial={shouldReduceMotion ? false : { opacity: 0.9, y: 8, scale: 0.98 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0.9, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  {resourceNavItems.map((item) => (
                    <Link key={item.href} href={item.href} role="menuitem" className="block rounded-md px-3 py-3 transition hover:bg-wxSurfaceSoft focus-visible:outline focus-visible:outline-2 focus-visible:outline-wxViolet700" onClick={() => { trackQuoteEvent(quoteTrackingEvents.headerResourceClick, { href: item.href }); setResourcesOpen(false); }}>
                      <span className="block text-sm font-semibold text-wxIndigo700">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-wxIndigo500">{item.description}</span>
                    </Link>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {process.env.NEXT_PUBLIC_FREE_TOOLS_ENABLED === "true" ? (
            <div
              className="relative"
              onMouseEnter={() => setToolsOpen(true)}
              onMouseLeave={() => setToolsOpen(false)}
              onFocus={() => setToolsOpen(true)}
              onBlur={(event) => {
                const nextElement = event.relatedTarget;
                if (!(nextElement instanceof Node) || !event.currentTarget.contains(nextElement)) setToolsOpen(false);
              }}
            >
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-wxIndigo700 transition duration-200 hover:-translate-y-0.5 hover:bg-wxSurfaceSoft hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700",
                  pathname.startsWith("/tools") || pathname === "/templates" ? "bg-wxSurfaceSoft text-wxViolet700" : ""
                )}
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                onClick={() => setToolsOpen((value) => !value)}
              >
                Free Tools
                <ChevronDown className={cn("h-4 w-4 transition duration-300", toolsOpen && "rotate-180")} aria-hidden />
              </button>
              <AnimatePresence>
                {toolsOpen ? (
                  <motion.div role="menu" className="absolute left-0 top-[calc(100%+0.75rem)] w-64 rounded-md border border-wxBorder bg-wxSurface p-2 shadow-lift" initial={shouldReduceMotion ? false : { opacity: 0.9, y: 8, scale: 0.98 }} animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }} exit={shouldReduceMotion ? undefined : { opacity: 0.9, y: 6, scale: 0.98 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
                    {[
                      { label: "CV Builder", href: "/tools/cv-builder" },
                      { label: "SOP Builder", href: "/tools/sop-builder" },
                      { label: "Templates", href: "/templates" }
                    ].map((item) => (
                      <Link key={item.href} href={item.href} role="menuitem" className="block rounded-md px-3 py-3 text-sm font-semibold text-wxIndigo700 transition hover:bg-wxSurfaceSoft hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wxViolet700" onClick={() => setToolsOpen(false)}>{item.label}</Link>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}

          {desktopNavItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-wxIndigo700 transition duration-200 hover:-translate-y-0.5 hover:bg-wxSurfaceSoft hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700",
                  active && "bg-wxSurfaceSoft text-wxViolet700"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <div
            className="relative"
            onMouseEnter={() => setLoginOpen(true)}
            onMouseLeave={() => setLoginOpen(false)}
            onFocus={() => setLoginOpen(true)}
            onBlur={(event) => {
              const nextElement = event.relatedTarget;
              if (!(nextElement instanceof Node) || !event.currentTarget.contains(nextElement)) {
                setLoginOpen(false);
              }
            }}
          >
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxViolet700/20 bg-wxSurfaceSoft px-3 text-sm font-semibold text-wxIndigo700 transition hover:-translate-y-0.5 hover:border-wxViolet700 hover:text-wxIndigo900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
              aria-expanded={loginOpen}
              aria-haspopup="menu"
              onClick={() => setLoginOpen((value) => !value)}
            >
              <UserRound className="h-4 w-4" aria-hidden />
              Login
              <ChevronDown className={cn("h-4 w-4 transition", loginOpen && "rotate-180")} aria-hidden />
            </button>
            <AnimatePresence>
              {loginOpen ? (
                <motion.div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.75rem)] w-64 rounded-md border border-wxBorder bg-wxSurface p-2 shadow-lift"
                  initial={shouldReduceMotion ? false : { opacity: 0.9, y: 8, scale: 0.98 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0.9, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link href="/client-login" role="menuitem" className="flex items-start gap-3 rounded-md px-3 py-3 transition hover:bg-wxSurfaceSoft focus-visible:outline focus-visible:outline-2 focus-visible:outline-wxViolet700" onClick={() => { trackQuoteEvent(quoteTrackingEvents.clientLoginClicked, { source: "header" }); setLoginOpen(false); }}>
                    <UserRound className="mt-0.5 h-4 w-4 text-wxViolet700" aria-hidden />
                    <span><strong className="block text-sm text-wxIndigo700">Customer Login</strong><span className="text-xs text-wxIndigo500">Access your client workspace</span></span>
                  </Link>
                  <Link href="/employee-login" role="menuitem" className="flex items-start gap-3 rounded-md px-3 py-3 transition hover:bg-wxSurfaceSoft focus-visible:outline focus-visible:outline-2 focus-visible:outline-wxViolet700" onClick={() => { trackQuoteEvent(quoteTrackingEvents.employeeLoginClicked, { source: "header" }); setLoginOpen(false); }}>
                    <UsersRound className="mt-0.5 h-4 w-4 text-wxBlue500" aria-hidden />
                    <span><strong className="block text-sm text-wxIndigo700">Team Login</strong><span className="text-xs text-wxIndigo500">Secure access for WriteX staff</span></span>
                  </Link>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <ThemeMenu />
          <WhatsAppCTA
            label="Get Quote"
            className="min-h-11 px-4 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-wxBorder text-wxIndigo700 transition duration-200 hover:-translate-y-0.5 hover:border-wxViolet700 hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 xl:hidden"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </motion.header>
  );
}

