import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./animations/Reveal";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  children?: ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  children
}: SectionHeaderProps) {
  return (
    <Reveal
      className={cn(
        "mb-7 max-w-3xl",
        align === "center" && "mx-auto text-center"
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-sm font-semibold uppercase text-softTeal">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-8 text-slateText">{description}</p>
      ) : null}
      {children}
    </Reveal>
  );
}
