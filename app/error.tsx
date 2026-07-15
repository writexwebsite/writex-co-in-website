"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <SpectrumBackground variant="section" overlayStrength="strong" intensity={0.24}>
      <div className="premium-container flex min-h-[52vh] items-center py-10">
        <div className="max-w-2xl rounded-md border border-wxBorder bg-white p-6 shadow-soft sm:p-8">
          <AlertTriangle className="h-6 w-6 text-wxOrange500" aria-hidden />
          <h1 className="mt-5 text-3xl font-semibold text-wxIndigo900 sm:text-4xl">This page could not load properly</h1>
          <p className="mt-4 text-base leading-8 text-wxIndigo500">
            Your information has not been intentionally cleared. Try the page again, or contact WriteX if the issue continues.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-wxViolet700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-wxIndigo700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wxViolet700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Try Again
            </button>
            <WhatsAppCTA label="Contact Support" variant="outline" />
          </div>
        </div>
      </div>
    </SpectrumBackground>
  );
}
