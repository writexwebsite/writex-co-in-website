export type FAQItem = {
  question: string;
  answer: string;
};

export type ServiceCard = {
  title: string;
  description: string;
  href: string;
  points: string[];
  cta: string;
};

export type ServicePage = {
  title: string;
  eyebrow: string;
  description: string;
  path: string;
  primaryCta: string;
  secondaryCta?: string;
  whoThisIsFor: string[];
  helpWith: string[];
  process: {
    title: string;
    description: string;
  }[];
  uploadItems: string[];
  qualityChecks: string[];
  relatedServices: {
    label: string;
    href: string;
    description: string;
  }[];
  ctaTitle?: string;
  ctaDescription?: string;
  faqs: FAQItem[];
};

export const trustMetrics = [
  {
    value: "10+ Years",
    label: "Experience supporting academic and research-led documents."
  },
  {
    value: "150+ Team Capability",
    label: "Subject-aware specialists, editors, QA, and coordination support."
  },
  {
    value: "Confidential Handling",
    label: "Briefs, drafts, rubrics, and conversations stay inside the workflow."
  },
  {
    value: "QA-Led Workflow",
    label: "Requests are checked for clarity, structure, references, and instructions."
  }
];

export const services: ServiceCard[] = [
  {
    title: "Coursework & Brief Support",
    description:
      "Turn a complicated brief into a clearer support plan for structure, research, editing, and references.",
    href: "/assignment-support",
    points: ["Brief review", "Structure", "Referencing"],
    cta: "View service"
  },
  {
    title: "Dissertation & Thesis Support",
    description:
      "Connect proposals, literature reviews, methodology, chapter editing, formatting, and referencing.",
    href: "/dissertation-thesis-support",
    points: ["Proposal", "Literature review", "Chapters"],
    cta: "View service"
  },
  {
    title: "Academic Editing & Proofreading",
    description:
      "Keep your thinking while strengthening clarity, grammar, academic tone, structure, and citations.",
    href: "/editing-proofreading",
    points: ["Clarity", "Tone", "Citations"],
    cta: "View service"
  },
  {
    title: "SOP & Admissions Support",
    description:
      "Shape SOPs, personal statements, LORs, CVs, and profile notes around real evidence.",
    href: "/sop-admissions-writing",
    points: ["SOP", "Personal statement", "CV/LOR"],
    cta: "View service"
  },
  {
    title: "Originality & AI Review",
    description:
      "Review similarity, source attribution, citation gaps, AI-style signals, and academic tone responsibly.",
    href: "/plagiarism-ai-review",
    points: ["Similarity", "Citations", "Human review"],
    cta: "View service"
  },
  {
    title: "Formatting & Referencing Support",
    description:
      "Put citations, references, headings, tables, figures, and university formatting rules in order.",
    href: "/formatting-referencing",
    points: ["Harvard", "APA", "OSCOLA"],
    cta: "View service"
  }
];

export const processSteps = [
  {
    title: "Share brief",
    description:
      "Send your brief, draft, rubric, deadline, or SOP prompt."
  },
  {
    title: "Scope reviewed",
    description:
      "The requirement is checked for service type, level, deadline, and file condition."
  },
  {
    title: "Expert matched",
    description:
      "The request is mapped to the right subject-aware support specialist."
  },
  {
    title: "QA planned",
    description:
      "The workflow includes checks for clarity, references, formatting, and instructions."
  },
  {
    title: "Quote shared",
    description:
      "You receive a scope-based quote and the next step."
  }
];

export const subjectGroups = [
  "Business & Management",
  "Marketing",
  "Finance & Accounting",
  "Economics",
  "Law",
  "Psychology",
  "Education",
  "Nursing & Health Sciences",
  "Public Health",
  "Data Analytics",
  "Computer Science",
  "Engineering",
  "Social Sciences",
  "Hospitality",
  "Human Resources",
  "Research Methods"
];

