"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  ChevronDown,
  CircleDollarSign,
  FileCheck2,
  ReceiptText
} from "lucide-react";

type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unavailable"; title: string; message: string }
  | { status: "not-verified"; message: string }
  | { status: "error"; message: string };

type VerificationFormProps = {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  buttonLabel: string;
  icon: ReactNode;
  fields: Array<{
    name: string;
    label: string;
    placeholder: string;
    type?: "text" | "tel";
    required?: boolean;
  }>;
};

function VerificationForm({
  id,
  title,
  description,
  endpoint,
  buttonLabel,
  icon,
  fields
}: VerificationFormProps) {
  const [state, setState] = useState<RequestState>({ status: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading" });
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(
      fields.map((field) => [field.name, String(form.get(field.name) || "")])
    );

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store"
      });
      const body = await response.json().catch(() => null);

      if (body?.serviceUnavailable && body?.unavailable) {
        setState({
          status: "unavailable",
          title: body.unavailable.title,
          message: body.unavailable.message
        });
      } else if (response.ok && body?.verified === false) {
        setState({
          status: "not-verified",
          message: "No verified record matched those details."
        });
      } else if (!response.ok) {
        setState({
          status: "error",
          message:
            body?.error?.message ||
            "The verification could not be completed. Please try again."
        });
      } else {
        setState({
          status: "error",
          message:
            "This service has not returned an approved public verification result."
        });
      }
    } catch {
      setState({
        status: "unavailable",
        title: "Verification Temporarily Unavailable",
        message:
          "Verification service is currently being connected. Please contact business@writex.co.in."
      });
    }
  }

  return (
    <details
      id={id}
      className="group scroll-mt-24 rounded-md border border-sageBorder bg-white shadow-sm"
    >
      <summary className="flex min-h-24 cursor-pointer list-none items-center gap-4 px-5 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 sm:px-6">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-wxSurfaceSoft text-wxViolet700">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-wxIndigo900">
            {title}
          </span>
          <span className="mt-1 block text-sm leading-6 text-wxIndigo500">
            {description}
          </span>
        </span>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-wxIndigo500 transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-wxBorder px-5 py-5 sm:px-6">
        <div className="rounded-md border border-wxOrange500/25 bg-wxSurfaceSoft px-4 py-3 text-sm leading-6 text-wxIndigo700">
          Verification service is currently being connected.
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <label
              key={field.name}
              htmlFor={`${id}-${field.name}`}
              className="text-sm font-semibold text-wxIndigo900"
            >
              {field.label}
              <input
                id={`${id}-${field.name}`}
                name={field.name}
                type={field.type || "text"}
                required={field.required !== false}
                maxLength={120}
                placeholder={field.placeholder}
                className="mt-2 min-h-12 w-full rounded-md border border-wxBorder bg-white px-4 text-base font-normal text-wxIndigo900 outline-none transition placeholder:text-wxIndigo500/55 focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={state.status === "loading"}
            className="min-h-12 rounded-md bg-brand-spectrum px-5 text-sm font-semibold text-white shadow-spectrum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 disabled:cursor-wait disabled:opacity-65 sm:col-span-2"
          >
            {state.status === "loading" ? "Checking..." : buttonLabel}
          </button>
        </form>
        <div
          aria-live="polite"
          aria-busy={state.status === "loading"}
          className="mt-4 min-h-6"
        >
          {state.status === "unavailable" ? (
            <div className="rounded-md border border-wxOrange500/25 bg-white p-4">
              <p className="font-semibold text-wxIndigo900">{state.title}</p>
              <p className="mt-1 text-sm leading-6 text-wxIndigo500">
                {state.message}
              </p>
            </div>
          ) : state.status === "not-verified" ||
            state.status === "error" ? (
            <p className="text-sm font-semibold text-wxOrange500">
              {state.message}
            </p>
          ) : null}
        </div>
      </div>
    </details>
  );
}

export function TrustSystemVerificationForms() {
  return (
    <div className="grid gap-4">
      <VerificationForm
        id="verify-invoice"
        title="Verify Invoice"
        description="Confirm an invoice number and registered mobile against the official billing system."
        endpoint="/api/trust/verify-invoice"
        buttonLabel="Verify Invoice"
        icon={<ReceiptText className="h-5 w-5" aria-hidden />}
        fields={[
          {
            name: "invoiceNumber",
            label: "Invoice Number",
            placeholder: "Enter invoice number"
          },
          {
            name: "mobile",
            label: "Registered Mobile Number",
            placeholder: "+91 81000 00000",
            type: "tel"
          }
        ]}
      />
      <VerificationForm
        id="check-payment-status"
        title="Check Payment Status"
        description="Check the most recent verified payment status recorded for an invoice."
        endpoint="/api/trust/check-payment-status"
        buttonLabel="Check Payment Status"
        icon={<CircleDollarSign className="h-5 w-5" aria-hidden />}
        fields={[
          {
            name: "invoiceNumber",
            label: "Invoice Number",
            placeholder: "Enter invoice number"
          },
          {
            name: "mobile",
            label: "Registered Mobile Number",
            placeholder: "+91 81000 00000",
            type: "tel"
          }
        ]}
      />
      <VerificationForm
        id="verify-enquiry"
        title="Verify Enquiry"
        description="Confirm whether an enquiry reference is recognised by WriteX."
        endpoint="/api/trust/verify-enquiry"
        buttonLabel="Verify Enquiry"
        icon={<FileCheck2 className="h-5 w-5" aria-hidden />}
        fields={[
          {
            name: "enquiryReference",
            label: "Enquiry Reference",
            placeholder: "Enter enquiry reference"
          },
          {
            name: "mobile",
            label: "Registered Mobile Number (if required)",
            placeholder: "+91 81000 00000",
            type: "tel",
            required: false
          }
        ]}
      />
    </div>
  );
}
