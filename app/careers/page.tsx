import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  ShieldCheck
} from "lucide-react";
import { CTAButton } from "@/components/CTAButton";
import { PageHero } from "@/components/PageHero";
import { ProcessSteps } from "@/components/ProcessSteps";
import { SectionHeader } from "@/components/SectionHeader";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import {
  CAREERS_LOCATION,
  hiringRoleLabels
} from "@/lib/hiring/domain";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";

export const metadata: Metadata = {
  title: "WriteX Careers | Academic Writer & Sales Roles",
  description:
    "Explore full-time Academic Writer and Sales Executive opportunities in Kolkata, India, understand the fair hiring process, and apply securely.",
  alternates: { canonical: "https://www.writex.co.in/careers" },
  robots: { index: true, follow: true }
};

const roles = [
  {
    title: hiringRoleLabels.academic_writer,
    href: "/careers/academic-writer",
    icon: BookOpenCheck,
    focus: "Research, writing, editing and referencing",
    assessment: "Written, editing, revision and integrity review",
    fit: "Subject specialists with careful source practice",
    details: [
      "Full-time employment",
      CAREERS_LOCATION,
      "Strong subject and research fit",
      "Approximately 90-minute role assessment"
    ]
  },
  {
    title: "Sales Executive",
    href: "/careers/sales-executive",
    icon: BriefcaseBusiness,
    focus: "Lead qualification and ethical customer conversations",
    assessment: "Sales scenarios, voice review and human interview",
    fit: "Clear communicators with responsible sales judgement",
    details: [
      "Full-time employment",
      CAREERS_LOCATION,
      "Communication and objection handling",
      "Approximately 75-minute role assessment"
    ]
  }
];

const process = [
  {
    title: "Application",
    description: "Share your role details and the approved initial review files."
  },
  {
    title: "Eligibility",
    description: "Published role requirements and candidate disclosures are reviewed."
  },
  {
    title: "Assessment",
    description: "Eligible applicants receive a private role assessment."
  },
  {
    title: "System + Admin Review",
    description: "Independent System Review and human Admin Review remain separate."
  },
  {
    title: "Viva / Interview",
    description: "Shortlisted candidates complete the role-specific human stage."
  },
  {
    title: "Final Outcome",
    description: "An authorised Admin records Offer, Talent Pool or Not Selected."
  }
];

const reasons = [
  [
    "Clear role standards",
    "Responsibilities and review criteria are explained before you apply."
  ],
  [
    "Human decisions",
    "Eligibility, assessments and interviews are reviewed by authorised people."
  ],
  [
    "Privacy by stage",
    "Sensitive verification documents are requested only after shortlist."
  ],
  [
    "Traceable progress",
    "Every submitted application receives a reference for safe status checks."
  ]
];

