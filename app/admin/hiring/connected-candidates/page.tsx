import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ConnectedCandidateReviewQueue } from "@/components/admin/ConnectedCandidateReviewQueue";
import { canManageConnectedCandidateReviews } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import {
  getConnectedCandidateReviewSummary,
  listConnectedCandidateReviews
} from "@/lib/hiring/connected-candidate-admin";

export const metadata: Metadata = {
  title: "Connected Candidate Review | WriteX Admin",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function ConnectedCandidateReviewsPage() {
  const session = await requireAdminSession();
  if (!canManageConnectedCandidateReviews(session)) notFound();
  const [summary, reviews] = await Promise.all([
    getConnectedCandidateReviewSummary(),
    listConnectedCandidateReviews()
  ]);

  return (
    <AdminShell
      session={session}
      eyebrow="Smart Hiring"
      title="Connected Candidate Review"
    >
      <ConnectedCandidateReviewQueue
        initialSummary={summary}
        initialReviews={reviews}
      />
    </AdminShell>
  );
}