export const whatStudentsValue = [
  {
    title: "Confidential Support",
    description:
      "Enquiries, files, and project discussions are handled privately from the first message."
  },
  {
    title: "Responsive Communication",
    description:
      "Students can clarify deadlines, rubrics, scope, and revisions without navigating a cluttered service menu."
  },
  {
    title: "Expert Review",
    description:
      "Work is matched to academic support needs such as structure, research logic, editing, or referencing."
  },
  {
    title: "Revision Support",
    description:
      "Reasonable revisions can be reviewed against the original brief and agreed instructions."
  },
  {
    title: "Deadline Management",
    description:
      "The quote flow captures urgency early so timelines can be assessed before commitment."
  }
];

export const sampleCards = [
  {
    title: "MBA Coursework Structure Improvement",
    description:
      "Improving flow, section structure, argument clarity, and Harvard-style referencing around a management brief.",
    category: "Coursework structure",
    reviewed: "Brief alignment, section order, argument progression, and citation consistency.",
    changed: "Reorganised the outline, clarified the purpose of each section, and flagged referencing gaps.",
    learn: "How a marking brief can be translated into a logical academic structure.",
    tags: ["MBA", "Structure", "Referencing"]
  },
  {
    title: "Dissertation Literature Review Editing",
    description:
      "Improving theme grouping, source integration, academic tone, and chapter readability.",
    category: "Dissertation review",
    reviewed: "Theme grouping, source synthesis, paragraph logic, and chapter readability.",
    changed: "Reduced source-by-source narration and strengthened connections between themes and the research focus.",
    learn: "How literature reviews move from summary toward critical synthesis.",
    tags: ["Dissertation", "Editing", "Academic tone"]
  },
  {
    title: "SOP Transformation",
    description:
      "Turning scattered profile notes into a clear, specific, university-focused admissions narrative.",
    category: "SOP narrative",
    reviewed: "Programme fit, profile evidence, narrative sequence, specificity, and tone.",
    changed: "Grouped profile evidence around a clearer motivation, academic direction, and future objective.",
    learn: "How an SOP can stay personal, specific, and grounded in accurate applicant information.",
    tags: ["SOP", "Admissions", "Narrative"]
  },
  {
    title: "Harvard Referencing Correction",
    description:
      "Fixing citation consistency, reference list formatting, missing source details, and in-text citation alignment.",
    category: "Referencing",
    reviewed: "In-text citations, reference entries, punctuation, ordering, and missing bibliographic details.",
    changed: "Standardised entries and flagged sources that needed confirmation rather than inventing details.",
    learn: "How citation and reference-list checks work together in a Harvard-style review.",
    tags: ["Harvard", "Citations", "Formatting"]
  },
  {
    title: "Research Proposal Refinement",
    description:
      "Improving research aim, objectives, methodology clarity, feasibility, and academic presentation.",
    category: "Research proposal",
    reviewed: "Research aim, objectives, question alignment, method logic, feasibility, and presentation.",
    changed: "Tightened the relationship between the research problem, objectives, and proposed method.",
    learn: "How a proposal can show a coherent and feasible research direction.",
    tags: ["Proposal", "Methods", "Clarity"]
  },
  {
    title: "Academic Proofreading Review",
    description:
      "Reviewing grammar, sentence clarity, academic tone, consistency, and final-readiness without changing the writer's intended meaning.",
    category: "Academic editing",
    reviewed: "Grammar, punctuation, sentence flow, terminology, tone, headings, and visible consistency issues.",
    changed: "Corrected language-level errors and flagged passages requiring author clarification.",
    learn: "How proofreading differs from deeper structural editing and preserves the writer's meaning.",
    tags: ["Editing", "Proofreading", "Clarity"]
  }
];

