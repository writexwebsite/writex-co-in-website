"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Paperclip, RefreshCw } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/site";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

type RevisionStatus = {
  id: string;
  requestType: string;
  status: string;
  submittedAt: string | Date;
  message?: string | null;
};

const requestTypes = [
  "Clarification",
  "Revision request",
  "Formatting issue",
  "Referencing issue",
  "Missing instruction",
  "Supervisor comment response",
  "Other"
];

const issueCategories = [
  "Content clarity",
  "Structure",
  "Referencing/citation",
  "Formatting",
  "Language/editing",
  "Data/technical issue",
  "Scope mismatch",
  "Other"
];

const inputClass =
  "min-h-11 w-full rounded-md border border-sageBorder bg-white px-3 py-2 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20";

function friendlyStatus(status: string) {
  const labels: Record<string, string> = {
    submitted: "Submitted",
    under_review: "Under Review",
    accepted: "Accepted for Review",
    needs_clarification: "Needs Clarification",
    out_of_scope: "Outside Current Scope",
    completed: "Completed",
    rejected: "Not Approved",
    closed: "Closed"
  };

  return labels[status] || status.replace(/_/g, " ");
}

export function RevisionRequestForm({
  invoiceId,
  existingRequests = [],
  supportUrl
}: {
  invoiceId: string;
  existingRequests?: RevisionStatus[];
  supportUrl?: string;
}) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestRequests, setLatestRequests] = useState(existingRequests);
  const fallbackUrl = useMemo(
    () =>
      getWhatsAppUrl(
        `Hi WriteX, I want to request a review for invoice ${invoiceId}. Issue type: Revision request. Details:`
      ),
    [invoiceId]
  );

  async function submitRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/client/revision-request", {
      method: "POST",
      body: formData
    });
    const payload = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok || !payload?.ok) {
      setMessage(
        payload?.error?.message ||
          "We could not submit the request online. Please send your revision note on WhatsApp."
      );
      return;
    }

    setMessage(
      payload.data?.message ||
        "Your review request has been submitted. WriteX will check it against the original brief and respond through the support workflow."
    );
    setLatestRequests((current) => [
      {
        id: payload.data.revisionRequestId,
        requestType: String(formData.get("requestType") || "Revision request"),
        status: "submitted",
        submittedAt: new Date().toISOString()
      },
      ...current
    ]);
    form.reset();
  }

  return (
    <section className="wx-admin-enter rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <h2 className="text-xl font-bold">Need a revision or clarification?</h2>
          <p className="mt-2 text-sm leading-6 text-slateText">
            If something needs review, submit a clear note against the original brief.
            WriteX will check the request and respond through the support workflow.
          </p>
          <p className="mt-3 rounded-md border border-mutedCopper/20 bg-mutedCopper/10 p-3 text-sm font-semibold text-charcoalInk">
            Revision eligibility depends on the original brief, agreed scope, and new
            instructions.
          </p>
          <a
            href={supportUrl || fallbackUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-sageBorder bg-white px-4 text-sm font-bold text-charcoalInk"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Send Revision Note on WhatsApp
          </a>

          {latestRequests.length ? (
            <div className="mt-5 space-y-3">
              <h3 className="text-sm font-bold">Latest review requests</h3>
              {latestRequests.slice(0, 4).map((item) => (
                <article key={item.id} className="wx-row-hover rounded-md bg-paleSage p-3 text-sm">
                  <p className="font-bold">{item.requestType}</p>
                  <p className="mt-1 capitalize text-slateText">
                    {friendlyStatus(item.status)}
                  </p>
                  {item.status === "out_of_scope" ? (
                    <p className="mt-2 text-xs font-semibold text-mutedCopper">
                      This request may require separate confirmation if it adds new
                      instructions beyond the original brief.
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </div>

        <form onSubmit={submitRevision} className="grid gap-3">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <Field label="Request type">
            <select name="requestType" required className={inputClass}>
              {requestTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Issue category">
            <select name="issueCategory" required className={inputClass}>
              {issueCategories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Related section">
              <input
                name="relatedSection"
                className={inputClass}
                placeholder="Chapter, page, section, or file"
              />
            </Field>
            <Field label="Priority">
              <select name="priority" required className={inputClass} defaultValue="normal">
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
          </div>
          <Field label="Review note">
            <textarea
              name="message"
              required
              minLength={20}
              rows={5}
              className={inputClass}
              placeholder="Explain what needs review. Mention the section/page number, original instruction, and what should be checked."
            />
          </Field>
          <label className="flex items-center gap-3 rounded-md border border-dashed border-sageBorder p-3 text-sm text-slateText">
            <Paperclip className="h-4 w-4 text-mutedCopper" aria-hidden />
            <span className="flex-1">Optional attachment: PDF, DOC, DOCX, JPG, PNG, or TXT</span>
            <input
              type="file"
              name="attachment"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              className="max-w-48 text-xs"
            />
          </label>
          <label className="flex gap-3 text-sm leading-6 text-slateText">
            <input type="checkbox" name="confirmation" required className="mt-1 h-4 w-4" />
            <span>
              I understand this request will be reviewed against the original brief and
              agreed scope. New instructions may require separate confirmation.
            </span>
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="wx-gradient-action inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold disabled:opacity-60"
          >
            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {isSubmitting ? "Submitting..." : "Request Review"}
          </button>
          {message ? (
            <p className="wx-admin-enter rounded-md border border-sageBorder bg-paleSage px-3 py-2 text-sm font-semibold text-charcoalInk">
              {message}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-charcoalInk">
      <span>{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
