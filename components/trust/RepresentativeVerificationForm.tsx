"use client";

import { useState, type FormEvent } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Mail,
  ShieldAlert,
  ShieldCheck,
  UserCheck
} from "lucide-react";

type VerificationResult =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "verified";
      representative: {
        name: string;
        designation: string;
        department: string;
        status: "Active";
      };
      verifiedAt: string;
      verificationId: string;
    }
  | { status: "unverified" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

export function RepresentativeVerificationForm() {
  const [mobile, setMobile] = useState("");
  const [result, setResult] = useState<VerificationResult>({ status: "idle" });

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult({ status: "loading" });

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/trust/verify-representative", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mobile,
          website: String(form.get("website") || "")
        }),
        cache: "no-store"
      });
      const data = (await response.json()) as {
        verified?: boolean;
        serviceUnavailable?: boolean;
        verifiedAt?: string;
        verificationId?: string;
        representative?: {
          name: string;
          designation: string;
          department: string;
          status: "Active";
        };
        error?: { message?: string };
      };

      if (data.serviceUnavailable) {
        setResult({ status: "unavailable" });
      } else if (
        data.verified &&
        data.representative &&
        data.verifiedAt &&
        data.verificationId
      ) {
        setResult({
          status: "verified",
          representative: data.representative,
          verifiedAt: data.verifiedAt,
          verificationId: data.verificationId
        });
      } else if (response.ok) {
        setResult({ status: "unverified" });
      } else {
        setResult({
          status: "error",
          message:
            data.error?.message ||
            "We could not complete the verification. Please try again."
        });
      }
    } catch {
      setResult({ status: "unavailable" });
    }
  }

  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-[0.82fr_1.18fr]">
      <form
        onSubmit={verify}
        className="rounded-md border border-sageBorder bg-white p-6 shadow-soft"
      >
        <label htmlFor="representative-mobile" className="text-sm font-semibold text-wxIndigo900">
          Mobile Number
        </label>
        <p id="representative-mobile-help" className="mt-2 text-sm leading-6 text-wxIndigo500">
          Enter an Indian mobile number with or without +91.
        </p>
        <input
          id="representative-mobile"
          name="mobile"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required
          maxLength={32}
          value={mobile}
          onChange={(event) => setMobile(event.target.value)}
          aria-describedby="representative-mobile-help"
          className="mt-4 min-h-12 w-full rounded-md border border-wxBorder bg-white px-4 text-base text-wxIndigo900 outline-none transition placeholder:text-wxIndigo500/60 focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
          placeholder="+91 81000 00000"
        />
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="representative-website">Website</label>
          <input id="representative-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <button
          type="submit"
          disabled={result.status === "loading"}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-spectrum px-5 text-sm font-semibold text-white shadow-spectrum transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 disabled:cursor-wait disabled:opacity-65"
        >
          <ShieldCheck className="h-5 w-5" aria-hidden />
          {result.status === "loading" ? "Verifying..." : "Verify Representative"}
        </button>
        <p className="mt-4 text-xs leading-6 text-wxIndigo500">
          Verification searches one exact number. It does not provide access to the employee directory.
        </p>
      </form>

      <div aria-live="polite" aria-busy={result.status === "loading"} className="h-full">
        {result.status === "idle" || result.status === "loading" ? (
          <div className="flex h-full min-h-56 items-center rounded-md border border-sageBorder bg-white p-6 shadow-sm">
            <div>
              <ShieldCheck className="h-9 w-9 text-wxViolet700" aria-hidden />
              <h3 className="mt-5 text-2xl font-semibold text-wxIndigo900">
                Check before you share or pay
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-wxIndigo500">
                Use the exact mobile number that contacted you. WriteX does not publish or expose its representative directory.
              </p>
            </div>
          </div>
        ) : null}

        {result.status === "verified" ? (
          <div className="h-full rounded-md border border-wxGreen500/35 bg-white p-6 shadow-soft">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-wxGreen500/10 text-wxGreen500">
                <BadgeCheck className="h-7 w-7" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-wxGreen500">Directory match</p>
                <h3 className="mt-2 text-2xl font-semibold text-wxIndigo900">Verified WriteX Representative</h3>
              </div>
            </div>
            <dl className="mt-6 grid gap-4 rounded-lg border border-wxBorder bg-wxSurfaceSoft/60 p-5 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase text-wxIndigo500">Name</dt><dd className="mt-1 font-semibold text-wxIndigo900">{result.representative.name}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-wxIndigo500">Designation</dt><dd className="mt-1 font-semibold text-wxIndigo900">{result.representative.designation}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-wxIndigo500">Department</dt><dd className="mt-1 font-semibold text-wxIndigo900">{result.representative.department}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-wxIndigo500">Status</dt><dd className="mt-1 font-semibold text-wxGreen500">{result.representative.status}</dd></div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Identity Verified", "Active Representative", "Official WriteX Contact"].map((badge) => (
                <span key={badge} className="inline-flex items-center gap-1.5 rounded-full border border-wxGreen500/25 bg-wxGreen500/5 px-3 py-1.5 text-xs font-semibold text-wxIndigo700"><CheckCircle2 className="h-3.5 w-3.5 text-wxGreen500" aria-hidden />{badge}</span>
              ))}
            </div>
            <p className="mt-5 text-sm font-semibold text-wxIndigo700">WriteX Official Directory Verified</p>
            <p className="mt-1 text-xs text-wxIndigo500">Verification ID: {result.verificationId}</p>
            <p className="mt-1 text-xs text-wxIndigo500">Verified {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.verifiedAt))}</p>
            <p className="mt-5 border-t border-wxBorder pt-5 text-sm leading-7 text-wxIndigo500">Verification confirms that the submitted number is currently listed in the official WriteX representative directory. Always follow the payment instructions printed on your official WriteX invoice.</p>
          </div>
        ) : null}

        {result.status === "unverified" ? (
          <div className="h-full rounded-md border border-wxOrange500/30 bg-white p-6 shadow-soft">
            <ShieldAlert className="h-9 w-9 text-wxOrange500" aria-hidden />
            <h3 className="mt-5 text-2xl font-semibold text-wxIndigo900">Unable to Verify This Number</h3>
            <p className="mt-3 text-sm leading-7 text-wxIndigo500">This number is not currently listed as an official WriteX representative contact.</p>
            <p className="mt-5 text-sm font-semibold text-wxIndigo900">Do not share:</p>
            <ul className="mt-3 grid gap-2 text-sm text-wxIndigo500 sm:grid-cols-2">
              {["Documents", "Personal information", "Project details", "Payment information"].map((item) => <li key={item} className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-wxOrange500" aria-hidden />{item}</li>)}
            </ul>
            <a href="mailto:business@writex.co.in" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-wxViolet700 px-4 text-sm font-semibold text-wxViolet700 transition hover:bg-wxSurfaceSoft"><Mail className="h-4 w-4" aria-hidden />Contact WriteX</a>
          </div>
        ) : null}

        {result.status === "unavailable" ? (
          <div className="h-full rounded-md border border-wxBlue500/25 bg-white p-6 shadow-soft">
            <Building2 className="h-9 w-9 text-wxBlue500" aria-hidden />
            <h3 className="mt-5 text-2xl font-semibold text-wxIndigo900">Verification Service Temporarily Unavailable</h3>
            <p className="mt-3 text-sm leading-7 text-wxIndigo500">The official representative directory is currently being connected. Please verify directly with WriteX before sharing information or making any payment.</p>
            <a href="mailto:business@writex.co.in" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-wxViolet700 px-4 text-sm font-semibold text-wxViolet700 transition hover:bg-wxSurfaceSoft"><UserCheck className="h-4 w-4" aria-hidden />business@writex.co.in</a>
          </div>
        ) : null}

        {result.status === "error" ? (
          <div className="h-full rounded-md border border-red-500/30 bg-white p-6 shadow-soft">
            <ShieldAlert className="h-9 w-9 text-red-600" aria-hidden />
            <h3 className="mt-5 text-xl font-semibold text-wxIndigo900">Verification could not be completed</h3>
            <p className="mt-3 text-sm leading-7 text-wxIndigo500">{result.message}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
