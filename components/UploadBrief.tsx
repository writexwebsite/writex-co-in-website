"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  ShieldCheck,
  UploadCloud
} from "lucide-react";
import { useMemo, useState } from "react";
import { getWhatsAppUrl } from "@/lib/site";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { cn } from "@/lib/utils";

const contextItems = [
  {
    label: "Brief or rubric",
    copy: "Instructions, marking criteria, and module notes."
  },
  {
    label: "Draft or comments",
    copy: "Current work, supervisor notes, or feedback."
  },
  {
    label: "Deadline and style",
    copy: "Word count, referencing style, and due date."
  },
  {
    label: "Special files",
    copy: "Data, analysis notes, SOP prompts, or guides."
  }
];

const acceptedFileTypes =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.txt";

export function UploadBrief() {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");

  const statusMessage = useMemo(() => {
    if (fileName) {
      return "File selected for reference only. For urgent requests, send your file directly on WhatsApp.";
    }

    return "Use the quote form for details. For urgent requests, send your file directly on WhatsApp.";
  }, [fileName]);

  function handleFileChange(file?: File) {
    if (!file) {
      setFileName("");
      setFileSize("");
      return;
    }

    setFileName(file.name);
    setFileSize(`${Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB`);
    trackQuoteEvent(quoteTrackingEvents.uploadBriefClicked, {
      source: "homepage_upload_brief",
      file_type: file.name.split(".").pop()?.toLowerCase()
    });
  }

  return (
    <div className="relative overflow-hidden rounded-md border border-sageBorder bg-warmIvory p-5 shadow-soft sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(11,129,247,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(232,56,116,0.1),transparent_36%)]" />

      <div className="relative grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <div className="flex flex-col">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxViolet700 shadow-sm">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-softTeal">
                Secure quote intake
              </p>
              <h3 className="mt-2 text-2xl font-semibold leading-tight text-charcoalInk">
                Prepare the files that explain the brief
              </h3>
              <p className="mt-2 text-sm leading-6 text-slateText">
                Better context helps WriteX review the service type, deadline,
                academic level, and document condition before quoting.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {contextItems.map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-sageBorder bg-white/80 p-3"
              >
                <p className="text-sm font-semibold text-charcoalInk">
                  {item.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-slateText">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/pricing#quote"
              className="wx-gradient-action wx-cta-glow inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
              onClick={() =>
                trackQuoteEvent(quoteTrackingEvents.uploadBriefClicked, {
                  source: "homepage_upload_brief_quote_form",
                  file_selected: Boolean(fileName)
                })
              }
            >
            <FileText className="h-4 w-4" aria-hidden />
              <span>Get Quote</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-sageBorder bg-white px-5 py-3 text-sm font-semibold text-charcoalInk transition duration-200 hover:border-softTeal hover:bg-paleSage focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mutedCopper"
              onClick={() =>
                trackQuoteEvent(quoteTrackingEvents.whatsappQuoteClicked, {
                  source: "homepage_upload_brief"
                })
              }
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span>Send on WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="rounded-md border border-sageBorder bg-white/90 p-4 shadow-sm sm:p-5">
          <label
            className={cn(
              "flex min-h-[158px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-5 py-6 text-center transition duration-300",
              fileName
                ? "border-softTeal bg-paleSage"
                : "border-softTeal/50 bg-white hover:border-mutedCopper hover:bg-paleSage/60"
            )}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-md border border-softTeal/20 bg-softTeal/10 text-softTeal">
              <UploadCloud className="h-6 w-6" aria-hidden />
            </span>
            <span className="mt-4 text-base font-semibold text-charcoalInk">
              {fileName || "Choose a brief, rubric, draft, or guide"}
            </span>
            <span className="mt-1 text-xs leading-5 text-slateText">
              {fileName
                ? `Selected for reference: ${fileSize}`
                : "PDF, DOCX, PPTX, XLSX, CSV, JPG, PNG, or TXT"}
            </span>
            <input
              className="sr-only"
              type="file"
              name="homepageBriefFile"
              accept={acceptedFileTypes}
              aria-describedby="homepage-upload-status"
              onChange={(event) => handleFileChange(event.target.files?.[0])}
            />
          </label>

          <div
            id="homepage-upload-status"
            className="mt-4 rounded-md border border-sageBorder bg-paleSage px-4 py-3 text-sm leading-6 text-slateText"
            role="status"
            aria-live="polite"
          >
            {statusMessage}
          </div>

          <div className="mt-4 grid gap-2 text-sm text-charcoalInk sm:grid-cols-2">
            {["Confidential handling", "Scope review", "Expert matching", "QA path"].map(
              (item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-softTeal"
                    aria-hidden
                  />
                  <span>{item}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
