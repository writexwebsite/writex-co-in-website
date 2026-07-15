import type { RevenueLead } from "@/lib/revenue/attribution";

export function generateFounderRecommendations(leads: RevenueLead[]) {
  if (leads.length < 10) {
    return [
      "Data sample is still small. Review every qualified lead manually before making source or pricing decisions."
    ];
  }

  const recommendations: string[] = [];
  const quotedNotConverted = leads.filter((lead) => lead.status === "quoted").length;
  const priceHighLosses = leads.filter((lead) => lead.loss_reason === "price_high").length;
  const dissertationConversions = leads.filter(
    (lead) =>
      lead.status === "converted" &&
      lead.service_required.toLowerCase().includes("dissertation")
  ).length;

  if (quotedNotConverted > 0) {
    recommendations.push(
      "Follow up quoted leads that have not converted yet; this is the nearest revenue action queue."
    );
  }

  if (priceHighLosses > 0) {
    recommendations.push(
      "Price-high losses are present. Review quote explanation, package clarity, and urgency handling."
    );
  }

  if (dissertationConversions > 0) {
    recommendations.push(
      "Dissertation support is converting. Strengthen dissertation landing-page follow-up and expert matching workflow."
    );
  }

  return recommendations.length
    ? recommendations
    : ["No strong recommendation yet. Keep tracking quote speed, follow-ups, and conversion quality."];
}
