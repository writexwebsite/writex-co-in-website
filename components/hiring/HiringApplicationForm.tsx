"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Send,
  ShieldCheck
} from "lucide-react";
import {
  hiringRoleLabel,
  type HiringRole
} from "@/lib/hiring/domain";
import {
  defaultHiringOptions,
  type HiringOption,
  type HiringOptionSetKey
} from "@/lib/hiring/application-options";
import {
  AdminManagedOptionSelect,
  MultiSelect,
  ProficiencySelect,
  RadioGroup,
  SearchableSelect,
  StructuredRangeSelect,
  TextAreaField,
  TextField
} from "@/components/hiring/ApplicationFormControls";
import { ConnectedCandidateDisclosureFields } from "@/components/hiring/ConnectedCandidateDisclosureFields";
import { VideoIntroductionField } from "@/components/hiring/VideoIntroductionField";
import type { SalesVideoPolicy } from "@/lib/hiring/video-policy";

const steps = [
  { title: "About You", description: "Contact and employment details" },
  { title: "Role Experience", description: "Structured role evidence" },
  { title: "Documents", description: "Private review files" },
  { title: "Disclosures & Consent", description: "Fair-review declarations" },
  { title: "Review & Submit", description: "Confirm before sending" }
] as const;

type OptionMap = Record<HiringOptionSetKey, HiringOption[]>;

const roleFieldNames: Record<HiringRole, string[]> = {
  academic_writer: [
    "subjectExpertise",
    "academicLevels",
    "writingExperience",
    "researchExperience",
    "editingExperience",
    "referencingStyles",
    "aiUsageSelection",
    "aiUsageDisclosure"
  ],
  sales_executive: [
    "totalExperience",
    "previousIndustry",
    "languages",
    "languageProficiency",
    "communicationComfort",
    "leadHandling",
    "targetHistory",
    "conversionExperience",
    "objectionHandling",
    "salaryStructure"
  ]
};

const stepRequiredNames: Record<number, string[]> = {
  0: [
    "fullName",
    "email",
    "mobile",
    "city",
    "state",
    "country",
    "qualification",
    "currentEmploymentStatus",
    "joiningAvailability",
    "fullTimeCommitment",
    "workMode"
  ],
  2: ["cv"],
  3: [
    "knowsApplicantOrEmployee",
    "consent",
    "assessmentMonitoringConsent",
    "declaration"
  ]
};

function activeLabels(options: OptionMap, key: HiringOptionSetKey) {
  return options[key].filter((option) => option.active).map((option) => option.label);
}

