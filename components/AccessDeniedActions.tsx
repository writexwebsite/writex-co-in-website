"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { WhatsAppCTA } from "./WhatsAppCTA";

export function AccessDeniedActions() {
  const router = useRouter();

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-wxViolet700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-wxIndigo700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wxViolet700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Return to Authorised Workspace
      </button>
      <WhatsAppCTA label="Contact Support" variant="outline" />
    </div>
  );
}
