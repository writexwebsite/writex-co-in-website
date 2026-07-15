import "server-only";

import { getFounderReportData } from "@/lib/admin/founderReport";

export async function generateFounderWeeklyReport(weekStart: Date, weekEnd: Date) {
  const report = await getFounderReportData({
    dateFrom: weekStart.toISOString(),
    dateTo: weekEnd.toISOString()
  });

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
    summary: report.summary,
    recommendations: report.recommendations
  };
}
