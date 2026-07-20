"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  LoaderCircle,
  RotateCcw
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useForm,
  useWatch,
  type Resolver,
  type FieldErrors
} from "react-hook-form";
import { z } from "zod";
import { buildQuoteLeadIntelligence } from "@/lib/lead-intelligence";
import { submitQuoteLead } from "@/lib/quote-lead";
import {
  academicIntegrityDisclaimer,
  getWhatsAppUrl
} from "@/lib/site";
import { motionDurations, motionEase } from "@/lib/motion";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { getTodayInputValue, quoteLeadSubmissionSchema } from "@/lib/validation";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

const serviceOptions = [
  "Coursework & Brief Support",
  "Dissertation & Thesis Support",
  "SOP & Admissions Support",
  "Academic Editing & Proofreading",
  "Originality & AI Review",
  "Formatting & Referencing Support",
  "Not sure yet"
];

const academicLevels = [
  "Foundation / Diploma",
  "Undergraduate",
  "Postgraduate",
  "MBA",
  "Doctoral / PhD",
  "Admissions",
  "Other"
];

const countryOptions = [
  { label: "United Kingdom (UK)", value: "UK" },
  { label: "Australia", value: "Australia" },
  { label: "Canada", value: "Canada" },
  { label: "United Arab Emirates (UAE)", value: "UAE" },
  { label: "India", value: "India" },
  { label: "United States", value: "United States" },
  { label: "New Zealand", value: "New Zealand" },
  { label: "Ireland", value: "Ireland" },
  { label: "Singapore", value: "Singapore" },
  { label: "Malaysia", value: "Malaysia" },
  { label: "Germany", value: "Germany" },
  { label: "Other / Not listed", value: "Other / Not listed" }
];

const urgencyOptions = [
  "Less than 24 hours",
  "24-48 hours",
  "3-5 days",
  "6-10 days",
  "More than 10 days"
];

const quoteSchema = quoteLeadSubmissionSchema.extend({
  consent: z.boolean().refine((value) => value, {
    message: "Consent is required before sending a quote request."
  })
});

type QuoteFormValues = {
  service: string;
  level: string;
  subject: string;
  country: string;
  wordCount: string;
  deadline: string;
  documentCondition: string;
  referencingStyle: string;
  urgency: string;
  instructions: string;
  rubricAvailable: string;
  draftAvailable: string;
  supervisorCommentsAvailable: string;
  name: string;
  email: string;
  whatsapp: string;
  consent: boolean;
};
type QuoteFieldName = keyof QuoteFormValues;

function getAttributionPayload() {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const deviceType = window.matchMedia("(max-width: 767px)").matches
    ? "mobile"
    : window.matchMedia("(max-width: 1023px)").matches
      ? "tablet"
      : "desktop";

  return {
    pagePath: window.location.pathname,
    landingPage:
      window.sessionStorage.getItem("writex_landing_page") ||
      window.location.pathname,
    referrer: document.referrer || undefined,
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
    utmTerm: params.get("utm_term") || undefined,
    utmContent: params.get("utm_content") || undefined,
    deviceType
  };
}

const defaultValues: QuoteFormValues = {
  service: "",
  level: "",
  subject: "",
  country: "",
  wordCount: "",
  deadline: "",
  documentCondition: "",
  referencingStyle: "",
  urgency: "",
  instructions: "",
  rubricAvailable: "",
  draftAvailable: "",
  supervisorCommentsAvailable: "",
  name: "",
  email: "",
  whatsapp: "",
  consent: false
};

const formSteps: Array<{
  name: string;
  eyebrow: string;
  fields: QuoteFieldName[];
  requiredFields: QuoteFieldName[];
}> = [
  {
    name: "What do you need?",
    eyebrow: "Step 1",
    fields: ["service", "level", "subject", "country"],
    requiredFields: ["service"]
  },
  {
    name: "Scope and deadline",
    eyebrow: "Step 2",
    fields: ["wordCount", "deadline", "urgency"],
    requiredFields: ["deadline"]
  },
  {
    name: "Contact and brief",
    eyebrow: "Step 3",
    fields: ["name", "email", "whatsapp", "instructions", "consent"],
    requiredFields: ["name", "whatsapp", "instructions", "consent"]
  }
];

