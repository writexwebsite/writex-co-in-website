import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { isMyWritexDemoModeEnabled } from "@/lib/my-writex/demo-mode";

export default function robots(): MetadataRoute.Robots {
  if (isMyWritexDemoModeEnabled()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/client/", "/employee/"]
    },
    sitemap: `${siteConfig.url.replace(/\/$/, "")}/sitemap.xml`
  };
}
