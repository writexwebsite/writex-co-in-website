"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { getWhatsAppUrl, siteConfig } from "@/lib/site";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

const intents = [
  {
    key: "quote",
    label: "I need a quote",
    route: "Use the pricing form or WhatsApp with your brief, files, and deadline.",
    primaryHref: "/pricing#quote",
    primaryLabel: "Open Quote Form",
    whatsappLabel: "Send Brief on WhatsApp",
    showReference: false
  },
  {
    key: "client",
    label: "I am an existing client",
    route: "Use the Client Portal where possible, or share your reference details.",
    primaryHref: "/client-login",
    primaryLabel: "Client Login",
    whatsappLabel: "Message Support",
    showReference: true
  },
  {
    key: "payment",
    label: "I need payment support",
    route: "Share the quote reference, payment proof status, and preferred contact route.",
    primaryHref: "/client-login",
    primaryLabel: "Client Login",
    whatsappLabel: "Message Accounts",
    showReference: true
  },
  {
    key: "revision",
    label: "I need revision support",
    route: "Share the project reference, original brief, and what needs review.",
    primaryHref: "/client-login",
    primaryLabel: "Client Login",
    whatsappLabel: "Message Revision Support",
    showReference: true
  },
  {
    key: "partnership",
    label: "I want a partnership",
    route: "Email is best for partnership, institutional, or operations enquiries.",
    primaryHref: `mailto:${siteConfig.email}`,
    primaryLabel: "Email WriteX",
    whatsappLabel: "WhatsApp WriteX",
    showReference: false
  },
  {
    key: "general",
    label: "General enquiry",
    route: "Share a short message and the team will guide you to the right next step.",
    primaryHref: `mailto:${siteConfig.email}`,
    primaryLabel: "Email WriteX",
    whatsappLabel: "WhatsApp WriteX",
    showReference: false
  }
] as const;

type IntentKey = (typeof intents)[number]["key"];

const inputClass =
  "mt-2 w-full rounded-md border border-sageBorder px-4 py-3 text-sm text-charcoalInk outline-none transition placeholder:text-slateText/60 focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20";

function getIntent(key: IntentKey) {
  return intents.find((intent) => intent.key === key) || intents[0];
}

function buildContactWhatsAppMessage(intent: IntentKey, form: FormData) {
  return [
    "Hi WriteX, I need help reaching the right team.",
    `Intent: ${getIntent(intent).label}`,
    `Name: ${form.get("name") || ""}`,
    `Email: ${form.get("email") || ""}`,
    form.get("whatsapp") ? `WhatsApp: ${form.get("whatsapp")}` : "",
    form.get("reference") ? `Reference: ${form.get("reference")}` : "",
    `Message: ${form.get("message") || ""}`
  ]
    .filter(Boolean)
    .join("\n");
}

export function ContactForm() {
  const [intent, setIntent] = useState<IntentKey>("quote");
  const [preparedUrl, setPreparedUrl] = useState("");
  const activeIntent = useMemo(() => getIntent(intent), [intent]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const whatsappUrl = getWhatsAppUrl(buildContactWhatsAppMessage(intent, form));

    setPreparedUrl(whatsappUrl);
    trackQuoteEvent(quoteTrackingEvents.whatsappFallbackClicked, {
      source: "contact_intent_form",
      intent
    });
  }

  if (preparedUrl) {
    return (
      <div className="rounded-md border border-softTeal/30 bg-white p-6 shadow-soft">
        <CheckCircle2 className="h-10 w-10 text-softTeal" aria-hidden />
        <h2 className="mt-4 text-2xl font-semibold text-charcoalInk">
          Your route is ready
        </h2>
        <p className="mt-3 text-sm leading-7 text-slateText">
          Thanks for sharing the details. For the fastest response, please send
          this context on WhatsApp or use the recommended channel below.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={preparedUrl}
            target="_blank"
            rel="noreferrer"
            className="wx-gradient-action inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Continue on WhatsApp
          </a>
          <a
            href={activeIntent.primaryHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-sageBorder bg-white px-5 text-sm font-semibold text-charcoalInk transition hover:border-mutedCopper"
          >
            {activeIntent.primaryLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
        <button
          type="button"
          className="mt-5 text-sm font-semibold text-softTeal underline-offset-4 hover:underline"
          onClick={() => setPreparedUrl("")}
        >
          Edit contact details
        </button>
      </div>
    );
  }

  return (
    <form
      className="rounded-md border border-sageBorder bg-white p-6 shadow-soft"
      onSubmit={handleSubmit}
    >
      <div className="rounded-md border border-sageBorder bg-paleSage p-4">
        <label
          htmlFor="contact-intent"
          className="text-sm font-semibold text-charcoalInk"
        >
          What do you need?
        </label>
        <select
          id="contact-intent"
          name="intent"
          value={intent}
          className={inputClass}
          onChange={(event) => setIntent(event.currentTarget.value as IntentKey)}
        >
          {intents.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-3 text-sm leading-6 text-slateText">
          {activeIntent.route}
        </p>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-charcoalInk">
          Name
          <input
            name="name"
            required
            autoComplete="name"
            className={inputClass}
            placeholder="Your name"
          />
        </label>
        <label className="text-sm font-semibold text-charcoalInk">
          Email
          <input
            name="email"
            required
            type="email"
            autoComplete="email"
            className={inputClass}
            placeholder="you@example.com"
          />
        </label>
      </div>

      <div
        className={cn(
          "mt-5 grid gap-5",
          activeIntent.showReference ? "md:grid-cols-2" : "md:grid-cols-1"
        )}
      >
        <label className="text-sm font-semibold text-charcoalInk">
          WhatsApp number
          <input
            name="whatsapp"
            type="tel"
            autoComplete="tel"
            className={inputClass}
            placeholder="+91 00000 00000"
          />
        </label>
        {activeIntent.showReference ? (
          <label className="text-sm font-semibold text-charcoalInk">
            Quote or project reference
            <input
              name="reference"
              autoComplete="off"
              className={inputClass}
              placeholder="If available"
            />
          </label>
        ) : null}
      </div>

      <label className="mt-5 block text-sm font-semibold text-charcoalInk">
        Message
        <textarea
          name="message"
          required
          className={`${inputClass} min-h-32 resize-y`}
          placeholder="Tell us what support you need, your deadline, and how you prefer to be contacted."
        />
      </label>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="wx-gradient-action inline-flex min-h-12 items-center justify-center rounded-md px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wxViolet700"
        >
          Prepare Contact Route
        </button>
        <a
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-sageBorder bg-white px-5 text-sm font-semibold text-charcoalInk transition hover:border-mutedCopper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mutedCopper"
        >
          <WhatsAppIcon className="h-4 w-4" />
          {activeIntent.whatsappLabel}
        </a>
        <a
          href={`mailto:${siteConfig.email}`}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-sageBorder bg-white px-5 text-sm font-semibold text-charcoalInk transition hover:border-mutedCopper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mutedCopper"
        >
          <Mail className="h-4 w-4" aria-hidden />
          Email
        </a>
      </div>
    </form>
  );
}
