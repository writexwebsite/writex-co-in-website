import { ArrowRight, CheckCircle2 } from "lucide-react";
import { processSteps } from "@/lib/content";
import { AnimatedCard } from "./animations/AnimatedCard";
import { Stagger } from "./animations/Stagger";

export function ProcessTimeline() {
  return (
    <div className="relative">
      <div className="absolute left-6 top-8 hidden h-px w-[calc(100%-3rem)] bg-gradient-to-r from-wxBlue500 via-wxViolet700 to-transparent lg:block" />
      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-7" itemClassName="h-full" stagger={0.075}>
        {processSteps.map((step, index) => (
          <AnimatedCard key={step.title} className="h-full">
            <article className="wx-process-step relative h-full rounded-md border border-wxBorder bg-white p-5 text-wxIndigo900 shadow-soft backdrop-blur transition duration-500 hover:border-wxViolet700 hover:bg-wxSurfaceSoft">
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-wxViolet700 text-sm font-bold text-white transition duration-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {index < processSteps.length - 1 ? (
                  <ArrowRight className="hidden h-4 w-4 text-wxBlue500 lg:block" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-softTeal" aria-hidden />
                )}
              </div>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-wxIndigo500">
                {step.description}
              </p>
            </article>
          </AnimatedCard>
        ))}
      </Stagger>
    </div>
  );
}
