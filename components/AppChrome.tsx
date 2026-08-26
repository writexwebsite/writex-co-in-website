"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { ClientExperience } from "@/components/ClientExperience";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileStickyCTA } from "@/components/MobileStickyCTA";
import { PageTransition } from "@/components/PageTransition";
import { isAxoRouteEligible } from "@/lib/axo/visibility";
import { activeFestivalSceneAssignments } from "@/lib/holiday/canonical-scene";
import { useHolidayExperience } from "@/components/holiday/HolidayExperienceProvider";
import {
  HolidayAnnouncementBar,
  HolidayAmbientEffects,
  HolidayFestivalAxoRegion,
  HolidayGroundDecoration,
  HolidayPageDecoration,
  HolidayPreviewBar,
  HolidaySitewideDecoration,
  HolidaySoundControl
} from "@/components/holiday/HolidayDecorations";

const AxoExperience = dynamic(
  () => import("@/components/axo/AxoExperience").then((module) => module.AxoExperience),
  { ssr: false }
);

export function AppChrome({
  children,
  showCareers
}: {
  children: ReactNode;
  showCareers: boolean;
}) {
  const pathname = usePathname();
  const { experience } = useHolidayExperience();
  const isAdmin = pathname?.startsWith("/admin");
  const isClientPortal =
    pathname === "/client-login" || pathname?.startsWith("/client");
  const isEmployeePortal = pathname === "/employee-login" || pathname?.startsWith("/employee");
  const hidePublicChrome = isAdmin || isClientPortal || isEmployeePortal;
  const festivalAxoActive = Boolean(
    experience?.theme.applyAxoTheme &&
      experience.theme.applyToHomepage &&
      activeFestivalSceneAssignments(
        experience.theme.experienceConfig.studio,
        ["axo_area"]
      ).length > 0
  );
  const usesInteractiveIndependenceAxo = Boolean(
    experience?.theme.slug === "independence-day" &&
      experience.theme.applyAxoTheme &&
      experience.theme.applyToHomepage
  );
  const showAxo =
    !hidePublicChrome &&
    (!festivalAxoActive || usesInteractiveIndependenceAxo) &&
    isAxoRouteEligible(pathname || "/");
  const showMobileStickyCta =
    !hidePublicChrome && !pathname?.startsWith("/careers");

  return (
    <>
      {hidePublicChrome ? null : <HolidayAnnouncementBar />}
      {hidePublicChrome ? null : <Header showCareers={showCareers} />}
      {hidePublicChrome ? null : <HolidayPageDecoration />}
      {hidePublicChrome ? null : <HolidaySitewideDecoration />}
      {hidePublicChrome ? null : <HolidayAmbientEffects />}
      {hidePublicChrome ? null : <PageTransition />}
      <main
        id="main-content"
        className={hidePublicChrome ? "min-h-screen bg-wxBg text-wxIndigo900" : undefined}
      >
        {children}
      </main>
      {hidePublicChrome || usesInteractiveIndependenceAxo ? null : (
        <HolidayFestivalAxoRegion />
      )}
      {hidePublicChrome ? null : <HolidayGroundDecoration />}
      {hidePublicChrome ? null : <Footer showCareers={showCareers} />}
      {showMobileStickyCta ? <MobileStickyCTA /> : null}
      {hidePublicChrome ? null : <ClientExperience />}
      {showAxo ? <AxoExperience /> : null}
      {hidePublicChrome ? null : <HolidaySoundControl />}
      <HolidayPreviewBar />
    </>
  );
}