export const homeFaqs: FAQItem[] = [
  {
    question: "How fast can I get a quote?",
    answer:
      "Complete briefs are easier to scope quickly. Share the service type, deadline, academic level, word count, and files. WhatsApp is the fastest route for urgent requests."
  },
  {
    question: "What should I share for a quote?",
    answer:
      "Share the brief, rubric, draft, supervisor comments, deadline, academic level, word count, and referencing style if available."
  },
  {
    question: "Is my information confidential?",
    answer:
      "Yes. WriteX handles briefs, drafts, rubrics, SOP prompts, and conversations through a private academic support workflow."
  },
  {
    question: "Is this service for learning support?",
    answer:
      "Yes. WriteX provides academic support, research guidance, editing, proofreading, formatting, originality review, and model solutions for learning purposes. Students are responsible for following their institution's academic integrity policies."
  }
];

export const servicePages: Record<string, ServicePage> = {
  assignment: {
    title: "Coursework & Brief Support for University Students",
    eyebrow: "Coursework brief support",
    description:
      "Academic support and review for coursework briefs where students need brief review, research guidance, structure planning, referencing support, editing support, or model solutions for learning.",
    path: "/assignment-support",
    primaryCta: "Get Coursework Quote",
    secondaryCta: "Send Brief on WhatsApp",
    whoThisIsFor: [
      "Students with coursework briefs, rubrics, or draft documents that need clearer academic direction.",
      "International students who need help understanding structure, referencing expectations, and assessment instructions.",
      "Learners who need model solutions for learning rather than promises about marks, submissions, or outcomes."
    ],
    helpWith: [
      "Brief review against assignment instructions and marking criteria",
      "Research guidance for credible source direction and argument planning",
      "Structure planning for introductions, sections, analysis, and conclusions",
      "Referencing support across Harvard, APA, MLA, Vancouver, OSCOLA, or supplied styles",
      "Editing support for clarity, academic tone, grammar, and flow",
      "Model solutions for learning, review, and guided academic understanding"
    ],
    process: [
      {
        title: "Brief scoped",
        description:
          "WriteX reviews the assignment question, rubric, word count, subject, deadline, and academic level before recommending a support path."
      },
      {
        title: "Structure mapped",
        description:
          "The request is framed around research direction, section planning, referencing expectations, and the level of editing or model guidance needed."
      },
      {
        title: "Support reviewed",
        description:
          "The output is checked for instruction alignment, academic tone, citation consistency, formatting, and learning-focused clarity."
      }
    ],
    uploadItems: [
      "Assignment brief",
      "Marking rubric",
      "Current draft or notes",
      "Module handbook or learning outcomes",
      "Required referencing style",
      "Deadline and word count",
      "Tutor comments or feedback"
    ],
    qualityChecks: [
      "Brief alignment",
      "Structure and argument flow",
      "Research logic",
      "Citation and reference consistency",
      "Academic tone and readability",
      "Formatting against supplied instructions"
    ],
    relatedServices: [
      {
        label: "Academic Editing & Proofreading",
        href: "/editing-proofreading",
        description:
          "For students who already have a draft and need clarity, tone, grammar, structure, and final-readiness review."
      },
      {
        label: "Formatting & Referencing",
        href: "/formatting-referencing",
        description:
          "For citation style checks, reference list cleanup, and university-specific formatting requirements."
      },
      {
        label: "Originality & AI Review",
        href: "/plagiarism-ai-review",
        description:
          "For similarity review, citation correction, source attribution guidance, and human language review."
      }
    ],
    ctaTitle: "Ready to scope your coursework brief?",
    ctaDescription:
      "Send the brief, rubric, deadline, academic level, and any draft files so WriteX can review the right support path before quoting.",
    faqs: [
      {
        question: "How does WriteX keep coursework support responsible?",
        answer:
          "WriteX positions its work as academic support and review, not academic misconduct. Students can request research guidance, structure review, academic editing, formatting, referencing support, originality review, and model solutions for learning. Students are responsible for following their institution's academic integrity policies."
      },
      {
        question: "Can WriteX help if I only have a rubric?",
        answer:
          "Yes. Share the rubric, topic, module details, word count, academic level, and deadline so the support path can be scoped responsibly."
      },
      {
        question: "Does assignment support include referencing?",
        answer:
          "Yes. Referencing support can cover citation placement, reference list consistency, and styles such as Harvard, APA, MLA, Vancouver, OSCOLA, or supplied university guidance."
      },
      {
        question: "Can I request a model solution for learning?",
        answer:
          "Yes. Model solutions can be scoped for learning and review purposes, with students responsible for following their institution's academic integrity policies."
      }
    ]
  },
  dissertation: {
    title: "Dissertation & Thesis Support",
    eyebrow: "Research project support",
    description:
      "Structured dissertation and thesis support for proposals, literature review editing, methodology clarity, chapter editing, supervisor-comment response, formatting, and referencing.",
    path: "/dissertation-thesis-support",
    primaryCta: "Get Dissertation Quote",
    secondaryCta: "Send Chapter on WhatsApp",
    whoThisIsFor: [
      "Students working on proposals, literature reviews, methodology chapters, discussion sections, or full dissertation drafts.",
      "Researchers who need help turning supervisor comments into a clear revision path.",
      "Students who need long-form academic editing, formatting, referencing, and chapter-level coherence checks."
    ],
    helpWith: [
      "Proposal support for research aim, objectives, questions, and feasibility",
      "Literature review support for theme grouping, source integration, and chapter flow",
      "Methodology clarity around research design, sampling, data collection, and limitations",
      "Chapter editing for readability, academic tone, structure, and argument progression",
      "Supervisor-comment response support and revision planning",
      "Formatting and referencing for long-form academic documents"
    ],
    process: [
      {
        title: "Research stage reviewed",
        description:
          "WriteX identifies whether the request concerns proposal development, chapter editing, supervisor response, formatting, or full-document review."
      },
      {
        title: "Chapter scope mapped",
        description:
          "The team reviews word count, chapter condition, research method, source requirements, deadline, and feedback notes before confirming scope."
      },
      {
        title: "Long-form QA planned",
        description:
          "Checks focus on structure, academic tone, source integration, heading consistency, references, formatting, and agreed instructions."
      }
    ],
    uploadItems: [
      "Research proposal or dissertation brief",
      "Current chapter draft",
      "Supervisor comments",
      "University handbook or formatting guide",
      "Referencing style requirements",
      "Data output or analysis notes where relevant",
      "Deadline and word count"
    ],
    qualityChecks: [
      "Aim, objective, and question alignment",
      "Literature theme grouping",
      "Methodology explanation clarity",
      "Chapter flow and section logic",
      "Supervisor-comment alignment",
      "Formatting and reference consistency"
    ],
    relatedServices: [
      {
        label: "Academic Editing & Proofreading",
        href: "/editing-proofreading",
        description:
          "For grammar, clarity, academic tone, structure, formatting, references, and final-readiness review."
      },
      {
        label: "Formatting & Referencing",
        href: "/formatting-referencing",
        description:
          "For long-document layout, citation style alignment, tables, figures, appendices, and reference list cleanup."
      },
      {
        label: "Originality & AI Review",
        href: "/plagiarism-ai-review",
        description:
          "For similarity review, citation correction, source attribution guidance, and human language review."
      }
    ],
    ctaTitle: "Ready to review your dissertation scope?",
    ctaDescription:
      "Share your chapter, proposal, supervisor comments, deadline, and formatting instructions so WriteX can recommend the right next step.",
    faqs: [
      {
        question: "Can WriteX support one dissertation chapter at a time?",
        answer:
          "Yes. Dissertation support can be scoped by chapter, supervisor comment, milestone, or full-document review depending on your deadline and files."
      },
      {
        question: "Can you help with methodology clarity?",
        answer:
          "Yes. Methodology support can focus on research design explanation, data collection logic, sampling clarity, limitations, and alignment with the research questions."
      },
      {
        question: "Do you support formatting and referencing for dissertations?",
        answer:
          "Yes. Formatting and referencing support can cover headings, tables, figures, appendices, citation style, and reference list consistency."
      },
      {
        question: "What should I share for an accurate dissertation quote?",
        answer:
          "Share the relevant chapter or proposal, research brief, supervisor comments, academic level, word count, deadline, and required referencing or formatting guidance."
      }
    ]
  },
  sop: {
    title: "SOP & Admissions Support",
    eyebrow: "Admissions narrative support",
    description:
      "SOP and admissions support for SOP planning, personal statement editing, LOR editing, CV polish, profile positioning, and university-specific narrative development.",
    path: "/sop-admissions-writing",
    primaryCta: "Get SOP Quote",
    secondaryCta: "Send Profile Notes",
    whoThisIsFor: [
      "Students applying to universities who need a clearer, more specific admissions narrative.",
      "Applicants with scattered profile notes, draft SOPs, CVs, LORs, or personal statement prompts.",
      "Students who need university-specific positioning without fake claims or generic admissions language."
    ],
    helpWith: [
      "SOP planning around academic background, goals, program fit, and career direction",
      "Personal statement editing for clarity, specificity, tone, and flow",
      "LOR editing for structure, credibility, and concise recommendation language",
      "CV polish for academic, internship, project, research, and professional experience",
      "Profile positioning based on real achievements, constraints, and program relevance",
      "University-specific narrative adaptation for prompts, courses, and application context"
    ],
    process: [
      {
        title: "Profile reviewed",
        description:
          "WriteX reviews profile notes, CV, target program, prompt, achievements, goals, and any existing draft before planning the narrative."
      },
      {
        title: "Narrative shaped",
        description:
          "The admissions document is scoped around real evidence, university fit, academic goals, career direction, and prompt alignment."
      },
      {
        title: "Final polish checked",
        description:
          "The document is reviewed for specificity, tone, flow, grammar, repetition, clarity, and consistency with the application brief."
      }
    ],
    uploadItems: [
      "SOP prompt or university instructions",
      "Existing SOP or personal statement draft",
      "CV or resume",
      "Academic background and achievements",
      "Target course and university list",
      "Career goals and profile notes",
      "LOR draft where relevant"
    ],
    qualityChecks: [
      "Prompt alignment",
      "Profile specificity",
      "University and course fit",
      "Narrative flow",
      "Academic and career goal clarity",
      "Grammar, tone, and final polish"
    ],
    relatedServices: [
      {
        label: "Academic Editing & Proofreading",
        href: "/editing-proofreading",
        description:
          "For admissions drafts that need grammar, clarity, structure, tone, and final-readiness review."
      },
      {
        label: "Coursework & Brief Support",
        href: "/assignment-support",
        description:
          "For coursework briefs where students need research guidance, structure planning, and referencing support."
      },
      {
        label: "Dissertation & Thesis Support",
        href: "/dissertation-thesis-support",
        description:
          "For proposals, literature reviews, methodology clarity, chapter editing, formatting, and referencing."
      }
    ],
    ctaTitle: "Ready to shape your admissions document?",
    ctaDescription:
      "Send your SOP prompt, CV, target program, profile notes, and draft so WriteX can scope the right admissions support.",
    faqs: [
      {
        question: "Do I need to provide profile details first?",
        answer:
          "Yes. Strong SOP and admissions support depends on accurate academic background, goals, program details, achievements, constraints, and draft condition."
      },
      {
        question: "Can WriteX tailor an SOP for different universities?",
        answer:
          "Yes. Share each university, course, and prompt so the narrative can be adapted while staying specific and authentic."
      },
      {
        question: "Can you edit LORs and CVs too?",
        answer:
          "Yes. LOR editing and CV polish can be scoped alongside SOP or personal statement support."
      },
      {
        question: "How is authenticity protected in admissions support?",
        answer:
          "The narrative is built from accurate profile details, goals, experience, and programme requirements. Applicants remain responsible for reviewing and approving every claim."
      }
    ]
  },
  editing: {
    title: "Academic Editing & Proofreading",
    eyebrow: "Academic document polish",
    description:
      "Academic editing and proofreading for grammar, clarity, academic tone, structure, formatting, referencing, and final-readiness review.",
    path: "/editing-proofreading",
    primaryCta: "Get Editing Quote",
    secondaryCta: "Send Draft on WhatsApp",
    whoThisIsFor: [
      "Students who already have a draft and need it reviewed before submission or supervisor review.",
      "Students who need grammar, clarity, academic tone, structure, formatting, and referencing checked together.",
      "Students with urgent drafts where realistic review scope must be confirmed before commitment."
    ],
    helpWith: [
      "Grammar, punctuation, and sentence-level correction",
      "Clarity improvement while preserving the student's intended meaning",
      "Academic tone refinement for formal university writing",
      "Structure review for headings, paragraphs, transitions, and argument flow",
      "Formatting checks against university guidance or supplied style sheets",
      "Referencing and final-readiness review for citations, reference lists, and document presentation"
    ],
    process: [
      {
        title: "Draft condition reviewed",
        description:
          "WriteX checks word count, academic level, draft condition, instructions, deadline, and required depth of review before quoting."
      },
      {
        title: "Editing scope defined",
        description:
          "The support path is set around grammar, clarity, tone, structure, formatting, referencing, or a combined final-readiness review."
      },
      {
        title: "Quality pass completed",
        description:
          "The document is reviewed for readability, consistency, academic tone, references, formatting, and agreed instructions."
      }
    ],
    uploadItems: [
      "Current draft",
      "Assignment or dissertation instructions",
      "Marking rubric",
      "Formatting guide",
      "Referencing style",
      "Supervisor comments",
      "Deadline and word count"
    ],
    qualityChecks: [
      "Grammar and punctuation",
      "Sentence clarity",
      "Academic tone",
      "Paragraph and section flow",
      "Citation and reference consistency",
      "Final-readiness against instructions"
    ],
    relatedServices: [
      {
        label: "Coursework & Brief Support",
        href: "/assignment-support",
        description:
          "For coursework briefs needing research guidance, structure planning, referencing support, or model solutions for learning."
      },
      {
        label: "Dissertation & Thesis Support",
        href: "/dissertation-thesis-support",
        description:
          "For chapter editing, supervisor-comment response, literature review support, formatting, and referencing."
      },
      {
        label: "Formatting & Referencing",
        href: "/formatting-referencing",
        description:
          "For citation style correction, reference list consistency, layout cleanup, tables, figures, and appendices."
      }
    ],
    ctaTitle: "Ready to polish your academic draft?",
    ctaDescription:
      "Share your draft, instructions, word count, deadline, and required review level so WriteX can scope the editing path.",
    faqs: [
      {
        question: "Will editing change my meaning?",
        answer:
          "The goal is to preserve your intended meaning while improving grammar, clarity, academic tone, structure, formatting, and referencing."
      },
      {
        question: "Can WriteX proofread urgent drafts?",
        answer:
          "Urgent proofreading can be reviewed after checking word count, document condition, deadline, and realistic review scope."
      },
      {
        question: "Does editing include referencing checks?",
        answer:
          "Yes. Referencing checks can include in-text citation consistency, reference list cleanup, missing details, and style alignment."
      },
      {
        question: "What is the difference between editing and proofreading?",
        answer:
          "Editing can address clarity, structure, academic tone, and flow, while proofreading focuses more narrowly on grammar, spelling, punctuation, and final consistency."
      }
    ]
  },
  plagiarism: {
    title: "Originality & AI Review Support",
    eyebrow: "Academic integrity review",
    description:
      "Human-led originality and AI review support for similarity review, citation correction, academic integrity support, human language review, and source attribution guidance.",
    path: "/plagiarism-ai-review",
    primaryCta: "Get Review Quote",
    secondaryCta: "Send Draft on WhatsApp",
    whoThisIsFor: [
      "Students who need responsible review of similarity concerns, citation gaps, or source attribution issues.",
      "Students who want human language review for clarity, academic tone, repetition, and mechanical phrasing.",
      "Students who need academic integrity-safe guidance before revising their document."
    ],
    helpWith: [
      "Similarity review to identify likely citation, quotation, paraphrase, or source-use concerns",
      "Citation correction for missing, inconsistent, or misplaced references",
      "Academic integrity support framed around responsible learning and policy awareness",
      "Human language review for clarity, tone, repetition, and readability",
      "Source attribution guidance for quotations, paraphrases, reference lists, and in-text citations",
      "Document-level notes that help students understand where revision attention is needed"
    ],
    process: [
      {
        title: "Document reviewed",
        description:
          "WriteX checks the draft condition, referencing style, source use, academic level, and concern type before confirming review scope."
      },
      {
        title: "Attribution path mapped",
        description:
          "The review focuses on citation correction, paraphrase quality, source attribution, academic tone, and language clarity."
      },
      {
        title: "Integrity-safe notes shared",
        description:
          "Guidance is framed around learning, responsible source use, citation consistency, and institutional policy awareness."
      }
    ],
    uploadItems: [
      "Current draft",
      "Similarity report if available",
      "Reference list",
      "Source files or links where available",
      "University referencing guide",
      "Assignment or dissertation instructions",
      "Deadline and review concern"
    ],
    qualityChecks: [
      "Similarity concern review",
      "Citation placement",
      "Reference completeness",
      "Source attribution clarity",
      "Human language and tone review",
      "Academic integrity-safe guidance"
    ],
    relatedServices: [
      {
        label: "Academic Editing & Proofreading",
        href: "/editing-proofreading",
        description:
          "For clarity, grammar, academic tone, structure, formatting, references, and final-readiness checks."
      },
      {
        label: "Formatting & Referencing",
        href: "/formatting-referencing",
        description:
          "For citation style correction, reference list cleanup, and university-specific formatting."
      },
      {
        label: "Coursework & Brief Support",
        href: "/assignment-support",
        description:
          "For coursework briefs that need research guidance, structure planning, referencing, and editing support."
      }
    ],
    ctaTitle: "Ready to review your document safely?",
    ctaDescription:
      "Send your draft, similarity concern, referencing style, and deadline so WriteX can recommend an integrity-safe review path.",
    faqs: [
      {
        question: "Can WriteX help reduce similarity concerns ethically?",
        answer:
          "WriteX can help identify likely causes of similarity concerns and improve citation, paraphrase quality, source attribution, and academic tone."
      },
      {
        question: "Is AI review automatic?",
        answer:
          "No. This page is positioned around human language review, academic tone, clarity, citation correction, and originality concerns."
      },
      {
        question: "Can WriteX promise an originality score?",
        answer:
          "No. WriteX does not promise scores or outcomes. Support is framed around responsible review, citation correction, and learning-focused guidance."
      },
      {
        question: "What should I share for an originality review?",
        answer:
          "Share the current draft, available similarity information, source list, required citation style, deadline, and any institutional guidance relevant to the document."
      }
    ]
  },
  formatting: {
    title: "Formatting & Referencing",
    eyebrow: "Citation and document presentation",
    description:
      "Formatting and referencing support for Harvard, APA, MLA, Chicago, OSCOLA, university-specific formatting, and reference list consistency.",
    path: "/formatting-referencing",
    primaryCta: "Get Formatting Quote",
    secondaryCta: "Send Guide on WhatsApp",
    whoThisIsFor: [
      "Students with drafts that need citation style correction, reference list cleanup, or document presentation review.",
      "Students working with strict dissertation, coursework, report, or SOP formatting instructions.",
      "Students who need university-specific formatting applied consistently across a document."
    ],
    helpWith: [
      "Harvard referencing support for in-text citations and reference list consistency",
      "APA, MLA, Chicago, and OSCOLA checks where the required style is supplied",
      "University-specific formatting for headings, spacing, margins, page layout, and document presentation",
      "Reference list consistency, missing details, punctuation, ordering, and style alignment",
      "Tables, figures, appendices, captions, and document element formatting",
      "Final formatting review against supplied instructions or supervisor notes"
    ],
    process: [
      {
        title: "Style guide reviewed",
        description:
          "WriteX checks the required referencing style, university instructions, document type, word count, and deadline before quoting."
      },
      {
        title: "Document rules mapped",
        description:
          "The support path is defined around citations, reference list consistency, page layout, headings, tables, figures, appendices, or all of these."
      },
      {
        title: "Presentation check completed",
        description:
          "The file is reviewed for formatting consistency, citation style alignment, missing reference details, and agreed instructions."
      }
    ],
    uploadItems: [
      "Current draft",
      "Referencing style guide",
      "University formatting instructions",
      "Reference list or source list",
      "Supervisor comments",
      "Tables, figures, or appendices",
      "Deadline and required file format"
    ],
    qualityChecks: [
      "Harvard, APA, MLA, Chicago, or OSCOLA style alignment",
      "In-text citation consistency",
      "Reference list completeness",
      "Headings, spacing, margins, and layout",
      "Tables, figures, captions, and appendices",
      "University-specific formatting instructions"
    ],
    relatedServices: [
      {
        label: "Academic Editing & Proofreading",
        href: "/editing-proofreading",
        description:
          "For grammar, clarity, academic tone, structure, and final-readiness review alongside formatting needs."
      },
      {
        label: "Dissertation & Thesis Support",
        href: "/dissertation-thesis-support",
        description:
          "For long-form proposals, literature reviews, methodology clarity, chapter editing, formatting, and referencing."
      },
      {
        label: "Originality & AI Review",
        href: "/plagiarism-ai-review",
        description:
          "For similarity review, citation correction, source attribution guidance, and human language review."
      }
    ],
    ctaTitle: "Ready to clean up your formatting and references?",
    ctaDescription:
      "Send your draft, reference list, style guide, formatting instructions, and deadline so WriteX can scope the review accurately.",
    faqs: [
      {
        question: "Which referencing styles does WriteX support?",
        answer:
          "Formatting and referencing support can cover Harvard, APA, MLA, Chicago, OSCOLA, and university-specific styles when instructions are provided."
      },
      {
        question: "Can you fix only the reference list?",
        answer:
          "Yes. A reference-list-only review can be scoped if you share the required style, source details, draft, and deadline."
      },
      {
        question: "Can formatting include tables and figures?",
        answer:
          "Yes. Formatting support can include tables, figures, captions, appendices, headings, spacing, margins, and supplied university layout requirements."
      },
      {
        question: "Do you check in-text citations against the reference list?",
        answer:
          "Yes. The review can check citation and reference-list consistency, flag missing bibliographic details, and align entries with the required style."
      }
    ]
  }
};

