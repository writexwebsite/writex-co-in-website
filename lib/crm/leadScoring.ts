export type LeadScoringInput = {
  serviceRequired?: string | null;
  urgency?: string | null;
  wordCount?: number | null;
  country?: string | null;
  instructions?: string | null;
  uploadedFileAssetId?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

export type LeadQuality = "low" | "medium" | "high" | "premium";

export function scoreLead(lead: LeadScoringInput) {
  let score = 0;
  const reasons: string[] = [];
  const service = String(lead.serviceRequired || "").toLowerCase();
  const urgency = String(lead.urgency || "").toLowerCase();
  const country = String(lead.country || "").toLowerCase();
  const instructionsLength = String(lead.instructions || "").trim().length;

  if (service.includes("dissertation") || service.includes("thesis")) {
    score += 20;
    reasons.push("Research-heavy service");
  } else if (service.includes("sop") || service.includes("admission")) {
    score += 15;
    reasons.push("Admissions support service");
  }

  if (urgency.includes("24") || urgency.includes("48")) {
    score += 15;
    reasons.push("Urgent deadline");
  }

  if ((lead.wordCount || 0) > 3000) {
    score += 10;
    reasons.push("Higher word count");
  }

  if (["uk", "australia", "canada", "uae"].some((item) => country.includes(item))) {
    score += 10;
    reasons.push("Priority country signal");
  }

  if (instructionsLength > 120) {
    score += 10;
    reasons.push("Clear instructions provided");
  }

  if (lead.uploadedFileAssetId) {
    score += 25;
    reasons.push("File attached");
  }

  if (lead.whatsapp) score += 5;
  if (lead.email) score += 5;

  const quality: LeadQuality =
    score >= 70 ? "premium" : score >= 45 ? "high" : score >= 25 ? "medium" : "low";

  return { score, quality, reasons };
}
