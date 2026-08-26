export const hiringOptionSetKeys = [
  "qualification",
  "writer_subject",
  "academic_level",
  "writing_experience",
  "research_experience",
  "editing_experience",
  "referencing_style",
  "sales_industry",
  "language",
  "communication_channel",
  "lead_experience",
  "target_experience",
  "conversion_experience",
  "objection_experience",
  "relationship_type",
  "referral_source",
  "employment_status",
  "work_mode",
  "joining_availability",
  "salary_structure",
  "ai_usage"
] as const;

export type HiringOptionSetKey = (typeof hiringOptionSetKeys)[number];

export type HiringOption = {
  value: string;
  label: string;
  active: boolean;
  protected: boolean;
  displayOrder: number;
};

const values = (items: string[]): HiringOption[] =>
  items.map((label, index) => ({
    value: label,
    label,
    active: true,
    protected: true,
    displayOrder: index
  }));

export const defaultHiringOptions: Record<HiringOptionSetKey, HiringOption[]> = {
  qualification: values([
    "Undergraduate",
    "Bachelor's Degree",
    "Master's Degree",
    "MPhil",
    "PhD",
    "Professional Qualification",
    "Other"
  ]),
  writer_subject: values([
    "Management",
    "Business",
    "Finance",
    "Accounting",
    "Economics",
    "Marketing",
    "Human Resources",
    "Law",
    "Psychology",
    "Sociology",
    "Education",
    "Healthcare",
    "Nursing",
    "Public Health",
    "Computer Science",
    "Information Technology",
    "Engineering",
    "Data Science",
    "Statistics",
    "Mathematics",
    "Environmental Science",
    "Political Science",
    "International Relations",
    "Literature",
    "History",
    "Other"
  ]),
  academic_level: values([
    "Foundation",
    "Diploma",
    "Undergraduate",
    "Postgraduate",
    "MBA",
    "MPhil",
    "PhD",
    "Professional Certification"
  ]),
  writing_experience: values([
    "No professional experience",
    "Less than 1 year",
    "1-2 years",
    "2-4 years",
    "4-6 years",
    "6-10 years",
    "More than 10 years"
  ]),
  research_experience: values([
    "None",
    "Basic",
    "Intermediate",
    "Advanced",
    "Published research experience"
  ]),
  editing_experience: values([
    "None",
    "Basic",
    "Intermediate",
    "Advanced",
    "Professional editor"
  ]),
  referencing_style: values([
    "APA",
    "Harvard",
    "MLA",
    "Chicago",
    "OSCOLA",
    "Vancouver",
    "IEEE",
    "AMA",
    "MHRA",
    "Turabian",
    "Other"
  ]),
  sales_industry: values([
    "Education",
    "EdTech",
    "Academic Services",
    "BPO",
    "Customer Support",
    "Inside Sales",
    "SaaS",
    "IT Services",
    "Financial Services",
    "Insurance",
    "Real Estate",
    "Healthcare",
    "Recruitment",
    "E-commerce",
    "Other"
  ]),
  language: values([
    "English",
    "Hindi",
    "Bengali",
    "Tamil",
    "Telugu",
    "Kannada",
    "Malayalam",
    "Marathi",
    "Gujarati",
    "Punjabi",
    "Urdu",
    "Other"
  ]),
  communication_channel: values([
    "Written communication",
    "Voice calls",
    "Video calls",
    "WhatsApp/chat",
    "Email",
    "Multiple channels"
  ]),
  lead_experience: values([
    "None",
    "Inbound leads",
    "Outbound leads",
    "Warm leads",
    "Cold leads",
    "Existing customers",
    "High-ticket sales",
    "Multiple categories"
  ]),
  target_experience: values([
    "No formal target",
    "Below INR 1 lakh",
    "INR 1-3 lakh",
    "INR 3-5 lakh",
    "INR 5-10 lakh",
    "Above INR 10 lakh",
    "Prefer not to disclose"
  ]),
  conversion_experience: values([
    "No direct conversion ownership",
    "Assisted conversions",
    "Direct conversion responsibility",
    "Team conversion responsibility",
    "High-value account conversion"
  ]),
  objection_experience: values([
    "Price objection",
    "Trust objection",
    "Delay objection",
    "Competitor comparison",
    "Refund concern",
    "Quality concern",
    "Payment concern",
    "No prior experience"
  ]),
  relationship_type: values([
    "Family",
    "Friend",
    "Former colleague",
    "Current colleague",
    "Professional contact",
    "Other"
  ]),
  referral_source: values([
    "WriteX website",
    "LinkedIn",
    "Job portal",
    "Employee referral",
    "Professional network",
    "Search engine",
    "Other"
  ]),
  employment_status: values([
    "Not currently employed",
    "Employed and serving notice",
    "Employed, notice not submitted",
    "Student completing final semester",
    "Other"
  ]),
  work_mode: values(["Office"]),
  joining_availability: values([
    "Immediate",
    "Within 7 days",
    "Within 15 days",
    "Within 30 days",
    "31-60 days",
    "More than 60 days"
  ]),
  salary_structure: values([
    "Fixed monthly",
    "Fixed + incentive",
    "Incentive-heavy",
    "Negotiable"
  ]),
  ai_usage: values([
    "I do not use AI tools",
    "I use AI only for brainstorming",
    "I use AI for research assistance",
    "I use AI for editing/grammar",
    "I use AI during drafting",
    "Other"
  ])
};

export function getDefaultActiveHiringOptions() {
  return Object.fromEntries(
    Object.entries(defaultHiringOptions).map(([key, options]) => [
      key,
      options.filter((option) => option.active)
    ])
  ) as Record<HiringOptionSetKey, HiringOption[]>;
}

export function isHiringOptionSetKey(value: string): value is HiringOptionSetKey {
  return (hiringOptionSetKeys as readonly string[]).includes(value);
}