export default function CareersPage() {
  if (!isHiringFeatureEnabled("applications")) notFound();

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="WriteX Careers & Talent Hub"
        title="Careful Work Starts With a Fair Hiring Process"
        description="Explore full-time pathways for academic specialists and consultative sales professionals. Every application follows a clear, human-reviewed journey."
        actions={
          <>
            <CTAButton href="#open-roles">View Open Roles</CTAButton>
            <CTAButton href="/careers/application-status" variant="secondary">
              Check Application Status
            </CTAButton>
          </>
        }
        supportingCards={[
          {
            title: "Full-time roles with clear expectations.",
            description:
              "Role scope, assessment stages, and work arrangements are explained before submission."
          },
          {
            title: "Human review at every decision point.",
            description:
              "Automated checks support authorised reviewers; they do not make final hiring decisions."
          }
        ]}
        microcopy="Initial applications do not request Aadhaar, PAN, degree certificates, or marksheets."
      />

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.28}
        className="py-10 sm:py-12"
      >
        <section id="open-roles" className="premium-container scroll-mt-24">
          <SectionHeader
            eyebrow="Available pathways"
            title="Choose the Role Closest to Your Experience"
            description="Both current opportunities are full-time. Freelance, part-time, contract, and hourly engagements are not available."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <article
                  key={role.href}
                  className="flex h-full flex-col rounded-md border border-wxBorder bg-white p-5 shadow-sm sm:p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-wxViolet700/10 text-wxViolet700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h2 className="mt-5 text-2xl font-semibold text-wxIndigo900">
                    {role.title}
                  </h2>
                  <dl className="mt-5 divide-y divide-wxBorder border-y border-wxBorder text-sm">
                    <RoleComparison label="Primary focus" value={role.focus} />
                    <RoleComparison label="Assessment" value={role.assessment} />
                    <RoleComparison label="Best fit" value={role.fit} />
                  </dl>
                  <ul className="mt-5 grid gap-2.5 text-sm leading-6 text-wxIndigo700">
                    {role.details.map((detail) => (
                      <li key={detail} className="flex gap-2.5">
                        <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-wxGreen500" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                  <CTAButton href={role.href} className="mt-6 w-full">
                    View Role and Apply
                  </CTAButton>
                </article>
              );
            })}
          </div>
        </section>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.2}
        className="py-10 sm:py-12"
      >
        <section className="premium-container grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <SectionHeader
            eyebrow="Why work with WriteX"
            title="A Hiring Experience Built Around Clarity"
            description="Candidates should understand the role, the review process, and what happens next without decoding internal systems."
          />
          <div className="grid gap-x-7 gap-y-5 sm:grid-cols-2">
            {reasons.map(([title, text]) => (
              <div key={title} className="flex gap-3 border-t border-wxBorder pt-4">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-wxGreen500" />
                <div>
                  <h2 className="text-base font-semibold text-wxIndigo900">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-wxIndigo500">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.3}
        className="py-10 sm:py-12"
      >
        <section className="premium-container">
          <SectionHeader
            eyebrow="Fair hiring process"
            title="A Clear Five-Step Journey"
            description="The process is structured for consistency while keeping every hiring decision under human review."
          />
          <ProcessSteps steps={process} animated={false} />
        </section>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.2}
        className="py-10 sm:py-12"
      >
        <section className="premium-container">
          <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <SectionHeader
              eyebrow="Privacy and assessment"
              title="Clear Review Without Hidden Decisions"
              description="WriteX collects only the information needed for each hiring stage and keeps final decisions with authorised reviewers."
            />
            <div className="grid gap-6">
              <HiringPrinciple
                icon={Eye}
                title="Assessment transparency"
                text="Role assessments use consistent tasks and human review. Limited integrity checks provide context to reviewers, but no signal creates an automatic fraud conclusion or rejection."
              />
              <HiringPrinciple
                icon={ShieldCheck}
                title="Privacy by hiring stage"
                text="Initial applications collect role-review details only. Identity and education documents are requested after shortlist through the protected Verification Centre."
              />
              <Link
                href="/privacy"
                className="inline-flex items-center gap-2 text-sm font-semibold text-wxViolet700 hover:text-wxPink500"
              >
                Read the Privacy Policy <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-5 rounded-md border border-wxBorder bg-white p-5 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
            <div>
              <h2 className="text-xl font-semibold text-wxIndigo900">
                Already applied?
              </h2>
              <p className="mt-2 text-sm leading-7 text-wxIndigo500">
                Use your application reference and registered contact detail to view
                the safe public stage.
              </p>
            </div>
            <CTAButton href="/careers/application-status">
              Check Application Status
            </CTAButton>
          </div>
        </section>
      </SpectrumBackground>
    </div>
  );
}

function RoleComparison({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-wxIndigo500">{label}</dt>
      <dd className="leading-6 text-wxIndigo800">{value}</dd>
    </div>
  );
}

function HiringPrinciple({
  icon: Icon,
  title,
  text
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <article className="border-l-2 border-wxViolet700 pl-5">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-wxViolet700" aria-hidden />
        <h2 className="text-lg font-semibold text-wxIndigo900">{title}</h2>
      </div>
      <p className="mt-3 text-sm leading-7 text-wxIndigo500">{text}</p>
    </article>
  );
}
