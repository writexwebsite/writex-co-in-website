import { type NextRequest, NextResponse } from "next/server";
import { resolveLegacyWordPressUrl } from "@/lib/seo/legacy-wordpress";

export function proxy(request: NextRequest) {
  const resolution = resolveLegacyWordPressUrl(
    request.nextUrl.pathname,
    request.nextUrl.searchParams
  );

  if (!resolution) {
    if (
      request.nextUrl.pathname.length > 1 &&
      request.nextUrl.pathname.endsWith("/")
    ) {
      const canonicalUrl = new URL(request.url);
      canonicalUrl.pathname = canonicalUrl.pathname.replace(/\/+$/, "");
      return NextResponse.redirect(canonicalUrl, 301);
    }

    return NextResponse.next();
  }

  if (resolution.type === "redirect") {
    const destination = new URL(resolution.destination, request.url);
    return NextResponse.redirect(destination, 301);
  }

  return new NextResponse(request.method === "HEAD" ? null : "Gone", {
    status: 410,
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  });
}

export const config = {
  matcher: ["/((?!_next).*)"]
};