const requiredFieldNames = formSteps.flatMap((step) => step.requiredFields);

const inputClass =
  "mt-2 w-full rounded-md border border-sageBorder bg-white px-4 py-3 text-sm text-charcoalInk outline-none transition placeholder:text-slateText/60 focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20 disabled:cursor-not-allowed disabled:bg-paleSage";

const quoteFallbackMessage =
  "We could not submit the form right now. Please send your details on WhatsApp for the fastest response.";

type QuoteFormProps = {
  prefillService?: string;
};

function normalizeServicePrefill(service?: string) {
  if (!service) return "";

  const serviceMap: Record<string, string> = {
    "Urgent Deadline Review": "Not sure yet"
  };
  const normalizedService = serviceMap[service] ?? service;

  return serviceOptions.includes(normalizedService) ? normalizedService : "";
}

function isFieldComplete(
  fieldName: QuoteFieldName,
  values: Partial<QuoteFormValues>
) {
  if (fieldName === "consent") {
    return values.consent === true;
  }

  if (fieldName === "wordCount") {
    return Number(values.wordCount) > 0;
  }

  if (fieldName === "instructions") {
    return (values.instructions?.trim().length ?? 0) >= 10;
  }

  const value = values[fieldName];

  return typeof value === "string" && value.trim().length > 0;
}

type FileReference = {
  name: string;
  size?: number;
  type?: string;
  assetId?: string;
  status: "selected" | "uploading" | "uploaded" | "failed";
  progress: number;
  error?: string;
};

type UploadedBriefResponse = {
  success: true;
  fileAssetId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  assetType: string;
};

function uploadBriefFile(
  file: File,
  onProgress: (progress: number) => void
) {
  return new Promise<UploadedBriefResponse>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", "quote_brief");
    formData.append("uploadedBy", "client");

    const request = new XMLHttpRequest();
    request.open("POST", "/api/upload-brief");

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.max(5, Math.round((event.loaded / event.total) * 95)));
    };

    request.onload = () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(request.responseText || "{}");
      } catch {
        reject(new Error("Upload response could not be read."));
        return;
      }

      if (
        request.status >= 200 &&
        request.status < 300 &&
        typeof parsed === "object" &&
        parsed !== null &&
        "success" in parsed &&
        (parsed as { success?: boolean }).success === true &&
        "fileAssetId" in parsed
      ) {
        resolve(parsed as UploadedBriefResponse);
        return;
      }

      const message =
        typeof parsed === "object" &&
        parsed !== null &&
        "error" in parsed &&
        typeof (parsed as { error?: { message?: unknown } }).error?.message ===
          "string"
          ? String((parsed as { error: { message: string } }).error.message)
          : "File upload failed. You can still submit the quote and send the file on WhatsApp.";
      reject(new Error(message));
    };

    request.onerror = () => {
      reject(
        new Error(
          "File upload failed. You can still submit the quote and send the file on WhatsApp."
        )
      );
    };

    request.send(formData);
  });
}

function buildQuoteWhatsAppMessage(values: QuoteFormValues, fileName: string) {
  return [
    "Hi WriteX, I need academic support. I want to share my brief for a quote.",
    `Name: ${values.name}`,
    values.email ? `Email: ${values.email}` : "",
    `WhatsApp: ${values.whatsapp}`,
    values.country ? `Country: ${values.country}` : "",
    values.level ? `Academic level: ${values.level}` : "",
    `Service required: ${values.service}`,
    values.subject ? `Subject: ${values.subject}` : "",
    values.wordCount ? `Word count: ${values.wordCount}` : "",
    `Deadline: ${values.deadline}`,
    values.documentCondition
      ? `Document condition: ${values.documentCondition}`
      : "",
    values.referencingStyle
      ? `Referencing style: ${values.referencingStyle}`
      : "",
    values.urgency ? `Urgency: ${values.urgency}` : "",
    fileName ? `File selected for reference: ${fileName}` : "",
    values.rubricAvailable
      ? `Rubric available: ${values.rubricAvailable}`
      : "",
    values.draftAvailable
      ? `Draft available: ${values.draftAvailable}`
      : "",
    values.supervisorCommentsAvailable
      ? `Supervisor comments available: ${values.supervisorCommentsAvailable}`
      : "",
    `Instructions: ${values.instructions}`,
    "",
    "I will send the brief and files directly on WhatsApp for review."
  ]
    .filter(Boolean)
    .join("\n");
}

