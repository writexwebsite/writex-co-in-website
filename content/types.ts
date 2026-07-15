export type SeoContentCollection = "service" | "country" | "subject" | "help";

export type EditableContentStatus =
  "Editable SEO draft - replace with WriteX/WIU approved copy before final rollout";

export type SeoInternalLink = {
  label: string;
  href: string;
};

export type SeoFaqItem = {
  question: string;
  answer: string;
};

export type SeoContentSource = {
  collection: SeoContentCollection;
  slug: string;
  path: string;
  rolloutPhase: "launch" | "phase-2";
  contentStatus: EditableContentStatus;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  heroEyebrow: string;
  intro: string;
  serviceExplanation: {
    h2: string;
    body: string;
  };
  commonChallenges?: {
    h2: string;
    items: readonly string[];
  };
  whoThisIsFor: {
    h2: string;
    items: readonly string[];
  };
  whatWriteXCanHelpWith: {
    h2: string;
    items: readonly string[];
  };
  whatToUpload: {
    h2: string;
    items: readonly string[];
  };
  process: {
    h2: string;
    steps: readonly string[];
  };
  qualityChecks?: {
    h2: string;
    items: readonly string[];
  };
  faq: readonly SeoFaqItem[];
  cta: {
    title: string;
    description: string;
  };
  internalLinks: readonly SeoInternalLink[];
  academicIntegrityDisclaimer: string;
  schemaType: "Service" | "Article";
  article?: {
    datePublished: string;
    dateModified: string;
    authorName: string;
  };
};
