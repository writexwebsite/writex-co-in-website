import { subjectGroups } from "@/lib/content";
import { AnimatedCard } from "./animations/AnimatedCard";
import { Stagger } from "./animations/Stagger";

function getSubjectInitials(subject: string) {
  return subject
    .replace(/[&/]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function SubjectGrid() {
  return (
    <div>
      <Stagger
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        stagger={0.025}
      >
        {subjectGroups.map((subject) => (
          <AnimatedCard key={subject}>
            <div className="group flex min-h-[76px] items-center gap-3 rounded-md border border-sageBorder/90 bg-white px-4 py-4 text-sm font-semibold text-charcoalInk shadow-sm transition duration-500 hover:border-mutedCopper/80 hover:bg-warmIvory hover:shadow-lift">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-softTeal/20 bg-softTeal/10 text-xs font-bold text-softTeal transition duration-500 group-hover:border-mutedCopper/40 group-hover:bg-mutedCopper/10 group-hover:text-mutedCopper"
              >
                {getSubjectInitials(subject)}
              </span>
              <span>{subject}</span>
            </div>
          </AnimatedCard>
        ))}
      </Stagger>
      <p className="mt-5 rounded-md border border-sageBorder bg-white/70 px-4 py-3 text-sm leading-6 text-slateText">
        Support availability depends on deadline, brief clarity, academic
        level, and subject complexity.
      </p>
    </div>
  );
}