export function HiringApplicationForm({
  role,
  salesVideoPolicy
}: {
  role: HiringRole;
  salesVideoPolicy?: SalesVideoPolicy;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [review, setReview] = useState<Array<{ label: string; value: string }>>([]);
  const [fullTimeCommitment, setFullTimeCommitment] = useState("");
  const [options, setOptions] = useState<OptionMap>(defaultHiringOptions);
  const [submissionKey, setSubmissionKey] = useState("");
  const [salesExperienceType, setSalesExperienceType] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/hiring/application-options", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active && payload?.ok && payload.data) setOptions(payload.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const requiredByStep = useMemo<Record<number, string[]>>(
    () => ({
      ...stepRequiredNames,
      1: roleFieldNames[role].filter((name) =>
        name !== "aiUsageDisclosure" &&
        !(role === "sales_executive" && salesExperienceType === "Fresher" && ["previousIndustry","leadHandling","targetHistory","conversionExperience"].includes(name))
      ),
      2: role === "sales_executive" ? ["cv", "videoIntroduction"] : ["cv"]
      ,3: role === "sales_executive" ? [...stepRequiredNames[3], "videoIntroductionConsent"] : stepRequiredNames[3]
    }),
    [role, salesExperienceType]
  );

  function fieldValue(name: string) {
    const data = new FormData(formRef.current || undefined);
    return String(data.get(name) || "").trim();
  }

  function focusField(name: string) {
    const field = formRef.current?.querySelector<HTMLElement>(`[name="${name}"]`);
    const focusTarget =
      field instanceof HTMLInputElement && field.type === "hidden"
        ? field.parentElement?.querySelector<HTMLElement>(
            '[role="combobox"], summary, input:not([type="hidden"]), textarea'
          )
        : field;
    focusTarget?.focus();
    focusTarget?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function validateStep(stepIndex: number) {
    setMessage("");
    const required = requiredByStep[stepIndex] || [];
    for (const name of required) {
      const field = formRef.current?.elements.namedItem(name);
      if (field instanceof RadioNodeList) {
        if (!field.value) {
          setMessage("Complete the highlighted required fields before continuing.");
          focusField(name);
          return false;
        }
        continue;
      }
      if (field instanceof HTMLInputElement && field.type === "file") {
        if (!field.files?.length) {
          setMessage("Upload the required file before continuing.");
          focusField(name);
          return false;
        }
        continue;
      }
      if (!fieldValue(name)) {
        setMessage("Complete the highlighted required fields before continuing.");
        focusField(name);
        return false;
      }
    }

    if (stepIndex === 3 && fieldValue("knowsApplicantOrEmployee") === "yes") {
      for (const name of [
        "relationshipName",
        "relationshipType",
        "relationshipRole",
        "relationshipDetails"
      ]) {
        if (!fieldValue(name)) {
          setMessage("Complete every relationship disclosure field before continuing.");
          focusField(name);
          return false;
        }
      }
    }
    const otherPairs =
      stepIndex === 0
        ? [
            ["country", "otherCountry"],
            ["qualification", "otherQualification"],
            ["currentEmploymentStatus", "otherEmploymentStatus"],
            ["referralSource", "otherReferralSource"]
          ]
        : stepIndex === 1
          ? [
              ["subjectExpertise", "otherSubject"],
              ["referencingStyles", "otherReferencingStyle"],
              ["previousIndustry", "otherIndustry"],
              ["languages", "otherLanguage"]
            ]
          : [];
    for (const [choiceName, otherName] of otherPairs) {
      if (
        fieldValue(choiceName)
          .split("|")
          .some((value) => value.trim() === "Other") &&
        !fieldValue(otherName)
      ) {
        setMessage("Please complete the Other details before continuing.");
        focusField(otherName);
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) {
      setState("error");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setState("idle");
    const next = Math.min(step + 1, steps.length - 1);
    if (next === steps.length - 1) setReview(buildReview());
    setStep(next);
    formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function previousStep() {
    setState("idle");
    setMessage("");
    setStep((current) => Math.max(0, current - 1));
    formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function buildReview() {
    const data = new FormData(formRef.current || undefined);
    const labels: Array<[string, string]> = [
      ["Role", hiringRoleLabel(role)],
      ["Name", String(data.get("fullName") || "")],
      ["Email", String(data.get("email") || "")],
      ["City", String(data.get("city") || "")],
      ["Qualification", String(data.get("qualification") || "")],
      ["Employment", "Full-time only"],
      ["Joining", String(data.get("joiningAvailability") || "")],
      ["Work mode", String(data.get("workMode") || "")],
      [
        role === "academic_writer" ? "Subject expertise" : "Previous industry",
        String(
          data.get(role === "academic_writer" ? "subjectExpertise" : "previousIndustry") ||
            ""
        )
      ]
    ];
    return labels
      .filter(([, value]) => value)
      .map(([label, value]) => ({ label, value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (let index = 0; index < steps.length - 1; index += 1) {
      if (!validateStep(index)) {
        setStep(index);
        setState("error");
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
    }
    setState("submitting");
    setMessage("");
    const form = event.currentTarget;
    const raw = new FormData(form);
    const roleDetails = Object.fromEntries(
      roleFieldNames[role].map((name) => [name, String(raw.get(name) || "")])
    );
    Object.assign(roleDetails, {
      fullTimeCommitment: String(raw.get("fullTimeCommitment") || ""),
      currentEmploymentStatus: String(raw.get("currentEmploymentStatus") || ""),
      joiningAvailability: String(raw.get("joiningAvailability") || ""),
      referralSource: String(raw.get("referralSource") || ""),
      state: String(raw.get("state") || ""),
      country: String(raw.get("country") || "India"),
      salaryExpectation: String(raw.get("salaryExpectation") || ""),
      otherQualification: String(raw.get("otherQualification") || ""),
      otherCountry: String(raw.get("otherCountry") || ""),
      otherEmploymentStatus: String(raw.get("otherEmploymentStatus") || ""),
      otherReferralSource: String(raw.get("otherReferralSource") || ""),
      otherSubject: String(raw.get("otherSubject") || ""),
      otherReferencingStyle: String(raw.get("otherReferencingStyle") || ""),
      otherIndustry: String(raw.get("otherIndustry") || ""),
      otherLanguage: String(raw.get("otherLanguage") || "")
    });
    const relationship = {
      knowsApplicantOrEmployee: raw.get("knowsApplicantOrEmployee") === "yes",
      name: String(raw.get("relationshipName") || "") || undefined,
      relationship: String(raw.get("relationshipType") || "") || undefined,
      role: String(raw.get("relationshipRole") || "") || undefined,
      disclosureDetails: String(raw.get("relationshipDetails") || "") || undefined
    };
    raw.set(
      "payload",
      JSON.stringify({
        role,
        fullName: raw.get("fullName"),
        email: raw.get("email"),
        mobile: raw.get("mobile"),
        city: raw.get("city"),
        qualification: raw.get("qualification"),
        experience:
          raw.get(role === "academic_writer" ? "writingExperience" : "totalExperience"),
        availability: "Full-time only",
        compensation: raw.get("salaryExpectation") || "Discuss during review",
        noticePeriod: raw.get("joiningAvailability"),
        workMode: raw.get("workMode"),
        roleDetails,
        aiUsageDisclosure:
          role === "academic_writer"
            ? [raw.get("aiUsageSelection"), raw.get("aiUsageDisclosure")]
                .filter(Boolean)
                .join(": ")
            : undefined,
        relationship,
        consent: raw.get("consent") === "on",
        assessmentMonitoringConsent:
          raw.get("assessmentMonitoringConsent") === "on",
        declaration: raw.get("declaration") === "on",
        videoIntroductionConsent: raw.get("videoIntroductionConsent") === "on",
        website: raw.get("website")
      })
    );

    try {
      const idempotencyKey = submissionKey || crypto.randomUUID();
      if (!submissionKey) setSubmissionKey(idempotencyKey);
      const response = await fetch("/api/hiring/applications", {
        method: "POST",
        body: raw,
        headers: { "idempotency-key": idempotencyKey }
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload?.error?.message || "The application could not be submitted."
        );
      }
      setReference(payload.data.applicationReference);
      setState("success");
      form.reset();
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The application could not be submitted."
      );
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  if (state === "success") {
    return (
      <section
        className="rounded-md border border-emerald-200 bg-wxSurface p-6 shadow-sm"
        aria-live="polite"
      >
        <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden />
        <h2 className="mt-4 text-2xl font-semibold text-wxIndigo900">
          Application received
        </h2>
        <p className="mt-2 text-sm text-wxIndigo500">
          Keep this reference for status checks. WriteX will review your application
          before any assessment or verification request.
        </p>
        <p className="mt-4 rounded-md bg-wxSurfaceSoft px-4 py-3 font-mono font-semibold text-wxIndigo900">
          {reference}
        </p>
        <Link
          href="/careers/application-status"
          className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-wxViolet700 hover:underline"
        >
          Check application status <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="grid gap-6"
      encType="multipart/form-data"
    >
      <input
        name="website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />
      <ApplicationProgress currentStep={step} />

      <div
        ref={errorRef}
        tabIndex={-1}
        aria-live="assertive"
        className="outline-none"
      >
        {state === "error" && message ? (
          <div
            role="alert"
            className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            {message}
          </div>
        ) : null}
      </div>

      <div hidden={step !== 0}>
        <FormSection
          title="About you"
          description="Share only the details needed for an initial eligibility review."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="fullName" label="Full name" required />
            <TextField name="email" label="Email" type="email" required />
            <TextField name="mobile" label="Mobile number" type="tel" required />
            <TextField name="city" label="City" required />
            <TextField name="state" label="State" required />
            <SearchableSelect
              name="country"
              label="Country"
              options={["India", "Other"]}
              defaultValue="India"
              otherFieldName="otherCountry"
              required
            />
            <AdminManagedOptionSelect
              name="qualification"
              label="Highest qualification"
              options={activeLabels(options, "qualification")}
              otherFieldName="otherQualification"
              required
            />
            <SearchableSelect
              name="currentEmploymentStatus"
              label="Current employment status"
              options={activeLabels(options, "employment_status")}
              otherFieldName="otherEmploymentStatus"
              required
            />
            <SearchableSelect
              name="joiningAvailability"
              label="Availability to join"
              options={activeLabels(options, "joining_availability")}
              required
            />
            <SearchableSelect
              name="workMode"
              label="Approved work arrangement"
              options={activeLabels(options, "work_mode")}
              required
              helperText="Only currently approved WriteX arrangements are shown."
            />
          </div>
          <div className="mt-5 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
            <p className="text-sm font-semibold uppercase text-softTeal">
              Employment type
            </p>
            <p className="mt-1 font-semibold text-wxIndigo900">Full-time only</p>
            <p className="mt-1 text-sm text-wxIndigo500">
              Freelance, part-time, contract and hourly engagements are not available
              for this role.
            </p>
          </div>
          <div className="mt-5">
            <RadioGroup
              name="fullTimeCommitment"
              label="Can you commit to full-time employment with WriteX?"
              options={["Yes", "No"]}
              required
              onValueChange={setFullTimeCommitment}
            />
            {fullTimeCommitment === "No" ? (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                This role is currently available only as full-time employment. Your
                answer will be sent for eligibility review and will not cause a silent
                automatic rejection.
              </p>
            ) : null}
          </div>
          <div className="mt-5">
            <SearchableSelect
              name="referralSource"
              label="How did you hear about WriteX?"
              options={activeLabels(options, "referral_source")}
              otherFieldName="otherReferralSource"
            />
          </div>
        </FormSection>
      </div>

      <div hidden={step !== 1}>
        <FormSection
          title={role === "academic_writer" ? "Academic experience" : "Sales experience"}
          description="Structured answers support consistent human review. They are not treated as verified facts until reviewed."
        >
          {role === "academic_writer" ? (
            <WriterExperience options={options} />
          ) : (
            <SalesExperience options={options} experienceType={salesExperienceType} onExperienceChange={setSalesExperienceType} />
          )}
        </FormSection>
      </div>

      <div hidden={step !== 2}>
        <FormSection
          title="Documents"
          description="Initial applications require only role-review files. Identity and education documents are requested only after shortlist through the Verification Centre."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FileField name="cv" label="CV" required />
            {role === "academic_writer" ? (
              <FileField
                name="writingSample"
                label="Writing sample"
                helperText="Optional at this stage. Do not upload confidential client work."
              />
            ) : (
              {salesVideoPolicy ? <VideoIntroductionField policy={salesVideoPolicy} /> : null}
            )}
          </div>
        </FormSection>
      </div>

      <div hidden={step !== 3}>
        <FormSection
          title="Disclosures and consent"
          description="Plain-language consent and relationship disclosure support a fair, reviewable process."
        >
          <ConnectedCandidateDisclosureFields
            relationshipOptions={activeLabels(options, "relationship_type")}
          />
          <div className="mt-6 border-t border-wxBorder pt-6">
            <ConsentCheckbox
              name="consent"
              label="I consent to WriteX processing this application and the submitted files for hiring review."
            />
            <ConsentCheckbox
              name="assessmentMonitoringConsent"
              label="I understand that a role assessment may record proportionate security and integrity events for human review."
            />
            <ConsentCheckbox
              name="declaration"
              label="I confirm that the information and submitted work are accurate and my own."
            />
            {role === "sales_executive" ? <ConsentCheckbox
              name="videoIntroductionConsent"
              label="I consent to my private video introduction being stored and reviewed by authorised hiring staff for this application."
            /> : null}
            <details className="mt-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 text-sm text-wxIndigo600">
              <summary className="cursor-pointer font-semibold text-wxIndigo900">
                How we use your information
              </summary>
              <div className="mt-3 grid gap-2 leading-6">
                <p>
                  WriteX uses application data, private files, assessment events and
                  later verification evidence only for hiring review, security, audit
                  and documented legal obligations.
                </p>
                <p>
                  Access is role-restricted. Retention depends on application outcome,
                  talent-pool consent, deletion requests and documented legal holds.
                  Verification documents are requested only after shortlist.
                </p>
                <p>
                  Read the{" "}
                  <Link
                    href="/privacy"
                    className="font-semibold text-wxViolet700 underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </details>
          </div>
        </FormSection>
      </div>

      <div hidden={step !== 4}>
        <FormSection
          title="Review your application"
          description="Confirm these details before securely submitting. Use Back to correct anything."
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            {review.map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-3"
              >
                <dt className="text-xs font-semibold uppercase text-wxIndigo400">
                  {item.label}
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold text-wxIndigo900">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 rounded-md border border-wxBorder p-4 text-sm text-wxIndigo600">
            <p className="font-semibold text-wxIndigo900">Files and declarations</p>
            <p className="mt-1">
              Your selected files remain private. Aadhaar, PAN, degree certificates and
              marksheets are not requested in this initial application.
            </p>
          </div>
        </FormSection>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={previousStep}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-wxViolet700/30 bg-wxSurface px-5 py-3 text-sm font-semibold text-wxIndigo900 transition hover:border-wxViolet700 hover:bg-wxSurfaceSoft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 sm:text-base"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <span />
        )}
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            className="wx-gradient-action inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white transition hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 sm:text-base"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            disabled={state === "submitting"}
            className="wx-gradient-action inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white transition hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 disabled:opacity-60 sm:text-base"
          >
            <Send className="h-5 w-5" aria-hidden />
            {state === "submitting" ? "Submitting securely..." : "Submit Application"}
          </button>
        )}
      </div>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-wxIndigo500">
        <ShieldCheck className="h-4 w-4" />
        Private files are never published or sent as email attachments.
      </p>
    </form>
  );
}

function WriterExperience({ options }: { options: OptionMap }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <MultiSelect
        name="subjectExpertise"
        label="Subject expertise"
        options={activeLabels(options, "writer_subject")}
        otherFieldName="otherSubject"
        required
      />
      <MultiSelect
        name="academicLevels"
        label="Academic levels handled"
        options={activeLabels(options, "academic_level")}
        required
      />
      <StructuredRangeSelect
        name="writingExperience"
        label="Writing experience"
        options={activeLabels(options, "writing_experience")}
        required
      />
      <SearchableSelect
        name="researchExperience"
        label="Research experience"
        options={activeLabels(options, "research_experience")}
        required
      />
      <SearchableSelect
        name="editingExperience"
        label="Editing and proofreading experience"
        options={activeLabels(options, "editing_experience")}
        required
      />
      <MultiSelect
        name="referencingStyles"
        label="Referencing styles"
        options={activeLabels(options, "referencing_style")}
        otherFieldName="otherReferencingStyle"
        required
      />
      <SearchableSelect
        name="aiUsageSelection"
        label="AI usage disclosure"
        options={activeLabels(options, "ai_usage")}
        required
      />
      <TextField
        name="salaryExpectation"
        label="Expected monthly compensation (INR)"
        type="number"
        helperText="This is an expectation, not a compensation promise."
      />
      <div className="sm:col-span-2">
        <TextAreaField
          name="aiUsageDisclosure"
          label="AI usage explanation"
          helperText="Optional unless you selected Other or want to explain permitted support tools."
          rows={4}
        />
      </div>
    </div>
  );
}

function SalesExperience({ options, experienceType, onExperienceChange }: { options: OptionMap; experienceType: string; onExperienceChange: (value: string) => void }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <StructuredRangeSelect
        name="totalExperience"
        label="Total experience"
        options={["Fresher", ...activeLabels(options, "writing_experience").slice(1)]}
        required
        onValueChange={onExperienceChange}
      />
      {experienceType !== "Fresher" ? <MultiSelect
        name="previousIndustry"
        label="Previous industry"
        options={activeLabels(options, "sales_industry")}
        otherFieldName="otherIndustry"
        required
      /> : <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><strong>Fresher path selected.</strong><br/>Previous industry, past targets, conversion history and prior lead-handling evidence are not required.</div>}
      <MultiSelect
        name="languages"
        label="Languages"
        options={activeLabels(options, "language")}
        otherFieldName="otherLanguage"
        required
      />
      <ProficiencySelect />
      <MultiSelect
        name="communicationComfort"
        label="Communication comfort"
        options={activeLabels(options, "communication_channel")}
        required
      />
      {experienceType !== "Fresher" ? <MultiSelect
        name="leadHandling"
        label="Lead-handling experience"
        options={activeLabels(options, "lead_experience")}
        required
      /> : null}
      {experienceType !== "Fresher" ? <SearchableSelect
        name="targetHistory"
        label="Monthly target experience"
        options={activeLabels(options, "target_experience")}
        required
        helperText="This will be reviewed later and is not treated as verified fact."
      /> : null}
      {experienceType !== "Fresher" ? <SearchableSelect
        name="conversionExperience"
        label="Conversion experience"
        options={activeLabels(options, "conversion_experience")}
        required
      /> : null}
      <MultiSelect
        name="objectionHandling"
        label="Objection-handling experience"
        options={activeLabels(options, "objection_experience")}
        required
      />
      <SearchableSelect
        name="salaryStructure"
        label="Preferred salary structure"
        options={activeLabels(options, "salary_structure")}
        required
      />
      <TextField
        name="salaryExpectation"
        label="Expected monthly salary (INR)"
        type="number"
        helperText="This is an expectation, not a compensation promise."
      />
    </div>
  );
}

function ApplicationProgress({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Application progress">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {steps.map((item, index) => {
          const completed = index < currentStep;
          const current = index === currentStep;
          return (
            <li
              key={item.title}
              aria-current={current ? "step" : undefined}
              data-state={current ? "selected" : "default"}
              className={`rounded-md border p-3 ${
                current
                  ? "wx-interactive-state"
                  : completed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "wx-interactive-state text-wxIndigo500"
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-semibold">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current">
                  {completed ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {item.title}
              </span>
              <span className="mt-1 block text-[11px] opacity-75">
                {item.description}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function FormSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-wxBorder bg-wxSurface p-5 shadow-sm md:p-6">
      <h2 className="text-xl font-semibold text-wxIndigo900">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-wxIndigo500">
        {description}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FileField({
  name,
  label,
  required = false,
  accept = ".pdf,.docx",
  helperText
}: {
  name: string;
  label: string;
  required?: boolean;
  accept?: string;
  helperText?: string;
}) {
  return (
    <label className="rounded-md border border-dashed border-wxBorder bg-wxSurfaceSoft p-4 text-sm font-semibold text-wxIndigo900">
      <span className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-wxViolet700" />
        {label}{" "}
        {required ? (
          <span className="text-red-600">*</span>
        ) : (
          <span className="font-normal text-wxIndigo400">(optional)</span>
        )}
      </span>
      <input
        required={required}
        name={name}
        type="file"
        accept={accept}
        className="mt-3 block w-full text-xs font-normal file:mr-3 file:rounded-md file:border-0 file:bg-wxSurface file:px-3 file:py-2 file:font-semibold file:text-wxViolet700"
      />
      {helperText ? (
        <span className="mt-2 block text-xs font-normal leading-5 text-wxIndigo500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function ConsentCheckbox({ name, label }: { name: string; label: string }) {
  return (
    <label className="mt-3 flex min-h-11 items-start gap-3 text-sm leading-6 text-wxIndigo700 first:mt-0">
      <input
        required
        name={name}
        type="checkbox"
        className="mt-1 h-4 w-4 accent-wxViolet700"
      />
      <span>{label}</span>
    </label>
  );
}
