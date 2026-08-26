import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

type HeroEyebrowProps = {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function HeroEyebrow({
  children,
  icon = <ShieldCheck className="h-3.5 w-3.5" aria-hidden />,
  className = ""
}: HeroEyebrowProps) {
  return (
    <p
      data-hero-eyebrow
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border border-wxBorder bg-white/85 px-3 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-wxViolet700 shadow-sm backdrop-blur ${className}`}
    >
      {icon}
      <span>{children}</span>
    </p>
  );
}
