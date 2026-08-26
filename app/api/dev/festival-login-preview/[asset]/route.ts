import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const approvedAssets = new Set(["desktop", "tablet", "mobile"]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ asset: string }> }
) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_DEV_FESTIVAL_PREVIEW !== "independence-day"
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const { asset } = await context.params;
  if (!approvedAssets.has(asset)) {
    return new NextResponse(null, { status: 404 });
  }

  const file = await readFile(
    path.join(
      process.cwd(),
      "artifacts",
      "login-layout-local-uat",
      "assets",
      `${asset}.webp`
    )
  );

  return new NextResponse(file, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "image/webp",
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  });
}
