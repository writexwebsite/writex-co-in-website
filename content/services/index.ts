import type { SeoContentSource } from "../types";
import {
  defaultSeoFaqs,
  defaultSeoProcess,
  editableStatus,
  integrityDisclaimer,
  links,
  serviceInternalLinks,
  standardUploadItems
} from "../shared";

const servicePages: SeoContentSource[] = [
  {
    collection: "service",
    slug: "assignment-support",
    path: "/assignment-support",
    rolloutPhase: "launch",
    contentStatus: editableStatus,
    seoTitle: "Coursework & Assignment Support for University Students | WriteX",
    metaDescription:
      "Get confidential academic support for coursework briefs, research guidance, structure review, editing, referencing, and model solutions for learning.",
    h1: "Coursework & Brief Support for University Students",
    heroEyebrow: "Core service",
    intro:
      "WriteX supports students who need a clearer path through coursework briefs, marking rubrics, drafts, referencing expectations, and deadline pressure. The service is framed around academic support and review, research guidance, editing, proofreading, formatting, referencing, and model solutions for learning.",
    serviceExplanation: {
      h2: "Coursework support without unsafe promises",
      body:
        "Assignment support should help a student understand the brief, plan a responsible structure, improve clarity, check references, and learn from model guidance. The page must avoid language that suggests WriteX completes work for submission, promises outcomes, or bypasses institutional rules."
    },
    commonChallenges: {
      h2: "Common coursework challenges",
      items: [
        "Unclear marking criteria or learning outcomes",
        "Weak structure, paragraph flow, or research direction",
        "Referencing style confusion across Harvard, APA, MLA, or supplied guides",
        "Drafts that need clarity, tone, editing, or final-readiness review"
      ]
    },
    whoThisIsFor: {
      h2: "Who this is for",
      items: [
        "Students with coursework briefs, rubrics, drafts, or notes that need clearer academic direction.",
        "International students comparing safe academic support before requesting a quote.",
        "Students who need structure planning, research guidance, referencing support, editing, or model solutions for learning."
      ]
    },
    whatWriteXCanHelpWith: {
      h2: "What WriteX can support",
      items: [
        "Brief review against assignment instructions and marking criteria",
        "Research direction and structure planning",
        "Academic tone, clarity, paragraph flow, and editing support",
        "Referencing, citation placement, and reference list consistency",
        "Model solutions for learning where suitable and integrity-safe"
      ]
    },
    whatToUpload: {
      h2: "What students should upload",
      items: standardUploadItems
    },
    process: {
      h2: "How assignment support is scoped",
      steps: defaultSeoProcess
    },
    qualityChecks: {
      h2: "Quality checks",
      items: [
        "Instruction alignment",
        "Structure and argument flow",
        "Research logic and source use",
        "Citation and formatting consistency",
        "Academic tone and readability"
      ]
    },
    faq: defaultSeoFaqs,
    cta: {
      title: "Request a coursework support quote",
      description:
        "Share your coursework brief, deadline, word count, academic level, draft condition, and files so WriteX can review the scope."
    },
    internalLinks: serviceInternalLinks.filter((link) => link.href !== "/assignment-support"),
    academicIntegrityDisclaimer: integrityDisclaimer,
    schemaType: "Service"
  },
  {
    collection: "service",
    slug: "dissertation-thesis-support",
    path: "/dissertation-thesis-support",
    rolloutPhase: "launch",
    contentStatus: editableStatus,
    seoTitle: "Dissertation & Thesis Support | WriteX",
    metaDescription:
      "Research proposal, literature review, methodology, chapter editing, formatting, and referencing support through a confidential academic workflow.",
    h1: "Dissertation & Thesis Support",
    heroEyebrow: "Core service",
    intro:
      "WriteX supports dissertation and thesis work through proposal support, literature review guidance, methodology clarity, chapter editing, supervisor-comment response, formatting, and referencing. The focus is careful review, structure, research logic, and responsible academic support.",
    serviceExplanation: {
      h2: "Research project support with clear scope",
      body:
        "Dissertation and thesis requests are usually complex, so they should be scoped by chapter type, research stage, word count, supervisor feedback, methodology needs, data complexity, and deadline. The page should position WriteX as a confidential research-support workflow, not an outcome guarantee."
    },
    commonChallenges: {
      h2: "Common dissertation challenges",
      items: [
        "A proposal that needs clearer aims, objectives, or feasibility",
        "Literature reviews that need theme grouping and source integration",
        "Methodology sections that need clearer research design explanation",
        "Supervisor comments that need a practical revision pathway"
      ]
    },
    whoThisIsFor: {
      h2: "Who this is for",
      items: [
        "Students working on proposals, literature reviews, methodology chapters, discussion sections, or full drafts.",
        "Postgraduate, MBA, and doctoral students who need long-form editing, formatting, and referencing review.",
        "Students who want supervisor-comment response support without unsafe academic claims."
      ]
    },
    whatWriteXCanHelpWith: {
      h2: "What WriteX can support",
      items: [
        "Research proposal support for aims, objectives, and question alignment",
        "Literature review structure, theme grouping, and source integration",
        "Methodology clarity around design, sampling, data collection, and limitations",
        "Chapter editing for academic tone, structure, coherence, and readability",
        "Formatting and referencing for long-form academic documents"
      ]
    },
    whatToUpload: {
      h2: "What students should upload",
      items: [
        "Research proposal, chapter draft, or dissertation brief",
        "Supervisor comments or feedback notes",
        "University handbook, rubric, or formatting guide",
        "Referencing style requirements",
        "Data output or analysis notes where relevant",
        "Deadline, word count, and academic level"
      ]
    },
    process: {
      h2: "How dissertation support is scoped",
      steps: defaultSeoProcess
    },
    qualityChecks: {
      h2: "Quality checks",
      items: [
        "Aim, objective, and research question alignment",
        "Literature theme grouping and source integration",
        "Methodology clarity and limitations",
        "Chapter flow, headings, and academic tone",
        "Formatting and reference consistency"
      ]
    },
    faq: defaultSeoFaqs,
    cta: {
      title: "Request a dissertation support quote",
      description:
        "Share your chapter, proposal, supervisor comments, deadline, academic level, and formatting instructions for scope review."
    },
    internalLinks: serviceInternalLinks.filter(
      (link) => link.href !== "/dissertation-thesis-support"
    ),
    academicIntegrityDisclaimer: integrityDisclaimer,
    schemaType: "Service"
  },
  {
    collection: "service",
    slug: "sop-admissions-writing",
    path: "/sop-admissions-writing",
    rolloutPhase: "launch",
    contentStatus: editableStatus,
    seoTitle: "SOP & Admissions Support | WriteX",
    metaDescription:
      "Support for SOPs, personal statements, LOR editing, CV polishing, and profile positioning for university applications.",
    h1: "SOP & Admissions Support",
    heroEyebrow: "Core service",
    intro:
      "WriteX supports SOPs, personal statements, LOR editing, CV polishing, and profile positioning for university applications. The admissions workflow should be evidence-led, specific, and based on the student's real academic background and goals.",
    serviceExplanation: {
      h2: "Admissions documents shaped around real profile evidence",
      body:
        "SOP and admissions support should help students organise authentic profile notes, academic goals, programme fit, experience, and application prompts. The copy must avoid fake claims, unverifiable outcomes, or generic admissions language."
    },
    commonChallenges: {
      h2: "Common admissions writing challenges",
      items: [
        "Scattered profile notes with no clear academic narrative",
        "SOP drafts that sound generic or repetitive",
        "Weak links between programme fit, goals, and evidence",
        "LOR or CV drafts that need polishing and consistency"
      ]
    },
    whoThisIsFor: {
      h2: "Who this is for",
      items: [
        "Students preparing SOPs, personal statements, LORs, CVs, or admissions documents.",
        "Applicants who need a clearer university-specific narrative based on real achievements.",
        "Students who want profile positioning without fake claims or unverifiable outcome promises."
      ]
    },
    whatWriteXCanHelpWith: {
      h2: "What WriteX can support",
      items: [
        "SOP planning around background, goals, programme fit, and career direction",
        "Personal statement editing for clarity, specificity, and flow",
        "LOR editing while preserving credible recommender voice",
        "CV polish for academic, internship, project, and professional experience",
        "Prompt alignment and university-specific narrative refinement"
      ]
    },
    whatToUpload: {
      h2: "What students should upload",
      items: [
        "SOP prompt or university application instructions",
        "Existing SOP, personal statement, LOR, or CV draft",
        "Profile notes, academic background, achievements, and goals",
        "Target country, university, and programme details",
        "Application deadline and word limits"
      ]
    },
    process: {
      h2: "How admissions support is scoped",
      steps: defaultSeoProcess
    },
    qualityChecks: {
      h2: "Quality checks",
      items: [
        "Prompt alignment",
        "Profile specificity",
        "Programme and university fit",
        "Narrative flow and tone",
        "Grammar, clarity, and final polish"
      ]
    },
    faq: defaultSeoFaqs,
    cta: {
      title: "Request an SOP or admissions quote",
      description:
        "Share your prompt, CV, profile notes, target programme, draft condition, and deadline so WriteX can scope the support."
    },
    internalLinks: serviceInternalLinks.filter(
      (link) => link.href !== "/sop-admissions-writing"
    ),
    academicIntegrityDisclaimer: integrityDisclaimer,
    schemaType: "Service"
  },
  {
    collection: "service",
    slug: "editing-proofreading",
    path: "/editing-proofreading",
    rolloutPhase: "launch",
    contentStatus: editableStatus,
    seoTitle: "Academic Editing & Proofreading Services | WriteX",
    metaDescription:
      "Improve grammar, clarity, academic tone, structure, formatting, citations, and final-readiness with WriteX academic editing support.",
    h1: "Academic Editing & Proofreading Services",
    heroEyebrow: "Core service",
    intro:
      "WriteX provides academic editing and proofreading for students who already have drafts and need grammar, clarity, academic tone, structure, formatting, citation, and final-readiness review.",
    serviceExplanation: {
      h2: "Draft review for clarity and academic polish",
      body:
        "Editing and proofreading support should improve readability while preserving the student's meaning. The page should explain grammar, clarity, tone, structure, formatting, and referencing review without promising grades or institutional outcomes."
    },
    commonChallenges: {
      h2: "Common editing challenges",
      items: [
        "Drafts with unclear sentences, repetition, or weak transitions",
        "Academic tone that needs formal, precise wording",
        "Headings, paragraphs, tables, or citations that need consistency",
        "Urgent drafts where realistic review scope must be checked"
      ]
    },
    whoThisIsFor: {
      h2: "Who this is for",
      items: [
        "Students with a complete or partial draft that needs careful review.",
        "Students preparing assignments, dissertations, reports, SOPs, or research documents.",
        "Students who need editing, proofreading, referencing checks, or final-readiness review."
      ]
    },
    whatWriteXCanHelpWith: {
      h2: "What WriteX can support",
      items: [
        "Grammar, punctuation, and sentence-level correction",
        "Clarity, concision, and academic tone improvement",
        "Structure, headings, transitions, and paragraph flow review",
        "Formatting checks for tables, figures, appendices, and captions",
        "Citation and reference list consistency checks"
      ]
    },
    whatToUpload: {
      h2: "What students should upload",
      items: standardUploadItems
    },
    process: {
      h2: "How editing support is scoped",
      steps: defaultSeoProcess
    },
    qualityChecks: {
      h2: "Quality checks",
      items: [
        "Grammar and punctuation",
        "Sentence clarity",
        "Academic tone",
        "Paragraph and section flow",
        "Citation and reference consistency"
      ]
    },
    faq: defaultSeoFaqs,
    cta: {
      title: "Request an editing quote",
      description:
        "Share your draft, word count, academic level, instructions, and deadline so WriteX can confirm the review depth."
    },
    internalLinks: serviceInternalLinks.filter((link) => link.href !== "/editing-proofreading"),
    academicIntegrityDisclaimer: integrityDisclaimer,
    schemaType: "Service"
  },
  {
    collection: "service",
    slug: "plagiarism-ai-review",
    path: "/plagiarism-ai-review",
    rolloutPhase: "launch",
    contentStatus: editableStatus,
    seoTitle: "Originality & AI Review Support | WriteX",
    metaDescription:
      "Similarity review, citation correction, originality guidance, and human academic review for learning-focused academic integrity support.",
    h1: "Originality & AI Review Support",
    heroEyebrow: "Core service",
    intro:
      "WriteX supports students who need similarity review, citation correction, originality guidance, AI review, and human academic review. The service is learning-focused and framed around responsible source use.",
    serviceExplanation: {
      h2: "Integrity-safe review for source use and academic tone",
      body:
        "Originality and AI review should help students understand similarity concerns, citation gaps, attribution quality, repetitive phrasing, and academic language clarity. The page must avoid score guarantees or claims that bypass institutional policies."
    },
    commonChallenges: {
      h2: "Common review concerns",
      items: [
        "Similarity reports that need interpretation and citation correction",
        "Missing source attribution or inconsistent reference details",
        "Paraphrasing that needs clearer academic wording",
        "Drafts that sound mechanical, repetitive, or unclear"
      ]
    },
    whoThisIsFor: {
      h2: "Who this is for",
      items: [
        "Students who want responsible review of similarity, citation, or source-use concerns.",
        "Students who need human academic review for clarity, tone, repetition, and language quality.",
        "Students who want academic integrity-safe guidance before revising their own work."
      ]
    },
    whatWriteXCanHelpWith: {
      h2: "What WriteX can support",
      items: [
        "Similarity review and likely cause identification",
        "Citation correction and source attribution guidance",
        "Human academic language review for clarity and tone",
        "Reference list consistency and missing-detail checks",
        "Learning-focused originality and revision guidance"
      ]
    },
    whatToUpload: {
      h2: "What students should upload",
      items: [
        "Current draft",
        "Similarity report if available",
        "Reference list or source list",
        "University referencing guide",
        "Assignment or dissertation instructions",
        "Deadline and review concern"
      ]
    },
    process: {
      h2: "How review support is scoped",
      steps: defaultSeoProcess
    },
    qualityChecks: {
      h2: "Quality checks",
      items: [
        "Similarity concern review",
        "Citation placement",
        "Source attribution clarity",
        "Human language and tone review",
        "Academic integrity-safe notes"
      ]
    },
    faq: defaultSeoFaqs,
    cta: {
      title: "Request an originality or AI review quote",
      description:
        "Share your draft, similarity concern, source list, referencing style, and deadline so WriteX can recommend a responsible review path."
    },
    internalLinks: serviceInternalLinks.filter((link) => link.href !== "/plagiarism-ai-review"),
    academicIntegrityDisclaimer: integrityDisclaimer,
    schemaType: "Service"
  },
  {
    collection: "service",
    slug: "formatting-referencing",
    path: "/formatting-referencing",
    rolloutPhase: "launch",
    contentStatus: editableStatus,
    seoTitle: "Formatting & Referencing Support | WriteX",
    metaDescription:
      "Harvard, APA, MLA, Chicago, OSCOLA, and university-specific formatting and referencing support for academic documents.",
    h1: "Formatting & Referencing Support",
    heroEyebrow: "Core service",
    intro:
      "WriteX provides formatting and referencing support for Harvard, APA, MLA, Chicago, OSCOLA, and university-specific requirements. The focus is document presentation, citation consistency, and instruction alignment.",
    serviceExplanation: {
      h2: "Citation and document presentation support",
      body:
        "Formatting and referencing support should help students align drafts with supplied style guides, university instructions, tables, figures, appendices, headings, and reference-list requirements. It should be practical, specific, and instruction-led."
    },
    commonChallenges: {
      h2: "Common formatting challenges",
      items: [
        "Inconsistent in-text citations and reference-list details",
        "University-specific spacing, headings, tables, or appendix rules",
        "Missing bibliographic information that needs to be flagged",
        "Long documents that need consistent presentation across sections"
      ]
    },
    whoThisIsFor: {
      h2: "Who this is for",
      items: [
        "Students with drafts that need citation style correction or reference-list cleanup.",
        "Students preparing dissertations, assignments, reports, or admissions documents with strict presentation rules.",
        "Students who need Harvard, APA, MLA, Chicago, OSCOLA, or university-specific support."
      ]
    },
    whatWriteXCanHelpWith: {
      h2: "What WriteX can support",
      items: [
        "Harvard, APA, MLA, Chicago, OSCOLA, or supplied style-guide checks",
        "In-text citation and reference list consistency",
        "Headings, spacing, margins, tables, figures, and appendices",
        "Caption, layout, and document presentation review",
        "Missing bibliographic detail flags for student review"
      ]
    },
    whatToUpload: {
      h2: "What students should upload",
      items: [
        "Current draft",
        "Referencing style guide or university formatting instructions",
        "Reference list or source list",
        "Supervisor comments if available",
        "Tables, figures, appendices, or required file format",
        "Deadline and required style"
      ]
    },
    process: {
      h2: "How formatting support is scoped",
      steps: defaultSeoProcess
    },
    qualityChecks: {
      h2: "Quality checks",
      items: [
        "Citation style alignment",
        "Reference list completeness",
        "Headings, spacing, and layout",
        "Tables, figures, captions, and appendices",
        "University-specific formatting instructions"
      ]
    },
    faq: defaultSeoFaqs,
    cta: {
      title: "Request a formatting quote",
      description:
        "Share your draft, reference list, style guide, formatting instructions, and deadline so WriteX can scope the review accurately."
    },
    internalLinks: serviceInternalLinks.filter((link) => link.href !== "/formatting-referencing"),
    academicIntegrityDisclaimer: integrityDisclaimer,
    schemaType: "Service"
  },
  {
    collection: "service",
    slug: "pricing",
    path: "/pricing",
    rolloutPhase: "launch",
    contentStatus: editableStatus,
    seoTitle: "Get a Scope-Based Academic Support Quote | WriteX",
    metaDescription:
      "Share your brief, deadline, academic level, word count, and files to request a confidential scope-based quote from WriteX.",
    h1: "Get a Scope-Based Academic Support Quote",
    heroEyebrow: "Quote request",
    intro:
      "WriteX uses scope-based quote review so students can share the brief, files, deadline, academic level, word count, service type, and document condition before pricing is confirmed.",
    serviceExplanation: {
      h2: "Why WriteX uses scope-based pricing",
      body:
        "Academic support is not a one-size-fits-all product. Service type, deadline urgency, subject complexity, draft condition, word count, referencing style, and file quality all affect the support pathway."
    },
    whoThisIsFor: {
      h2: "Who this is for",
      items: [
        "Students who want a quote before confirming academic support.",
        "Students with urgent deadlines who need WhatsApp as a faster route.",
        "Students who want a confidential, scope-based intake process."
      ]
    },
    whatWriteXCanHelpWith: {
      h2: "What the quote review considers",
      items: [
        "Service type and academic level",
        "Subject complexity and word count",
        "Deadline urgency and file condition",
        "Draft, rubric, supervisor comments, or SOP prompt quality",
        "Revision expectations based on the original brief"
      ]
    },
    whatToUpload: {
      h2: "What students should upload",
      items: standardUploadItems
    },
    process: {
      h2: "How quote requests are scoped",
      steps: defaultSeoProcess
    },
    faq: defaultSeoFaqs,
    cta: {
      title: "Start your quote request",
      description:
        "Share your brief, files, academic level, word count, deadline, and instructions for confidential scope review."
    },
    internalLinks: serviceInternalLinks.filter((link) => link.href !== "/pricing#quote"),
    academicIntegrityDisclaimer: integrityDisclaimer,
    schemaType: "Service"
  }
];

export const serviceSeoContent = servicePages.map((page) => ({
  ...page,
  internalLinks: page.path === "/pricing"
    ? page.internalLinks
    : page.internalLinks.includes(links.pricing)
    ? page.internalLinks
    : [links.pricing, ...page.internalLinks]
}));

export const serviceSeoBySlug = Object.fromEntries(
  serviceSeoContent.map((page) => [page.slug, page])
);
