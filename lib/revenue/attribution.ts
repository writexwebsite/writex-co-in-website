export type RevenueLead = {
  id: string;
  service_required: string;
  status: string;
  source_channel: string | null;
  utm_campaign: string | null;
  assigned_owner: string | null;
  lead_quality: string | null;
  quoted_amount: string | number | null;
  converted_amount: string | number | null;
  loss_reason: string | null;
  created_at: string | Date;
  converted_at: string | Date | null;
};

function toMoney(value: string | number | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function deriveSourceChannel(lead: {
  source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  referrer?: string | null;
}) {
  const source = String(lead.utm_source || lead.source || "").toLowerCase();
  const medium = String(lead.utm_medium || "").toLowerCase();
  const referrer = String(lead.referrer || "").toLowerCase();

  if (source.includes("whatsapp")) return "whatsapp";
  if (medium.includes("cpc") || medium.includes("paid")) return "paid_search";
  if (medium.includes("social")) return "paid_social";
  if (referrer.includes("google") || referrer.includes("bing")) return "organic_search";
  if (referrer) return "referral";
  if (source.includes("internal")) return "internal";
  return "direct";
}

export function calculateLeadPipelineMetrics(leads: RevenueLead[]) {
  const total = leads.length;
  const stages = ["new", "contacted", "quoted", "converted", "lost"] as const;

  return stages.map((status) => {
    const count = leads.filter((lead) => lead.status === status).length;
    return {
      status,
      count,
      percentage: total ? Math.round((count / total) * 100) : 0
    };
  });
}

export function calculateConversionRates(leads: RevenueLead[]) {
  const total = leads.length;
  const quoted = leads.filter((lead) => ["quoted", "converted", "lost"].includes(lead.status)).length;
  const converted = leads.filter((lead) => lead.status === "converted").length;

  return {
    leadToQuoteRate: total ? Math.round((quoted / total) * 100) : 0,
    quoteToConversionRate: quoted ? Math.round((converted / quoted) * 100) : 0,
    leadToConversionRate: total ? Math.round((converted / total) * 100) : 0
  };
}

function groupBy(
  leads: RevenueLead[],
  keyFn: (lead: RevenueLead) => string | null | undefined
) {
  const groups = new Map<string, RevenueLead[]>();
  for (const lead of leads) {
    const key = keyFn(lead) || "Unknown";
    groups.set(key, [...(groups.get(key) || []), lead]);
  }

  return [...groups.entries()].map(([label, group]) => {
    const quotes = group.filter((lead) => ["quoted", "converted", "lost"].includes(lead.status));
    const conversions = group.filter((lead) => lead.status === "converted");
    const confirmedRevenue = conversions.reduce(
      (sum, lead) => sum + toMoney(lead.converted_amount),
      0
    );
    return {
      label,
      leads: group.length,
      quotes: quotes.length,
      conversions: conversions.length,
      confirmedRevenue,
      conversionRate: group.length ? Math.round((conversions.length / group.length) * 100) : 0,
      averageConvertedValue: conversions.length
        ? Math.round(confirmedRevenue / conversions.length)
        : 0
    };
  });
}

export function calculateRevenueByService(leads: RevenueLead[]) {
  return groupBy(leads, (lead) => lead.service_required);
}

export function calculateRevenueBySource(leads: RevenueLead[]) {
  return groupBy(leads, (lead) => lead.source_channel || "unknown");
}

export function calculateRevenueByOwner(leads: RevenueLead[]) {
  return groupBy(leads, (lead) => lead.assigned_owner || "Unassigned");
}

export function calculateLeakagePoints(leads: RevenueLead[]) {
  return [
    {
      label: "New leads not contacted",
      count: leads.filter((lead) => lead.status === "new").length
    },
    {
      label: "Contacted but not quoted",
      count: leads.filter((lead) => lead.status === "contacted").length
    },
    {
      label: "Quoted but not converted",
      count: leads.filter((lead) => lead.status === "quoted").length
    },
    {
      label: "Lost after quote",
      count: leads.filter((lead) => lead.status === "lost" && toMoney(lead.quoted_amount) > 0).length
    }
  ];
}