export function QuoteForm({ prefillService }: QuoteFormProps = {}) {
  const shouldReduceMotion = useReducedMotion();
  const startedRef = useRef(false);
  const submissionKeyRef = useRef("");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [fileReference, setFileReference] = useState<FileReference | null>(null);
  const [success, setSuccess] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState("");
  const [leadId, setLeadId] = useState("");
  const [whatsappClicked, setWhatsappClicked] = useState(false);
  const [preparedWhatsAppUrl, setPreparedWhatsAppUrl] = useState(
    getWhatsAppUrl()
  );
  const minDeadline = useMemo(() => getTodayInputValue(), []);
  const activeStep = formSteps[activeStepIndex];

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    trigger,
    formState: { errors, isSubmitting }
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema) as Resolver<QuoteFormValues>,
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldUnregister: false
  });

  useEffect(() => {
    const normalizedService = normalizeServicePrefill(prefillService);
    if (!normalizedService) return;

    setValue("service", normalizedService, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
  }, [prefillService, setValue]);

  useEffect(() => {
    function handleQuoteEvent(event: Event) {
      const detail = (event as CustomEvent<{ event?: string }>).detail;

      if (
        detail?.event === quoteTrackingEvents.whatsappQuoteClicked ||
        detail?.event === quoteTrackingEvents.heroWhatsappClicked
      ) {
        setWhatsappClicked(true);
      }
    }

    window.addEventListener("writex:quote-event", handleQuoteEvent);

    return () => {
      window.removeEventListener("writex:quote-event", handleQuoteEvent);
    };
  }, []);

  const watchedValues = useWatch({ control });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.sessionStorage.getItem("writex_landing_page")) {
      window.sessionStorage.setItem("writex_landing_page", window.location.pathname);
    }
  }, []);
  const progress = useMemo(() => {
    const completedCount = requiredFieldNames.filter((fieldName) =>
      isFieldComplete(fieldName, watchedValues)
    ).length;

    return Math.round((completedCount / requiredFieldNames.length) * 100);
  }, [watchedValues]);

  const leadIntelligence = useMemo(
    () =>
      buildQuoteLeadIntelligence({
        service: watchedValues.service || "",
        level: watchedValues.level || "",
        subject: watchedValues.subject || "",
        country: watchedValues.country || "",
        urgency: watchedValues.urgency || "",
        wordCount: watchedValues.wordCount || "",
        instructions: watchedValues.instructions || "",
        fileUploaded: fileReference?.status === "uploaded",
        draftAvailable: watchedValues.draftAvailable || "",
        rubricAvailable: watchedValues.rubricAvailable || "",
        supervisorCommentsAvailable:
          watchedValues.supervisorCommentsAvailable || "",
        whatsappClicked,
        formCompleted: false
      }),
    [watchedValues, whatsappClicked, fileReference?.status]
  );

  function markStarted() {
    if (startedRef.current) return;
    startedRef.current = true;
    trackQuoteEvent(quoteTrackingEvents.quoteFormStarted, {
      source: "pricing_quote_form"
    });
  }

  function errorProps(fieldName: QuoteFieldName, fieldId: string) {
    const hasError = Boolean(errors[fieldName]);

    return {
      "aria-invalid": hasError,
      "aria-describedby": hasError ? `${fieldId}-error` : undefined
    };
  }

  async function handleNext() {
    markStarted();
    const isStepValid = await trigger(activeStep.requiredFields, {
      shouldFocus: true
    });

    if (!isStepValid) return;

    trackQuoteEvent(quoteTrackingEvents.quoteStepCompleted, {
      step: activeStep.name,
      step_number: activeStepIndex + 1,
      progress
    });
    setActiveStepIndex((index) => Math.min(index + 1, formSteps.length - 1));
  }

  function handleBack() {
    setActiveStepIndex((index) => Math.max(index - 1, 0));
  }

  function handleInvalidSubmit(formErrors: FieldErrors<QuoteFormValues>) {
    const firstInvalidStepIndex = formSteps.findIndex((step) =>
      step.fields.some((fieldName) => Boolean(formErrors[fieldName]))
    );

    if (firstInvalidStepIndex >= 0) {
      setActiveStepIndex(firstInvalidStepIndex);
    }
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (activeStepIndex < formSteps.length - 1) {
      event.preventDefault();
      await handleNext();
      return;
    }

    await handleSubmit(onSubmit, handleInvalidSubmit)(event);
  }

  async function onSubmit(values: QuoteFormValues) {
    setFallbackNotice("");

    const whatsappMessage = buildQuoteWhatsAppMessage(
      values,
      fileReference?.name || ""
    );
    const whatsappUrl = getWhatsAppUrl(whatsappMessage);
    setPreparedWhatsAppUrl(whatsappUrl);

    try {
      if (!submissionKeyRef.current) {
        submissionKeyRef.current = crypto.randomUUID();
      }

      const submittedLeadIntelligence = buildQuoteLeadIntelligence({
        service: values.service,
        level: values.level,
        subject: values.subject,
        country: values.country,
        urgency: values.urgency,
        wordCount: values.wordCount,
        instructions: values.instructions,
        fileUploaded: fileReference?.status === "uploaded",
        draftAvailable: values.draftAvailable,
        rubricAvailable: values.rubricAvailable,
        supervisorCommentsAvailable: values.supervisorCommentsAvailable,
        whatsappClicked,
        formCompleted: true
      });

      const result = await submitQuoteLead({
        ...values,
        idempotencyKey: submissionKeyRef.current,
        fileName: fileReference?.name,
        fileSize: fileReference?.size,
        fileType: fileReference?.type,
        uploadedFileAssetId:
          fileReference?.status === "uploaded" ? fileReference.assetId : undefined,
        leadIntelligence: submittedLeadIntelligence,
        ...getAttributionPayload()
      });

      setLeadId(result.leadId);
      trackQuoteEvent(quoteTrackingEvents.quoteFormSubmitted, {
        service: values.service,
        academic_level: values.level,
        urgency: values.urgency,
        has_file: fileReference?.status === "uploaded",
        lead_score: submittedLeadIntelligence.lead_score,
        saved: true
      });
      setSuccess(true);
    } catch {
      trackQuoteEvent(quoteTrackingEvents.quoteFormFailed, {
        service: values.service,
        academic_level: values.level,
        urgency: values.urgency,
        has_file: fileReference?.status === "uploaded",
        saved: false,
        fallback: "whatsapp"
      });
      setFallbackNotice(quoteFallbackMessage);
    }
  }

  if (success) {
    return (
      <div className="rounded-md border border-softTeal/30 bg-white p-8 shadow-soft">
        <motion.span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-softTeal/10 text-academicGreen"
          initial={shouldReduceMotion ? false : { scale: 0.94, opacity: 0.86 }}
          animate={shouldReduceMotion ? undefined : { scale: 1, opacity: 1 }}
          transition={{ duration: motionDurations.normal, ease: motionEase }}
        >
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </motion.span>
        <h2 className="mt-5 text-2xl font-semibold text-charcoalInk">
          Your quote request has been received.
        </h2>
        <p className="mt-3 text-sm leading-7 text-slateText">
          WriteX will review the scope and respond with the next step. For
          urgent deadlines, send the same brief and files on WhatsApp.
        </p>
        <p className="mt-4 rounded-md bg-paleSage px-4 py-3 text-xs font-semibold text-slateText">
          Prepared reference: {leadId}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={preparedWhatsAppUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              trackQuoteEvent(quoteTrackingEvents.whatsappQuoteClicked, {
                source: "quote_success_state"
              })
            }
            className="wx-gradient-action inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Send Same Brief on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => {
              reset(defaultValues);
              setFileReference(null);
              setSuccess(false);
              setFallbackNotice("");
              setLeadId("");
              setActiveStepIndex(0);
              setWhatsappClicked(false);
              submissionKeyRef.current = "";
              startedRef.current = false;
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-sageBorder bg-white px-5 text-sm font-semibold text-charcoalInk transition hover:border-mutedCopper"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Start New Quote
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      id="quote"
      className="rounded-md border border-sageBorder bg-white p-5 shadow-soft sm:p-8"
      noValidate
      onFocusCapture={markStarted}
      onSubmit={handleFormSubmit}
    >
      <div aria-hidden="true" className="hidden">
        {Object.entries(leadIntelligence).map(([name, value]) => (
          <input
            key={name}
            type="hidden"
            name={name}
            value={String(value)}
            readOnly
          />
        ))}
      </div>

      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-softTeal">
              Quote request intake
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-charcoalInk">
              Start your quote request
            </h2>
            <p className="mt-2 text-sm leading-6 text-slateText">
              A complete brief helps WriteX quote faster…1035 tokens truncated…iveStepIndex}
          initial={shouldReduceMotion ? false : { opacity: 0.94, x: 10 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0.94, x: -8 }}
          transition={{ duration: motionDurations.normal, ease: motionEase }}
        >
      {activeStepIndex === 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Service required"
            fieldId="quote-service"
            error={errors.service?.message}
            required
          >
            <select
              id="quote-service"
              className={inputClass}
              autoComplete="off"
              required
              disabled={isSubmitting}
              {...errorProps("service", "quote-service")}
              {...register("service")}
            >
              <option value="">Select service</option>
              {serviceOptions.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Academic level"
            fieldId="quote-level"
            error={errors.level?.message}
          >
            <select
              id="quote-level"
              className={inputClass}
              autoComplete="off"
              disabled={isSubmitting}
              {...errorProps("level", "quote-level")}
              {...register("level")}
            >
              <option value="">Select academic level</option>
              {academicLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Subject"
            fieldId="quote-subject"
            error={errors.subject?.message}
          >
            <input
              id="quote-subject"
              className={inputClass}
              placeholder="Management, law, nursing, data analytics..."
              autoComplete="off"
              disabled={isSubmitting}
              {...errorProps("subject", "quote-subject")}
              {...register("subject")}
            />
          </Field>
          <Field
            label="Country"
            fieldId="quote-country"
            error={errors.country?.message}
          >
            <select
              id="quote-country"
              className={inputClass}
              autoComplete="country-name"
              disabled={isSubmitting}
              {...errorProps("country", "quote-country")}
              {...register("country")}
            >
              <option value="">Select country</option>
              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      {activeStepIndex === 1 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Word count"
            fieldId="quote-word-count"
            error={errors.wordCount?.message}
          >
            <input
              id="quote-word-count"
              className={inputClass}
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="2500"
              autoComplete="off"
              disabled={isSubmitting}
              {...errorProps("wordCount", "quote-word-count")}
              {...register("wordCount")}
            />
          </Field>
          <Field
            label="Deadline"
            fieldId="quote-deadline"
            error={errors.deadline?.message}
            required
          >
            <input
              id="quote-deadline"
              className={inputClass}
              type="date"
              min={minDeadline}
              autoComplete="off"
              required
              disabled={isSubmitting}
              onInput={(event) =>
                setValue("deadline", event.currentTarget.value, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true
                })
              }
              {...errorProps("deadline", "quote-deadline")}
              {...register("deadline")}
            />
          </Field>
          <Field
            label="Urgency"
            fieldId="quote-urgency"
            error={errors.urgency?.message}
            className="md:col-span-2"
          >
            <select
              id="quote-urgency"
              className={inputClass}
              autoComplete="off"
              disabled={isSubmitting}
              {...errorProps("urgency", "quote-urgency")}
              {...register("urgency")}
            >
              <option value="">Select urgency</option>
              {urgencyOptions.map((urgency) => (
                <option key={urgency} value={urgency}>
                  {urgency}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      {activeStepIndex === 2 ? (
        <div className="grid gap-5">
          <Field label="File reference" fieldId="quote-file">
            <label
              htmlFor="quote-file"
              onClick={() =>
                trackQuoteEvent(quoteTrackingEvents.uploadBriefClicked, {
                  source: "quote_form"
                })
              }
              className="mt-2 flex min-h-[58px] cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-softTeal/50 bg-paleSage px-4 py-3 text-sm text-slateText transition hover:border-mutedCopper hover:bg-white"
            >
              <span className="truncate">
                {fileReference?.name || "Upload your brief, rubric, draft, lecture notes, or formatting requirements."}
              </span>
              <motion.span
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { y: [0, -2, 0], rotate: [0, -4, 0] }
                }
                transition={{
                  duration: motionDurations.slow,
                  ease: motionEase
                }}
              >
                <FileUp className="h-4 w-4 shrink-0 text-softTeal" aria-hidden />
              </motion.span>
              <input
                id="quote-file"
                name="briefFile"
                className="sr-only"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.csv,.jpg,.jpeg,.png"
                disabled={isSubmitting || fileReference?.status === "uploading"}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setFileReference(null);
                    return;
                  }

                  setFileReference(
                    {
                      name: file.name,
                      size: file.size,
                      type: file.type || "unknown",
                      status: "uploading",
                      progress: 5
                    }
                  );
                  if (file) {
                    trackQuoteEvent(quoteTrackingEvents.fileUploadStarted, {
                      file_name: file.name,
                      file_type: file.type || "unknown",
                      source: "quote_form_file_reference"
                    });
                    trackQuoteEvent(quoteTrackingEvents.uploadBriefClicked, {
                      file_name: file.name,
                      file_type: file.type || "unknown",
                      source: "quote_form_file_reference",
                      file_selected: true
                    });
                  }
                  try {
                    const uploaded = await uploadBriefFile(file, (progress) => {
                      setFileReference((current) =>
                        current?.name === file.name
                          ? { ...current, progress, status: "uploading" }
                          : current
                      );
                    });
                    setFileReference({
                      name: uploaded.fileName,
                      size: uploaded.fileSize,
                      type: uploaded.mimeType,
                      assetId: uploaded.fileAssetId,
                      status: "uploaded",
                      progress: 100
                    });
                    trackQuoteEvent(quoteTrackingEvents.fileUploadCompleted, {
                      file_name: uploaded.fileName,
                      file_type: uploaded.mimeType,
                      file_size: uploaded.fileSize,
                      source: "quote_form"
                    });
                    trackQuoteEvent(quoteTrackingEvents.fileUploaded, {
                      file_name: uploaded.fileName,
                      file_type: uploaded.mimeType,
                      file_size: uploaded.fileSize,
                      source: "quote_form"
                    });
                  } catch (error) {
                    trackQuoteEvent(quoteTrackingEvents.fileUploadFailed, {
                      file_name: file.name,
                      file_type: file.type || "unknown",
                      source: "quote_form"
                    });
                    setFileReference({
                      name: file.name,
                      size: file.size,
                      type: file.type || "unknown",
                      status: "failed",
                      progress: 0,
                      error:
                        error instanceof Error
                          ? error.message
                          : "File upload failed. You can still submit the quote and send the file on WhatsApp."
                    });
                  } finally {
                    event.currentTarget.value = "";
                  }
                }}
              />
            </label>
            {fileReference ? (
              <div
                className={cn(
                  "mt-3 rounded-md border p-3 text-xs leading-5",
                  fileReference.status === "uploaded"
                    ? "border-softTeal/30 bg-softTeal/10 text-charcoalInk"
                    : fileReference.status === "failed"
                      ? "border-mutedCopper/35 bg-mutedCopper/10 text-charcoalInk"
                      : "border-sageBorder bg-paleSage text-slateText"
                )}
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {fileReference.status === "uploading"
                        ? "Uploading securely..."
                        : fileReference.status === "uploaded"
                          ? "File added to your quote request."
                          : fileReference.status === "failed"
                            ? "File upload failed. You can still submit the quote and send the file on WhatsApp."
                            : "No file selected"}
                    </p>
                    <p className="mt-1 text-slateText">{fileReference.name}</p>
                    {fileReference.error ? (
                      <p className="mt-1 text-mutedCopper">
                        {fileReference.error}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-charcoalInk underline"
                    disabled={fileReference.status === "uploading"}
                    onClick={() => setFileReference(null)}
                  >
                    Remove file
                  </button>
                </div>
                {fileReference.status === "uploading" ? (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-mutedCopper transition-all"
                      style={{ width: `${fileReference.progress}%` }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            <p className="mt-2 text-xs leading-5 text-slateText">
              Files help WriteX review the scope. For urgent requests, send the
              same file directly on WhatsApp as well.
            </p>
          </Field>
          <Field
            label="Additional instructions"
            fieldId="quote-instructions"
            error={errors.instructions?.message}
            required
          >
            <textarea
              id="quote-instructions"
              className={cn(inputClass, "min-h-36 resize-y")}
              placeholder="Paste the brief, marking criteria, supervisor comments, preferred referencing style, or urgent notes."
              autoComplete="off"
              required
              disabled={isSubmitting}
              {...errorProps("instructions", "quote-instructions")}
              {...register("instructions")}
            />
          </Field>
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Name"
              fieldId="quote-name"
              error={errors.name?.message}
              required
            >
              <input
                id="quote-name"
                className={inputClass}
                placeholder="Your full name"
                autoComplete="name"
                required
                disabled={isSubmitting}
                {...errorProps("name", "quote-name")}
                {...register("name")}
              />
            </Field>
            <Field
              label="Email"
              fieldId="quote-email"
              error={errors.email?.message}
            >
              <input
                id="quote-email"
                className={inputClass}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isSubmitting}
                {...errorProps("email", "quote-email")}
                {...register("email")}
              />
            </Field>
            <Field
              label="WhatsApp number"
              fieldId="quote-whatsapp"
              error={errors.whatsapp?.message}
              required
              className="md:col-span-2"
            >
              <input
                id="quote-whatsapp"
                className={inputClass}
                type="tel"
                placeholder="+91 00000 00000"
                autoComplete="tel"
                required
                disabled={isSubmitting}
                {...errorProps("whatsapp", "quote-whatsapp")}
                {...register("whatsapp")}
              />
            </Field>
            <div className="md:col-span-2">
              <label className="flex gap-3 rounded-md border border-sageBorder bg-paleSage p-4 text-sm leading-6 text-slateText">
                <input
                  id="quote-consent"
                  type="checkbox"
                  required
                  disabled={isSubmitting}
                  className="mt-1 h-4 w-4 shrink-0 accent-mutedCopper"
                  {...errorProps("consent", "quote-consent")}
                  {...register("consent")}
                />
                <span>
                  I consent to WriteX reviewing my submitted details and files to
                  provide a quote. I understand WriteX provides academic support
                  for learning and guidance.
                </span>
              </label>
              {errors.consent?.message ? (
                <p
                  id="quote-consent-error"
                  className="mt-2 text-sm text-deepCrimson"
                  role="alert"
                >
                  {errors.consent.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
        </motion.div>
      </AnimatePresence>

      <p className="mt-6 rounded-md border border-sageBorder bg-paleSage p-4 text-xs leading-6 text-slateText">
        {academicIntegrityDisclaimer}
      </p>

      <div className="mt-6 flex flex-col gap-3 border-t border-sageBorder pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          {activeStepIndex > 0 ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleBack}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-sageBorder bg-white px-5 text-sm font-semibold text-charcoalInk transition hover:border-mutedCopper disabled:cursor-not-allowed disabled:opacity-70"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
          ) : null}
          {activeStepIndex < formSteps.length - 1 ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleNext}
              className="wx-gradient-action inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="wx-gradient-action inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  Reviewing brief...
                </>
              ) : (
                "Send Brief for Quote"
              )}
            </button>
          )}
        </div>
        <a
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            trackQuoteEvent(quoteTrackingEvents.whatsappQuoteClicked, {
              source: "quote_form"
            })
          }
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-sageBorder bg-white px-5 text-sm font-semibold text-charcoalInk transition hover:border-mutedCopper"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Send Brief on WhatsApp
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  fieldId,
  error,
  children,
  className,
  required = false
}: {
  label: string;
  fieldId: string;
  error?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("block text-sm font-semibold text-charcoalInk", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={fieldId}>{label}</label>
        {required ? <RequiredBadge /> : null}
      </div>
      {children}
      {error ? (
        <p
          id={`${fieldId}-error`}
          className="mt-2 text-sm text-deepCrimson"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RequiredBadge() {
  return (
    <span className="rounded-sm bg-mutedCopper/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoalInk">
      Required
    </span>
  );
}

