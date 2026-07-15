import "server-only";

import { getFounderReportData } from "@/lib/admin/founderReport";

export async function generateFounderDailyReport(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const report = await getFounderReportData({
    dateFrom: start.toISOString(),
    dateTo: end.toISOString()
  });

  return {
    date: start.toISOString().slice(0, 10),
    summary: report.summary,
    topActions: report.recommendations
  };
}
