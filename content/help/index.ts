import type { SeoContentSource } from "../types";
import {
  defaultSeoFaqs,
  editableStatus,
  integrityDisclaimer,
  links
} from "../shared";

const articleDate = "2026-07-08";

const helpDefinitions = [
  {
    slug: "how-to-structure-university-assignment",
    title: "How to structure a university assignment",
    focus:
      "assignment introductions, body sections, evidence flow, conclusion planning, and referencing",
    checklist: [
      "Read the brief and identify the task verb",
      "Map the marking criteria to section headings",
      "Plan evidence before writing paragraphs",
      "Keep citation details ready while drafting"
    ],
    mistakes: [
      "Starting with sources before understanding the brief",
      "Using headings that do not match the marking criteria",
      "Writing descriptive paragraphs without analysis",
      "Leaving references until the final hour"
    ],
    primaryLink: links.assignment
  },
  {
    slug: "how-to-write-dissertation-literature-review",
    title: "How to write a dissertation literature review",
    focus:
      "literature review themes, source grouping, critical comparison, research gaps, and chapter flow",
    checklist: [
      "Group sources by theme rather than author-by-author summary",
      "Connect each theme to the research question",
      "Compare methods, findings, limits, and debates",
      "End sections by showing why the theme matters"
    ],
    mistakes: [
      "Writing an annotated bibliography instead of a review",
      "Listing studies without comparison",
      "Ignoring the research gap",
      "Using weak transitions between themes"
    ],
    primaryLink: links.dissertation
  },
  {
    slug: "harvard-referencing-guide",
    title: "Harvard referencing guide",
    focus:
      "Harvard in-text citations, reference lists, source details, consistency checks, and missing information",
    checklist: [
      "Check every in-text citation has a matching reference entry",
      "Keep author, year, title, publisher, journal, DOI, or URL details consistent",
      "Follow the university's supplied Harvard variant",
      "Flag missing bibliographic details for review"
    ],
    mistakes: [
      "Mixing Harvard variants across the same document",
      "Adding sources to the reference list that are not cited",
      "Forgetting page numbers where required",
      "Using inconsistent capitalisation or punctuation"
    ],
    primaryLink: links.formatting
  },
  {
    slug: "apa-referencing-guide",
    title: "APA referencing guide",
    focus:
      "APA in-text citations, reference list formatting, source attribution, DOI handling, and consistency",
    checklist: [
      "Check author-date citation style throughout the draft",
      "Use hanging indents and APA reference-list order",
      "Verify DOI or URL format where required",
      "Keep title capitalisation consistent with APA expectations"
    ],
    mistakes: [
      "Using Harvard-style punctuation in an APA document",
      "Missing dates or source details",
      "Inconsistent use of et al.",
      "Reference entries that do not match in-text citations"
    ],
    primaryLink: links.formatting
  },
  {
    slug: "how-to-reduce-plagiarism-ethically",
    title: "How to improve originality ethically",
    focus:
      "citation correction, paraphrase quality, source attribution, similarity concerns, and responsible revision",
    checklist: [
      "Identify whether similarity comes from quotes, references, common phrases, or weak paraphrasing",
      "Add citations where source ideas are used",
      "Improve paraphrase quality while preserving meaning",
      "Check the institution's academic integrity policy"
    ],
    mistakes: [
      "Trying to chase a score instead of fixing source use",
      "Removing citations to reduce visible similarity",
      "Paraphrasing too close to the original wording",
      "Ignoring missing reference-list details"
    ],
    primaryLink: links.plagiarism
  },
  {
    slug: "how-to-improve-academic-writing-clarity",
    title: "How to improve academic writing clarity",
    focus:
      "sentence clarity, paragraph focus, transitions, academic tone, editing habits, and final-readiness review",
    checklist: [
      "Make one main point per paragraph",
      "Use topic sentences that connect to the brief",
      "Reduce vague words and unsupported claims",
      "Read the draft for transitions and logical flow"
    ],
    mistakes: [
      "Using long sentences to sound academic",
      "Repeating the same point in several paragraphs",
      "Adding references without explaining relevance",
      "Ignoring headings, signposting, and transitions"
    ],
    primaryLink: links.editing
  },
  {
    slug: "dissertation-proposal-checklist",
    title: "Dissertation proposal checklist",
    focus:
      "research aims, objectives, questions, methodology fit, feasibility, ethics notes, and chapter planning",
    checklist: [
      "Check that aim, objectives, and questions align",
      "Explain why the topic matters academically",
      "Match methodology to the research question",
      "Include feasibility, limitations, and ethical considerations"
    ],
    mistakes: [
      "Using objectives that do not answer the research question",
      "Choosing methods without justification",
      "Writing a broad topic instead of a focused proposal",
      "Ignoring supervisor or handbook instructions"
    ],
    primaryLink: links.dissertation
  },
  {
    slug: "sop-writing-mistakes",
    title: "SOP mistakes to avoid",
    focus:
      "vague admissions claims, repeated phrases, weak profile evidence, unclear goals, and poor programme fit",
    checklist: [
      "Connect academic background to the target programme",
      "Use real examples rather than broad claims",
      "Explain goals with enough specificity",
      "Adapt the SOP to the university prompt"
    ],
    mistakes: [
      "Opening with generic motivation statements",
      "Listing achievements without reflection",
      "Repeating the CV in paragraph form",
      "Ignoring why the programme is the right fit"
    ],
    primaryLink: links.sop
  },
  {
    slug: "research-methodology-section-guide",
    title: "Research methodology section guide",
    focus:
      "research design, sampling, data collection, analysis logic, limitations, and methodology clarity",
    checklist: [
      "Name the research design and justify it",
      "Explain sampling and participant or data selection",
      "Describe data collection and analysis steps clearly",
      "Acknowledge limitations and ethical considerations"
    ],
    mistakes: [
      "Describing methods without explaining fit",
      "Using vague sampling language",
      "Skipping analysis logic",
      "Ignoring limitations or ethical context"
    ],
    primaryLink: links.dissertation
  },
  {
    slug: "urgent-academic-deadline-guide",
    title: "Urgent academic deadline guide",
    focus:
      "scope control, file readiness, priority planning, realistic review depth, and urgent quote preparation",
    checklist: [
      "Collect the brief, draft, rubric, word count, and deadline first",
      "Decide whether the need is editing, formatting, research guidance, or review",
      "Share all files at once to reduce back-and-forth",
      "Ask for a realistic support scope before committing"
    ],
    mistakes: [
      "Sending incomplete instructions",
      "Changing the scope after the quote is confirmed",
      "Ignoring file quality and draft condition",
      "Expecting deep review when the deadline allows only limited support"
    ],
    primaryLink: links.pricing
  }
] as const;

