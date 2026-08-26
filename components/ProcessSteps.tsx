import { CheckCircle2 } from "lucide-react";
import { processSteps } from "@/lib/content";
import { SectionReveal } from "./SectionReveal";
import { cn } from "@/lib/utils";

type ProcessStep = {
  title: string;
  description: string;
};

type ProcessStepsProps = {
  steps?: ProcessStep[];
  className?: string;
  animated?: boolean;
};

export function ProcessSteps({
  steps = processSteps,
  className,
  animated = true
}: ProcessStepsProps = {}) {
  return (
    <div
      className={cn(
        "relative grid gap-4 md:grid-cols-2",
        steps.length === 5 ? "xl:grid-cols-5" : "lg:grid-cols-4",
        className
      )}
    >
      {steps.map((step, index) => {
        const card = (
          <article className="relative h-full rounded-md border border-wxBorder bg-white p-5 text-wxIndigo900 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-mutedCopper">
                Step {index + 1}
              </span>
              <CheckCircle2 className="h-5 w-5 text-softTeal" aria-hidden />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-wxIndigo500">
              {step.description}
            </p>
          </article>
        );

        return animated ? (
          <SectionReveal key={step.title} delay={index * 0.06}>
            {card}
          </SectionReveal>
        ) : (
          <div key={step.title}>{card}</div>
        );
      })}
    </div>
  );
}
