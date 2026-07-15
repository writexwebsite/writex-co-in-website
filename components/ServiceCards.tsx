"use client";

import {
  BookOpenCheck,
  ClipboardCheck,
  FileSearch,
  GraduationCap,
  PenLine,
  ShieldCheck
} from "lucide-react";
import { services } from "@/lib/content";
import { AnimatedCard } from "./animations/AnimatedCard";
import { Stagger } from "./animations/Stagger";
import { ServiceCard } from "./ServiceCard";

const icons = [
  BookOpenCheck,
  GraduationCap,
  PenLine,
  FileSearch,
  ShieldCheck,
  ClipboardCheck
];

export function ServiceCards() {
  return (
    <Stagger
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      itemClassName="h-full"
      stagger={0.055}
    >
      {services.map((service, index) => {
        const Icon = icons[index] || BookOpenCheck;
        return (
          <AnimatedCard key={service.href} className="h-full" hover={false}>
            <ServiceCard service={service} icon={Icon} />
          </AnimatedCard>
        );
      })}
    </Stagger>
  );
}
