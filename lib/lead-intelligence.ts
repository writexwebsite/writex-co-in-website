export type QuoteLeadIntelligence = {
  service_type: string;
  academic_level: string;
  subject: string;
  country: string;
  deadline_urgency: string;
  word_count: number;
  file_uploaded: boolean;
  draft_available: boolean;
  rubric_available: boolean;
  supervisor_comments_available: boolean;
  whatsapp_clicked: boolean;
  form_completed: boolean;
  lead_score: number;
};

export type QuoteLeadScoringInput = {
  service: string;
  level: string;
  subject: string;
  country: string;
  urgency: string;
  wordCount: string;
  instructions: string;
  fileUploaded: boolean;
  draftAvailable: string;
  rubricAvailable: string;
  supervisorCommentsAvailable: string;
  whatsappClicked: boolean;
  formCompleted: boolean;
};

const priorityCountries = ["uk", "australia", "canada", "uae"];
const highIntentLevels = ["postgraduate", "mba", "doctoral", "phd"];

function isYes(value: string) {
  return value.trim().toLowerCase() === "yes";
}

function isUrgentWithin48Hours(value: string) {
  const normalizedValue = value.toLowerCase();

  return (
    normalizedValue.includes("less than 24") ||
    normalizedValue.includes("24-48") ||
    normalizedValue.includes("24–48")
  );
}

export function buildQuoteLeadIntelligence({
  service,
  level,
  subject,
  country,
  urgency,
  wordCount,
  instructions,
  fileUploaded,
  draftAvailable,
  rubricAvailable,
  supervisorCommentsAvailable,
  whatsappClicked,
  formCompleted
}: QuoteLeadScoringInput): QuoteLeadIntelligence {
  const normalizedService = service.toLowerCase();
  const normalizedLevel = level.toLowerCase();
  const normalizedCountry = country.trim().toLowerCase();
  const parsedWordCount = Number(wordCount) || 0;

  let leadScore = 0;

  if (fileUploaded) leadScore += 25;
  if (normalizedService.includes("dissertation")) leadScore += 20;
  if (normalizedService.includes("sop") || normalizedService.includes("admissions")) {
    leadScore += 15;
  }
  if (isUrgentWithin48Hours(urgency)) leadScore += 15;
  if (highIntentLevels.some((item) => normalizedLevel.includes(item))) {
    leadScore += 15;
  }
  if (parsedWordCount > 3000) leadScore += 10;
  if (instructions.trim().length >= 80) leadScore += 10;
  if (isYes(rubricAvailable)) leadScore += 10;
  if (whatsappClicked) leadScore += 10;
  if (priorityCountries.includes(normalizedCountry)) leadScore += 10;

  return {
    service_type: service,
    academic_level: level,
    subject,
    country,
    deadline_urgency: urgency,
    word_count: parsedWordCount,
    file_uploaded: fileUploaded,
    draft_available: isYes(draftAvailable),
    rubric_available: isYes(rubricAvailable),
    supervisor_comments_available: isYes(supervisorCommentsAvailable),
    whatsapp_clicked: whatsappClicked,
    form_completed: formCompleted,
    lead_score: leadScore
  };
}
