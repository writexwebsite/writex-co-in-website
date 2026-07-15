import { BadgeCheck, Clock3, LockKeyhole, SearchCheck } from "lucide-react";
import { Stagger } from "./animations/Stagger";
import { SpectrumBackground } from "./visual/SpectrumBackground";

const icons = [Clock3, SearchCheck, LockKeyhole, BadgeCheck];
const iconTones = [
  "bg-wxViolet700/10 text-wxViolet700",
  "bg-wxBlue500/10 text-wxBlue500",
  "bg-wxPink500/10 text-wxPink500",
  "bg-wxGreen500/10 text-wxGreen500"
];

const trustItems = [
  { value: "10+ Years", label: "Industry Experience" },
  { value: "150+ Experts", label: "Team Capability" },
  { value: "Confidential", label: "Your Data Always Safe" },
  { value: "QA-Led", label: "Every Work Reviewed" }
];

export function TrustBar() {
  return (
    <SpectrumBackground
      variant="subtle"
      overlayStrength="section"
      intensity={0.28}
      className="border-y border-wxBorder lg:-mt-5"
    >
      <Stagger
        className="relative mx-auto grid max-w-7xl grid-cols-2 gap-2.5 px-4 py-5 sm:gap-3 sm:px-6 lg:grid-cols-4 lg:px-8"
        itemClassName="h-full"
      >
        {trustItems.map((metric, index) => {
          const Icon = icons[index] || BadgeCheck;
          const iconTone = iconTones[index] || iconTones[0];

          return (
            <div
              key={metric.label}
              className="flex h-full min-h-[6rem] items-start gap-2.5 rounded-xl border border-wxViolet700/10 bg-white/95 p-3 shadow-[0_12px_32px_rgba(61,42,140,0.08)] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-wxViolet700/35 hover:bg-white sm:items-center sm:gap-3 sm:p-4"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconTone}`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-sm font-semibold leading-tight text-charcoalInk sm:text-base">
                  {metric.value}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slateText sm:mt-1.5 sm:text-sm sm:leading-6">
                  {metric.label}
                </p>
              </div>
            </div>
          );
        })}
      </Stagger>
    </SpectrumBackground>
  );
}