export const pricingFaqs: FAQItem[] = [
  {
    question: "Why does WriteX use quote-based pricing?",
    answer:
      "Academic support depends on the service type, academic level, subject, word count, deadline, files, and document condition. Scope-based pricing helps avoid misleading one-size-fits-all rates."
  },
  {
    question: "What should I upload for an accurate quote?",
    answer:
      "Upload the assignment brief, rubric, draft, supervisor comments, SOP prompt, dissertation chapter, formatting guide, or any file that explains the requirement."
  },
  {
    question: "How quickly will I hear back?",
    answer:
      "Complete requests are easier to review quickly. WhatsApp is the fastest path for urgent deadlines."
  },
  {
    question: "Can I send the brief on WhatsApp instead?",
    answer:
      "Yes. You can send your brief, deadline, word count, academic level, and files directly on WhatsApp."
  },
  {
    question: "Do urgent deadlines cost more?",
    answer:
      "Urgent requests may require faster scoping, availability checks, and tighter coordination. The quote depends on what is realistically supportable within the timeline."
  },
  {
    question: "What happens if my instructions are incomplete?",
    answer:
      "WriteX may ask for missing details such as the rubric, word count, referencing style, academic level, or deadline before quoting."
  },
  {
    question: "Is my file confidential?",
    answer:
      "Yes. Briefs, drafts, rubrics, SOP prompts, and conversations are handled through a private support workflow."
  },
  {
    question: "Is this service academic integrity-safe?",
    answer:
      "WriteX provides academic support, research guidance, editing, proofreading, formatting, originality review, and model solutions for learning purposes. Students are responsible for following their institution's academic integrity policies."
  }
];
