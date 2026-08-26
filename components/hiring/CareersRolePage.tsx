import {
  ArrowDown,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import {
  CAREERS_LOCATION,
  type HiringRole
} from "@/lib/hiring/domain";
import { CTAButton } from "@/components/CTAButton";
import { HiringApplicationForm } from "@/components/hiring/HiringApplicationForm";
import { PageHero } from "@/components/PageHero";
import { ProcessSteps } from "@/components/ProcessSteps";
import { SectionHeader } from "@/components/SectionHeader";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";

type RoleContent = {
  eyebrow: string;
  title: string;
  summary: string;
  overview: string;
  responsibilities: string[];
  requirements: string[];
  preferred: string[];
  assessment: string;
  duration: string;
  location: string;
};

const roleContent: Record<HiringRole, RoleContent> = {
  academic_writer: {
    eyebrow: "Academic Writer / Full-time",
    title: "Apply With Subject Depth and Careful Research Practice",
    summary:
      "A full-time role for academic specialists who can research, structure, edit, and revise complex work with source discipline and transparent tool use.",
    overview:
      "Academic Writers support research-led drafting, editing, referencing, and revision workflows. The role requires clear reasoning, accurate source use, strong written communication, and respect for academic integrity.",
    responsibilities: [
      "Interpret briefs, rubrics, and academic requirements accurately.",
      "Research from credible sources and build clear, original arguments.",
      "Write, edit, and revise work to the approved scope and deadline.",
      "Apply referencing styles consistently and check citation quality.",
      "Respond constructively to review notes and clarification requests."
    ],
    requirements: [
      "Relevant subject knowledge and evidence of structured academic writing.",
      "Strong research, editing, and proofreading judgement.",
      "Ability to explain source choices and revisions during human review.",
      "Full-time commitment and reliable delivery communication.",
      "Transparent disclosure of any AI-assisted workflow."
    ],
    preferred: [
      "Postgraduate or professional qualification in a relevant discipline.",
      "Experience across undergraduate or postgraduate academic levels.",
      "Confidence with APA, Harvard, or other recognised referencing styles."
    ],
    assessment:
      "The role assessment covers source reading, argument structure, analytical writing, editing, referencing, revision, and an integrity declaration. Authorised hiring reviewers make the decision.",
    duration: "Approximately 90-minute role assessment.",
    location: CAREERS_LOCATION
  },
  sales_executive: {
    eyebrow: "Sales Executive / Full-time",
    title: "Bring Clarity and Responsibility to Customer Conversations",
    summary:
      "A full-time consultative sales role focused on understanding customer requirements, qualifying genuine opportunities, and setting clear, ethical expectations.",
    overview:
      "Sales Executives guide prospective customers through scope, timeline, and service-fit conversations. The role values careful listening, accurate qualification, responsible objection handling, and clear follow-up.",
    responsibilities: [
      "Qualify inbound or approved outbound leads without overpromising.",
      "Understand briefs, timelines, and customer concerns before routing.",
      "Handle price, trust, quality, and payment objections responsibly.",
      "Maintain accurate follow-up and conversion records.",
      "Escalate unclear scope, safety, or payment concerns appropriately."
    ],
    requirements: [
      "Clear written and spoken communication across approved channels.",
      "Evidence of lead handling, customer support, or consultative selling.",
      "Responsible expectation setting and ethical sales judgement.",
      "Full-time commitment and dependable follow-up discipline.",
      "Comfort with voice, scenario, and human interview review."
    ],
    preferred: [
      "Experience in education, EdTech, inside sales, or customer support.",
      "Confidence handling trust, price, and competitor objections.",
      "Professional English plus one or more additional customer languages."
    ],
    assessment:
      "The role assessment covers lead qualification, price and trust objections, follow-up, complaint response, voice communication, and a human-reviewed role play.",
    duration: "Approximately 75-minute role assessment.",
    location: CAREERS_LOCATION
  }
};

const process = [
  {
    title: "Application",
    description: "Submit role details and the approved initial review files."
  },
  {
    title: "Eligibility",
    description: "Published role requirements and candidate disclosures are reviewed."
  },
  {
    title: "Assessment",
    description: "Eligible applicants receive a private, time-bound role assessment."
  },
  {
    title: "Assessment Submitted",
    description: "Answers and exact question versions are locked for review."
  },
  {
    title: "System Review",
    description: "Configured rules independently review the locked evidence."
  },
  {
    title: "Admin Review",
    description: "An authorised reviewer records a separate human conclusion."
  },
  {
    title: "Viva / Interview",
    description: "Shortlisted candidates complete the role-specific human stage."
  },
  {
    title: "Final Outcome",
    description: "An authorised Admin confirms the final hiring decision."
  },
  {
    title: "Next Step",
    description: "Offer, Talent Pool or Not Selected communication is issued."
  }
];

export function CareersRolePage({ role }: { role: HiringRole }) {
  const content = roleContent[role];

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.summary}
        actions={
          <>
            <CTAButton
              href="#application"
              icon={ArrowDown}
              showArrow={false}
            >
              Start Application
            </CTAButton>
            <CTAButton
              href="/careers/application-status"
              variant="secondary"
            >
              Check Application Status
            </CTAButton>
          </>
        }
        supportingCards={[
          {
            title: "Full-time employment.",
            description: content.location
          },
          {
            title: "Role-relevant assessment.",
            description: content.duration
          }
        ]}
        microcopy="Sensitive identity and education documents are requested only after shortlist."
      />

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.28}
        className="py-10 sm:py-12"
      >
        <section className="premium-container">
          <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <SectionHeader
              eyebrow="Role overview"
              title="What This Role Is For"
              description="A concise view of the role before you review the detailed responsibilities and application requirements."
            />
            <p className="text-base leading-8 text-wxIndigo500">
              {content.overview}
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_1.05fr_0.9fr]">
            <RoleList title="What you will do" items={content.responsibilities} />
            <RoleList title="What we look for" items={content.requirements} />
            <RoleList title="Preferred experience" items={content.preferred} />
          </div>
        </section>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.2}
        className="py-10 sm:py-12"
      >
        <section className="premium-container">
          <SectionHeader
            eyebrow="Fair hiring process"
            title="What Happens After Submission"
            description="Each stage has a clear purpose, a responsible owner, and a human decision point."
          />
          <ProcessSteps steps={process} animated={false} />

          <div className="mt-8 grid gap-5 rounded-md border border-wxBorder bg-white p-5 shadow-sm lg:grid-cols-[auto_1fr] lg:items-start sm:p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-wxViolet700/10 text-wxViolet700">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-wxIndigo900">
                Assessment transparency
              </h3>
              <p className="mt-3 text-sm leading-7 text-wxIndigo500">
                {content.assessment} Limited integrity checks provide context to
                reviewers, but no signal creates an automatic fraud conclusion or
                rejection.
              </p>
            </div>
          </div>
        </section>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.3}
        className="py-10 sm:py-12"
      >
        <section
          id="application"
          className="premium-container scroll-mt-24"
        >
          <div className="mx-auto max-w-5xl">
            <SectionHeader
              eyebrow="Application form"
              title="Apply Securely in Five Focused Steps"
              description="This is a full-time employment opportunity. Freelance, part-time, contract, and hourly engagements are not available for this role."
            />
            <HiringApplicationForm role={role} />
          </div>
        </section>
      </SpectrumBackground>
    </div>
  );
}

function RoleList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="h-full rounded-md border border-wxBorder bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold text-wxIndigo900">{title}</h3>
      <ul className="mt-5 grid gap-3 text-sm leading-7 text-wxIndigo500">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <CheckCircle2 className="mt-1.5 h-4 w-4 shrink-0 text-wxGreen500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
