import { type NextRequest, NextResponse } from "next/server";
import { resolveLegacyWordPressUrl } from "@/lib/seo/legacy-wordpress";
import {
  isExpectedMyWritexDemoHost,
  isMyWritexDemoModeEnabled,
} from "@/lib/my-writex/demo-mode";

function withDemoHeaders(response: NextResponse) {
  if (isMyWritexDemoModeEnabled()) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export function proxy(request: NextRequest) {
  if (
    isMyWritexDemoModeEnabled() &&
    !isExpectedMyWritexDemoHost(request.headers.get("host"))
  ) {
    return withDemoHeaders(new NextResponse("Misdirected request", { status: 421 }));
  }
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
      return withDemoHeaders(NextResponse.redirect(canonicalUrl, 301));
    }

    return withDemoHeaders(NextResponse.next());
  }

  if (resolution.type === "redirect") {
    const destination = new URL(resolution.destination, request.url);
    return withDemoHeaders(NextResponse.redirect(destination, 301));
  }

  return withDemoHeaders(new NextResponse(request.method === "HEAD" ? null : "Gone", {
    status: 410,
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  }));
}

export const config = {
  matcher: ["/((?!_next).*)"]
};
