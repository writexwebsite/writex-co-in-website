import {
  serviceSeoBySlug,
  serviceSeoContent
} from "@/content/services";
import { helpSeoBySlug, helpSeoContent } from "@/content/help";
import type {
  SeoContentCollection,
  SeoContentSource,
  SeoFaqItem,
  SeoInternalLink
} from "@/content/types";

export type {
  SeoContentCollection,
  SeoContentSource as SeoContentPage,
  SeoFaqItem,
  SeoInternalLink
};

export const coreServiceSeoPages = serviceSeoContent;
export const helpSeoPages = helpSeoContent;

export const coreServiceSeoPageBySlug = serviceSeoBySlug;
export const helpSeoPageBySlug = helpSeoBySlug;

export const allSeoContentPages: SeoContentSource[] = [
  ...coreServiceSeoPages,
  ...helpSeoPages
];

export const launchSeoContentPages = allSeoContentPages.filter(
  (page) => page.rolloutPhase === "launch"
);

export const phaseTwoSeoContentPages = allSeoContentPages.filter(
  (page) => page.rolloutPhase === "phase-2"
);

// Backwards-compatible names while /help-centre redirects to /help.
export const helpCentreSeoPages = helpSeoPages;
export const helpCentreSeoPageBySlug = helpSeoPageBySlug;

export const seoPagePaths = allSeoContentPages.map((page) => page.path);
