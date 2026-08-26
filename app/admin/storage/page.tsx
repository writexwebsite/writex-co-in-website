import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AdminPanel,
  AdminStatus
} from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/lib/admin/session";
import { getS3Health } from "@/lib/storage/s3-health";

export const metadata: Metadata = {
  title: "Private Storage | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function StoragePage() {
  const session = await requireAdminSession();
  if (session.role !== "super_admin") notFound();
  const health = await getS3Health({ force: true });
  const checks = [
    ["Configuration", health.configured ? "configured" : "failed"],
    ["Reachability", health.reachable ? "healthy" : "failed"],
    [
      "Private access",
      health.privateAccess === true
        ? "approved"
        : health.privateAccess === false
          ? "failed"
          : "unable_to_verify"
    ],
    [
      "Public access block",
      health.publicAccessBlocked === true
        ? "approved"
        : health.publicAccessBlocked === false
          ? "failed"
          : "unable_to_verify"
    ]
  ] as const;
  return (
    <AdminShell
      session={session}
      eyebrow="System"
      title="Private storage"
      description="Sanitised S3 readiness for evidence and approved file workflows. Bucket names, object keys and credentials remain hidden."
      nextAction={
        health.state !== "configured_healthy"
          ? {
              label: "Review storage configuration",
              reason: "One or more private-storage checks are not healthy.",
              href: "/admin/help"
            }
          : undefined
      }
    >
      <AdminPanel
        title="S3 security checks"
        description={`Last checked ${new Date(health.lastCheckedAt).toLocaleString("en-IN")}.`}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {checks.map(([label, status]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
            >
              <span className="font-medium text-wxIndigo700">{label}</span>
              <AdminStatus status={status} />
            </div>
          ))}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
