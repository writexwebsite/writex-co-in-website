"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { ClientExperience } from "@/components/ClientExperience";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileStickyCTA } from "@/components/MobileStickyCTA";
import { PageTransition } from "@/components/PageTransition";

const AxoExperience = dynamic(
  () => import("@/components/axo/AxoExperience").then((module) => module.AxoExperience),
  { ssr: false }
);

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isClientPortal =
    pathname === "/client-login" || pathname?.startsWith("/client");
  const isEmployeePortal = pathname === "/employee-login" || pathname?.startsWith("/employee");
  const isMyWritex = pathname === "/my-writex" || pathname?.startsWith("/my-writex/");
  const hidePublicChrome = isAdmin || isClientPortal || isEmployeePortal || isMyWritex;

  return (
    <>
      {hidePublicChrome ? null : <Header />}
      {hidePublicChrome ? null : <PageTransition />}
      <main
        id="main-content"
        className={hidePublicChrome ? "min-h-screen bg-wxBg text-wxIndigo900" : undefined}
      >
        {children}
      </main>
      {hidePublicChrome ? null : <Footer />}
      {hidePublicChrome ? null : <MobileStickyCTA />}
      {hidePublicChrome ? null : <ClientExperience />}
      {hidePublicChrome ? null : <AxoExperience />}
    </>
  );
}
