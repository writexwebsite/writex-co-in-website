"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-wxIndigo600 transition hover:bg-wxSurfaceSoft hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
      aria-label="Go back to the previous Admin page"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back
    </button>
  );
}
