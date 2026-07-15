"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/site";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

export function MobileStickyCTA() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-wxBorder bg-white/[0.95] px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-16px_45px_rgba(85,22,242,0.14)] backdrop-blur-xl lg:hidden"
      aria-label="Quick contact actions"
    >
      <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
        <a
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noreferrer"
          aria-label="Send Brief on WhatsApp"
          onClick={() =>
            trackQuoteEvent(quoteTrackingEvents.whatsappQuoteClicked, {
              source: "mobile_sticky_cta"
            })
          }
          className="wx-gradient-action inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold shadow-soft transition active:scale-[0.99]"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Send Brief
        </a>
        <Link
          href="/pricing#quote"
          aria-label="Get Quote"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-wxViolet700/30 bg-white px-3 text-sm font-semibold text-wxIndigo900 shadow-soft transition active:scale-[0.99]"
        >
          <FileText className="h-4 w-4" aria-hidden />
          Quote
        </Link>
      </div>
    </div>
  );
}