export const helpSeoContent: SeoContentSource[] = helpDefinitions.map(
  (article) => ({
    collection: "help",
    slug: article.slug,
    path: `/help/${article.slug}`,
    rolloutPhase: "phase-2",
    contentStatus: editableStatus,
    seoTitle: `${article.title} | WriteX Resources`,
    metaDescription: `${article.title}: a WriteX guide covering ${article.focus}. Includes academic integrity-safe next steps and related support links.`,
    h1: article.title,
    heroEyebrow: "Resource guide",
    intro: `A practical guide to ${article.focus}. Use the steps and checklist below to make the requirement clearer before requesting support.`,
    serviceExplanation: {
      h2: "Guide overview",
      body:
        "The guidance focuses on planning, clarity, editing, referencing, responsible source use, file readiness, and learning-focused academic support."
    },
    commonChallenges: {
      h2: "Common mistakes to avoid",
      items: article.mistakes
    },
    whoThisIsFor: {
      h2: "Who should read this",
      items: [
        "Students preparing an academic draft before a deadline.",
        "Students who want to understand the process before requesting support.",
        "Students looking for responsible learning guidance, editing, referencing, or dissertation support."
      ]
    },
    whatWriteXCanHelpWith: {
      h2: "How WriteX can support the next step",
      items: [
        "Reviewing your brief, rubric, draft, or supervisor feedback",
        "Improving academic structure, clarity, tone, and referencing consistency",
        "Checking formatting, citation style, and originality review needs",
        "Scoping urgent or complex requests through the quote form",
        "Providing model solutions for learning where appropriate"
      ]
    },
    whatToUpload: {
      h2: "Checklist before asking for support",
      items: article.checklist
    },
    process: {
      h2: "Step-by-step guidance",
      steps: [
        "Identify the exact academic task and the assessment requirement.",
        "Gather the brief, rubric, draft, source list, and deadline details.",
        "Use the checklist to locate the biggest risk in the document.",
        "Decide whether you need editing, formatting, dissertation support, originality review, or admissions support.",
        "Send the brief to WriteX for scope review if expert support is needed."
      ]
    },
    faq: defaultSeoFaqs,
    cta: {
      title: "Need help applying this guide?",
      description:
        "Share your file, deadline, word count, academic level, and instructions so WriteX can recommend the right support pathway."
    },
    internalLinks: [
      article.primaryLink,
      links.pricing
    ],
    academicIntegrityDisclaimer: integrityDisclaimer,
    schemaType: "Article",
    article: {
      datePublished: articleDate,
      dateModified: articleDate,
      authorName: "WriteX Academic Support Team"
    }
  })
);

export const helpSeoBySlug = Object.fromEntries(
  helpSeoContent.map((page) => [page.slug, page])
);
