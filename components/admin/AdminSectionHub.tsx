import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";

export type AdminHubTask = {
  title: string;
  description: string;
  href: string;
  status?: string;
};

export function AdminSectionHub({
  tasks,
  advanced = []
}: {
  tasks: AdminHubTask[];
  advanced?: AdminHubTask[];
}) {
  return (
    <>
      <section aria-labelledby="common-tasks-heading">
        <div className="mb-4">
          <h2 id="common-tasks-heading" className="text-xl font-semibold text-wxIndigo900">
            Common tasks
          </h2>
          <p className="mt-1 text-sm text-wxIndigo500">
            Start with the outcome you need. Each task opens the existing operational workspace.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <Link
              key={`${task.title}-${task.href}`}
              href={task.href}
              className="group flex min-h-[116px] flex-col rounded-md border border-wxBorder bg-wxSurface p-4 shadow-soft transition hover:border-wxViolet700"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-wxIndigo900">{task.title}</h3>
                {task.status ? (
                  <span className="shrink-0 rounded-full border border-wxBorder bg-wxSurfaceSoft px-2 py-1 text-[10px] font-semibold text-wxIndigo600">
                    {task.status}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-5 text-wxIndigo500">{task.description}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-semibold text-wxViolet700">
                Open task
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {advanced.length ? (
        <details className="mt-7 rounded-md border border-wxBorder bg-wxSurface">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 text-sm font-semibold text-wxIndigo800">
            <Wrench className="h-4 w-4 text-wxViolet700" />
            Advanced and less frequent tools
            <span className="ml-auto text-xs font-normal text-wxIndigo500">
              {advanced.length} tools
            </span>
          </summary>
          <div className="grid gap-2 border-t border-wxBorder p-3 md:grid-cols-2">
            {advanced.map((task) => (
              <Link
                key={`${task.title}-${task.href}`}
                href={task.href}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md px-3 text-sm text-wxIndigo700 transition hover:bg-wxSurfaceSoft hover:text-wxViolet700"
              >
                <span>
                  <strong className="font-semibold">{task.title}</strong>
                  <span className="ml-2 text-xs text-wxIndigo500">{task.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}
