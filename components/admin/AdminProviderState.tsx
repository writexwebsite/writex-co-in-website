import { ArrowRight, Cable, CircleCheck, TriangleAlert } from "lucide-react";
import { AdminPanel, AdminStatus } from "@/components/admin/AdminPrimitives";

export function AdminProviderState({
  title,
  status,
  description,
  requirements,
  actions
}: {
  title: string;
  status: string;
  description: string;
  requirements: string[];
  actions?: Array<{ label: string; href: string }>;
}) {
  const unavailable = ["unavailable", "awaiting_connection", "not_configured"].includes(
    status.toLowerCase()
  );
  return (
    <AdminPanel title={title} description={description}>
      <div className="grid gap-5 lg:grid-cols-[.78fr_1.22fr]">
        <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-5">
          <div className="flex items-center justify-between gap-3">
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${
                unavailable
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {unavailable ? (
                <Cable className="h-5 w-5" />
              ) : (
                <CircleCheck className="h-5 w-5" />
              )}
            </span>
            <AdminStatus status={status} />
          </div>
          <p className="mt-5 text-sm leading-6 text-wxIndigo500">
            {unavailable
              ? "This workflow is prepared, but a live provider has not been activated. No mock result will be shown."
              : "The configured provider is available to this server-side workflow."}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-wxIndigo900">
            Required before activation
          </h3>
          <ul className="mt-3 grid gap-2">
            {requirements.map((item) => (
              <li
                key={item}
                className="flex gap-2 rounded-md border border-wxBorder px-3 py-3 text-sm leading-5 text-wxIndigo600"
              >
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-wxOrange500" />
                {item}
              </li>
            ))}
          </ul>
          {actions?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxViolet700 hover:border-wxViolet700"
                >
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </AdminPanel>
  );
}
