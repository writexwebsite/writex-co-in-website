import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CandidateStatusLookup } from "@/components/hiring/CandidateStatusLookup";
import { CTAButton } from "@/components/CTAButton";
import { PageHero } from "@/components/PageHero";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";

export const metadata: Metadata = {
  title: "Application Status | WriteX Careers",
  robots: { index: false, follow: false }
};

export default function ApplicationStatusPage() {
  if (!isHiringFeatureEnabled("applications")) notFound();

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="WriteX Careers"
        title="Check Your Application Status"
        description="Use your application reference and registered contact detail to view a safe public stage. Scores, reviewer notes, and integrity signals remain private."
        actions={
          <CTAButton href="/careers" variant="secondary">
            View Careers
          </CTAButton>
        }
        supportVisual={<CandidateStatusLookup />}
      />
    </div>
  );
}
