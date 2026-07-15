import { NextResponse } from "next/server";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const environment = process.env.APP_ENV || process.env.NODE_ENV || "development";
  const databaseConfigured = isDatabaseConfigured();
  const databaseRequired =
    process.env.HEALTHCHECK_REQUIRE_DATABASE === "true" ||
    (environment === "production" && process.env.HEALTHCHECK_REQUIRE_DATABASE !== "false");
  let database: "ok" | "unavailable" | "not_configured" = databaseConfigured
    ? "unavailable"
    : "not_configured";

  if (databaseConfigured) {
    try {
      await dbQuery("select 1 as health_check");
      database = "ok";
    } catch {
      database = "unavailable";
    }
  }

  const healthy = !databaseRequired || database === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "unavailable",
      app: "writex-co-in",
      environment,
      database,
      timestamp: new Date().toISOString()
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" }
    }
  );
}
