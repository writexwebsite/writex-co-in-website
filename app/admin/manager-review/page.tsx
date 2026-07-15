import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getManagerReview } from "@/lib/admin/managerReview";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Manager Review | WriteX Admin",
  robots: { index: false, follow: false }
};

function Panel({ title, data }: { title: string; data: Record<string, unknown> }) {
  return (
    <section className="wx-admin-enter rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="wx-row-hover flex justify-between rounded-md bg-paleSage px-4 py-3 text-sm">
            <span className="font-semibold capitalize text-slateText">
              {key.replace(/([A-Z])/g, " $1")}
            </span>
            <span className="font-bold">{String(value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function ManagerReviewPage() {
  const session = await requireAdminSession();
  const review = await getManagerReview();

  return (
    <AdminShell session={session} eyebrow="Daily cockpit" title="Manager review">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Lead leakage risk" data={review.leadLeakage} />
        <Panel title="Revenue action queue" data={review.revenueQueue} />
        <Panel title="Accounts queue" data={review.accountsQueue} />
        <Panel title="Operations queue" data={review.operationsQueue} />
        <Panel title="System issues" data={review.systemIssues} />
      </div>
    </AdminShell>
  );
}
