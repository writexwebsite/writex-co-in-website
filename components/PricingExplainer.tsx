import { Calculator, Clock, FileText, GraduationCap } from "lucide-react";
import { SectionReveal } from "./SectionReveal";

const pricingFactors = [
  {
    title: "Service Type",
    description:
      "Editing, dissertation support, SOP work, referencing, and research guidance require different levels of expert time.",
    icon: FileText
  },
  {
    title: "Academic Level",
    description:
      "Undergraduate, postgraduate, doctoral, and admissions documents are scoped differently.",
    icon: GraduationCap
  },
  {
    title: "Deadline",
    description:
      "Urgency affects availability, review depth, and delivery planning.",
    icon: Clock
  },
  {
    title: "Document Condition",
    description:
      "A polished draft, rough notes, rubric-only request, or full chapter review each needs a different workflow.",
    icon: Calculator
  }
];

export function PricingExplainer() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {pricingFactors.map((factor, index) => {
        const Icon = factor.icon;
        return (
          <SectionReveal key={factor.title} delay={index * 0.05}>
            <div className="h-full rounded-md border border-sageBorder bg-white p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxViolet700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-charcoalInk">
                {factor.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slateText">
                {factor.description}
              </p>
            </div>
          </SectionReveal>
        );
      })}
    </div>
  );
}
