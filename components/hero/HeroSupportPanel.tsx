import type { ReactNode } from "react";
import {
  HeroSupportCard,
  type HeroSupportCardData
} from "./HeroSupportCard";

type HeroSupportPanelProps = {
  cards?: HeroSupportCardData[];
  children?: ReactNode;
  className?: string;
};

export function HeroSupportPanel({
  cards,
  children,
  className = ""
}: HeroSupportPanelProps) {
  return (
    <div
      data-hero-support-panel
      className={`relative grid content-center gap-3 sm:grid-cols-2 lg:grid-cols-1 ${className}`}
    >
      {children ??
        cards?.map((card, index) => (
          <HeroSupportCard key={card.title} {...card} index={index} />
        ))}
    </div>
  );
}
