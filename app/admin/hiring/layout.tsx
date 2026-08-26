import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";

export default function HiringAdminLayout({ children }: { children: ReactNode }) {
  if (!isHiringFeatureEnabled("admin")) notFound();
  return children;
}
