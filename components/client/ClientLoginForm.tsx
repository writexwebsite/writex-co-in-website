"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FlaskConical,
  LockKeyhole,
  Mail,
  ReceiptText,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import Link from "next/link";
import { AuthInput } from "@/components/auth/AuthFields";
import { navigateWithAxoTransition } from "@/lib/auth/axoLoginTransition";
import { trackDemoEvent } from "@/lib/demo/analytics";

type ApiPayload = {
  ok: boolean;
  data?: {
    valid?: boolean;
    authenticated?: boolean;
    defaultRoute?: string;
  };
  error?: { message?: string };
};

const safeError =
  "We couldn't verify those details. Please check them and try again.";

export function ClientLoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState("");
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === "true";

  async function openDemo() {
    setDemoError("");
    setIsDemoLoading(true);
    trackDemoEvent("demo_client_login_started", { demo_type: "client", page_path: "/client-login" });
    const response = await fetch("/api/demo/client-login", { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.data?.authenticated) {
      setIsDemoLoading(false);
      setDemoError("Client demo is not available in this environment.");
      return;
    }
    trackDemoEvent("demo_client_login_success", { demo_type: "client", page_path: "/client-login" });
    navigateWithAxoTransition("/client/dashboard", router.push, "Loading Demo Workspace...");
  }

  async function postJson(url: string, body: Record<string, string>) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = (await response.json().catch(() => null)) as ApiPayload | null;
    return { response, payload };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const invoiceId = String(formData.get("invoiceId") || "").trim();
    const whatsapp = String(formData.get("whatsapp") || "").trim();
    const validation = await postJson("/api/client/auth/login", {
      invoiceNumber: invoiceId,
      mobile: whatsapp
    });
    setIsSubmitting(false);

    if (
      !validation.response.ok ||
      !validation.payload?.data?.authenticated
    ) {
      setMessage(
        validation.response.status === 503
          ? "Client verification is temporarily unavailable."
          : safeError
      );
      return;
    }

    navigateWithAxoTransition(
      validation.payload.data.defaultRoute || "/client/overview",
      router.push
    );
  }

  return (
    <form className="wx-auth-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-wxIndigo900 sm:text-[2.15rem]">
          Access Your WriteX Workspace
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-7 text-wxIndigo500">
          Use the invoice number and mobile registered with your WriteX order.
        </p>
      </div>

      <div className="mt-7">
        <AuthInput label="Invoice Number / WriteX ID" icon={ReceiptText} id="auth-first-input" name="invoiceId" required minLength={3} autoComplete="off" aria-describedby={message ? "client-login-error" : undefined} placeholder="Enter your invoice number" />
      </div>

      <div className="mt-5">
        <AuthInput label="Registered Mobile Number" icon={Smartphone} id="whatsapp" name="whatsapp" type="tel" required minLength={10} autoComplete="tel" aria-describedby={message ? "client-login-error" : undefined} placeholder="Enter the mobile linked to your invoice" />
      </div>

      {message ? (
        <p id="client-login-error" role="alert" className="mt-4 rounded-lg border border-deepCrimson/20 bg-deepCrimson/5 px-4 py-3 text-sm font-semibold leading-6 text-deepCrimson">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="wx-gradient-action mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg px-5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LockKeyhole className="h-5 w-5" aria-hidden />
        {isSubmitting ? "Verifying securely..." : "Sign In Securely"}
        {isSubmitting ? null : <ArrowRight className="h-5 w-5" aria-hidden />}
      </button>

      {demoEnabled ? (
        <div className="mt-4 border-t border-wxBorder pt-4">
          <button type="button" onClick={openDemo} disabled={isSubmitting || isDemoLoading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-wxViolet700/35 bg-transparent px-5 text-sm font-semibold text-wxViolet700 transition hover:border-wxViolet700 hover:bg-wxViolet700/5 disabled:opacity-60">
            <FlaskConical className="h-4 w-4" aria-hidden />
            {isDemoLoading ? "Opening demo..." : "View Client Demo"}
            <span className="rounded-full bg-wxViolet700/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]">Demo</span>
          </button>
          {demoError ? <p role="alert" className="mt-2 text-center text-xs font-semibold text-deepCrimson">{demoError}</p> : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 border-t border-wxBorder pt-5 sm:grid-cols-2">
        <Link
          href="/trust-centre#verify-invoice"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxIndigo700 transition hover:border-wxViolet700 hover:text-wxViolet700"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Verify Invoice
        </Link>
        <Link
          href="/trust-centre"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxIndigo700 transition hover:border-wxViolet700 hover:text-wxViolet700"
        >
          Open Trust Centre
        </Link>
        <Link
          href="/trust-centre/report"
          className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-semibold text-wxViolet700 hover:bg-wxViolet700/5 sm:col-span-2"
        >
          Report Suspicious Activity
        </Link>
      </div>

      <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-wxIndigo500">
        <Mail className="h-5 w-5" aria-hidden />
        Need help accessing your workspace?
        <Link
          href="mailto:business@writex.co.in"
          className="font-semibold text-wxViolet700 hover:text-wxPink500"
        >
          business@writex.co.in
        </Link>
      </p>
      <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs leading-5 text-wxIndigo500">
        <LockKeyhole className="h-4 w-4 shrink-0" aria-hidden />
        Your access details are encrypted and used only to verify this workspace.
      </p>
    </form>
  );
}
