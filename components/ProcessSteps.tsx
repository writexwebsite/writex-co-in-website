import { CheckCircle2 } from "lucide-react";
import { processSteps } from "@/lib/content";
import { SectionReveal } from "./SectionReveal";

export function ProcessSteps() {
  return (
    <div className="relative grid gap-5 lg:grid-cols-4">
      {processSteps.map((step, index) => (
        <SectionReveal key={step.title} delay={index * 0.06}>
          <div className="relative h-full rounded-md border border-wxBorder bg-white p-6 text-wxIndigo900 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-mutedCopper">
                Step {index + 1}
              </span>
              <CheckCircle2 className="h-5 w-5 text-softTeal" aria-hidden />
            </div>
            <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-wxIndigo500">
              {step.description}
            </p>
          </div>
        </SectionReveal>
      ))}
    </div>
  );
}
