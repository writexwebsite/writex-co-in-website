import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { getFounderReportData } from "@/lib/admin/founderReport";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Founder Report | WriteX Admin",
  robots: { index: false, follow: false }
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="wx-admin-enter rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slateText">{label}</p>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </article>
  );
}

function Table({
  title,
  rows
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
}) {
  const keys = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
      <h2 className="text-lg font-bold">{title}</h2>
      {rows.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-slateText">
              <tr>{keys.map((key) => <th key={key} className="px-3 py-2">{key}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((row, index) => (
                <tr key={index} className="border-t border-sageBorder">
                  {keys.map((key) => (
                    <td key={key} className="px-3 py-2">
                      {String(row[key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slateText">No data available yet.</p>
      )}
    </section>
  );
}

export default async function FounderReportPage() {
  const session = await requireAdminSession();
  const report = await getFounderReportData();
  const biggestLeakagePoint =
    report.leakagePoints
      .map((row) => ({
        label: String(row.label ?? "No leakage data"),
        count: Number(row.count ?? 0)
      }))
      .sort((a, b) => b.count - a.count)[0] ?? {
      label: "No leakage data",
      count: 0
    };

  return (
    <AdminShell session={session} eyebrow="Founder visibility" title="Founder report">
      <div className="mb-5 flex justify-end">
        <Link
          href="/api/admin/founder-report/export.csv"
          className="rounded-md border border-sageBorder bg-white px-4 py-2 text-sm font-bold text-charcoalInk"
        >
          Export CSV
        </Link>
      </div>
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Total leads" value={report.summary.totalLeads} />
        <SummaryCard label="Quotes sent" value={report.summary.quoted} />
        <SummaryCard label="Conversions" value={report.summary.converted} />
        <SummaryCard label="Confirmed revenue" value={money(report.summary.confirmedRevenue)} />
        <SummaryCard label="Estimated pipeline" value={money(report.summary.estimatedPipelineValue)} />
        <SummaryCard label="Quote to conversion" value={`${report.summary.quoteToConversionRate}%`} />
        <SummaryCard
          label="Biggest leakage point"
          value={`${biggestLeakagePoint.label} (${biggestLeakagePoint.count})`}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Table title="Pipeline" rows={report.pipeline} />
        <Table title="Revenue by service" rows={report.revenueByService} />
        <Table title="Revenue by source" rows={report.revenueBySource} />
        <Table title="Revenue by owner" rows={report.revenueByOwner} />
        <Table title="Leakage points" rows={report.leakagePoints} />
        <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold">Founder action queue</h2>
          <div className="mt-4 space-y-3">
            {report.recommendations.map((item) => (
              <p key={item} className="wx-row-hover rounded-md bg-paleSage p-3 text-sm font-semibold">
                {item}
              </p>
            ))}
            {report.recommendations.length === 0 ? (
              <p className="rounded-md bg-paleSage p-3 text-sm text-slateText">
                No founder actions yet. Lead and revenue signals will appear
                here once data is available.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
