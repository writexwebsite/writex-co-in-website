import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { templateDefinitions } from "./config";

type DocumentPayload = {
  title: string;
  subtitle?: string;
  sections?: Array<{ heading: string; lines: string[] }>;
  templateId?: string;
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function generateToolPdf(payload: DocumentPayload) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28;
  const height = 841.89;
  const margin = 54;
  let page = document.addPage([width, height]);
  let y = height - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = document.addPage([width, height]);
      y = height - margin;
    }
  };
  const drawLines = (target: PDFPage, lines: string[], options: { size: number; font: PDFFont; color?: ReturnType<typeof rgb>; gap?: number }) => {
    for (const line of lines) {
      ensureSpace(options.size + (options.gap || 6));
      target.drawText(line, { x: margin, y, size: options.size, font: options.font, color: options.color || rgb(0.08, 0.12, 0.35) });
      y -= options.size + (options.gap || 6);
    }
  };

  page.drawRectangle({ x: 0, y: height - 12, width, height: 12, color: rgb(0.38, 0.09, 0.95) });
  drawLines(page, wrapText(payload.title, bold, 22, width - margin * 2), { size: 22, font: bold, gap: 9 });
  if (payload.subtitle) {
    y -= 3;
    drawLines(page, wrapText(payload.subtitle, regular, 10, width - margin * 2), { size: 10, font: regular, color: rgb(0.33, 0.36, 0.55), gap: 5 });
  }
  y -= 16;

  const sections = payload.sections || templateSections(payload.templateId);
  for (const section of sections) {
    ensureSpace(56);
    drawLines(page, wrapText(section.heading, bold, 14, width - margin * 2), { size: 14, font: bold, gap: 7 });
    y -= 2;
    for (const line of section.lines.filter(Boolean)) {
      const wrapped = wrapText(line, regular, 10.5, width - margin * 2 - 14);
      ensureSpace(wrapped.length * 16 + 8);
      page.drawCircle({ x: margin + 3, y: y + 4, size: 2, color: rgb(0.93, 0.18, 0.48) });
      for (const wrappedLine of wrapped) {
        page.drawText(wrappedLine, { x: margin + 14, y, size: 10.5, font: regular, color: rgb(0.12, 0.16, 0.33) });
        y -= 16;
      }
      y -= 3;
    }
    y -= 9;
  }

  const pages = document.getPages();
  pages.forEach((pdfPage, index) => {
    pdfPage.drawText(`WriteX learning-focused planning resource  |  ${index + 1}/${pages.length}`, {
      x: margin,
      y: 24,
      size: 8,
      font: regular,
      color: rgb(0.45, 0.47, 0.58)
    });
  });

  return document.save();
}

function templateSections(templateId?: string) {
  const template = templateDefinitions.find((item) => item.id === templateId);
  if (!template) return [];
  const sections: Record<string, Array<{ heading: string; lines: string[] }>> = {
    "academic-cv": [
      { heading: "Profile", lines: ["Research interests, academic direction, and relevant strengths."] },
      { heading: "Education", lines: ["Degree, institution, dates, relevant modules, dissertation or project."] },
      { heading: "Research and projects", lines: ["Project purpose, method, contribution, and evidence-based outcome."] },
      { heading: "Skills and achievements", lines: ["Research methods, software, languages, awards, publications, and presentations."] }
    ],
    "graduate-cv": [
      { heading: "Professional profile", lines: ["Target role, strongest relevant evidence, and career direction."] },
      { heading: "Education", lines: ["Degree, institution, dates, selected modules, and relevant achievements."] },
      { heading: "Experience and projects", lines: ["Action, context, responsibility, and measurable evidence."] },
      { heading: "Skills", lines: ["Technical, analytical, communication, and language skills supported by evidence."] }
    ],
    "sop-planning-worksheet": [
      { heading: "Programme fit", lines: ["Which modules, research areas, or learning opportunities are specifically relevant?"] },
      { heading: "Academic evidence", lines: ["Which projects, modules, or research experiences demonstrate readiness?"] },
      { heading: "Motivation", lines: ["What specific problem, question, or experience shaped this direction?"] },
      { heading: "Career direction", lines: ["What is the credible next step after the programme, and why?"] }
    ],
    "dissertation-proposal-outline": [
      { heading: "Research context", lines: ["Problem, rationale, academic context, and proposed contribution."] },
      { heading: "Aim and objectives", lines: ["One focused aim and a small set of measurable objectives."] },
      { heading: "Literature context", lines: ["Key themes, debate, gap, and relationship to the proposed study."] },
      { heading: "Methodology", lines: ["Design, data, sampling, analysis, ethics, limitations, and feasibility."] }
    ],
    "literature-review-matrix": [
      { heading: "Source record", lines: ["Citation | Research question | Context | Method | Sample"] },
      { heading: "Critical reading", lines: ["Key findings | Strengths | Limitations | Relevance"] },
      { heading: "Synthesis", lines: ["Theme | Agreement or tension | Gap | How it informs your argument"] }
    ]
  };
  return sections[template.id] || [{ heading: template.name, lines: [template.description, template.usage] }];
}

