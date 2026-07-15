import { FlaskConical } from "lucide-react";

export function DemoBanner({ client = false }: { client?: boolean }) {
  return (
    <div role="status" className="border-y border-violet-300/50 bg-violet-50 px-4 py-2 text-violet-950 dark:border-violet-400/20 dark:bg-violet-950 dark:text-violet-50">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-center text-xs font-semibold sm:text-sm">
        <FlaskConical className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
        {client ? "Demo Workspace - This is fictional sample data. No real client information is displayed." : "Demo Mode - Fictional data. Changes are not saved."}
      </div>
    </div>
  );
}
