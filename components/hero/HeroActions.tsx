import type { ReactNode } from "react";

type HeroActionsProps = {
  children: ReactNode;
  className?: string;
};

export function HeroActions({ children, className = "" }: HeroActionsProps) {
  return (
    <div
      data-hero-actions
      className={`mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap ${className}`}
    >
      {children}
    </div>
  );
}
