import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/schema";
import { buildMetadata, siteConfig } from "@/lib/site";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";
import { HolidayExperienceProvider } from "@/components/holiday/HolidayExperienceProvider";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "WriteX",
    description: siteConfig.description,
    path: "/",
    keywords: [
      "academic support",
      "dissertation support",
      "editing proofreading",
      "SOP admissions writing",
      "originality review"
    ]
  }),
  metadataBase: new URL(siteConfig.url)
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F8FF"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const showCareers = isHiringFeatureEnabled("applications");

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link
          rel="preload"
          as="image"
          href="/images/backgrounds/writex-spectrum-bg-desktop.webp"
          type="image/webp"
          media="(min-width: 768px)"
        />
        <link
          rel="preload"
          as="image"
          href="/images/backgrounds/writex-spectrum-bg-mobile.webp"
          type="image/webp"
          media="(max-width: 767px)"
        />
      </head>
      <body>
        <ThemeProvider>
          <HolidayExperienceProvider>
            <JsonLd data={[organizationSchema(), websiteSchema()]} />
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-wxViolet700 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
            >
              Skip to content
            </a>
            <AppChrome showCareers={showCareers}>{children}</AppChrome>
          </HolidayExperienceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
