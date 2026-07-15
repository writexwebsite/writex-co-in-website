"use client";

import { useEffect } from "react";
import { trackQuoteEvent, type QuoteTrackingEvent } from "@/lib/tracking";

export function PageAnalytics({
  event,
  pagePath
}: {
  event: QuoteTrackingEvent;
  pagePath: string;
}) {
  useEffect(() => {
    trackQuoteEvent(event, { page_path: pagePath });
  }, [event, pagePath]);

  return null;
}
