import type { ReactNode } from "react";
import { Reveal } from "./animations/Reveal";

type SectionRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function SectionReveal({
  children,
  className,
  delay = 0
}: SectionRevealProps) {
  return (
    <Reveal className={className} delay={delay}>
      {children}
    </Reveal>
  );
}
