export const AXO_UNKNOWN_ANSWER = "I do not have an approved answer for that yet. I can help you send the question to the WriteX support team.";

export const AXO_KNOWLEDGE = [
  { title: "How quotes work", category: "quotation", sourcePage: "/pricing", lastReviewed: "2026-07-11", status: "approved", audience: "students", answer: "WriteX reviews the service type, level, subject, deadline, word count, files, and document condition before sharing a scope-based quote." },
  { title: "Confidentiality", category: "confidentiality", sourcePage: "/privacy", lastReviewed: "2026-07-11", status: "approved", audience: "students", answer: "Briefs, drafts, rubrics, SOP prompts, and conversations are handled through a private academic support workflow." },
  { title: "Academic integrity", category: "integrity", sourcePage: "/terms", lastReviewed: "2026-07-11", status: "approved", audience: "students", answer: "WriteX provides academic support, academic review, research guidance, editing, proofreading, formatting, originality review, and model solutions for learning purposes. Students remain responsible for their institution's academic integrity policies." },
  { title: "Urgent deadlines", category: "deadlines", sourcePage: "/pricing", lastReviewed: "2026-07-11", status: "approved", audience: "students", answer: "Urgent requests can be reviewed, but availability depends on the service, subject, document condition, and realistic review scope. The team confirms feasibility before commitment." },
  { title: "What to upload", category: "files", sourcePage: "/pricing", lastReviewed: "2026-07-11", status: "approved", audience: "students", answer: "Share the brief, rubric, draft, supervisor comments, formatting guide, SOP prompt, or any file that explains the requirement." }
] as const;

export function searchApprovedKnowledge(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return AXO_KNOWLEDGE.filter((record) => `${record.title} ${record.category} ${record.answer}`.toLowerCase().includes(normalized));
}
