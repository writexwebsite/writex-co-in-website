"use client";

import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LogoWithTrademark } from "@/components/LogoWithTrademark";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });
    const payload = await response.json().catch(() => null);

    setIsSubmitting(false);

    if (!response.ok) {
      setError(
        response.status === 429
          ? "Too many sign-in attempts. Please wait a few minutes and try again."
          : "Unable to sign in with those details. Check your access or contact WriteX IT Support."
      );
      return;
    }

    router.push(
      payload?.data?.admin?.mustChangePassword
        ? "/admin/change-password"
        : "/admin/dashboard"
    );
    router.refresh();
  }

  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-wxBorder bg-wxSurface/90 shadow-[0_32px_90px_rgba(85,22,242,.14)] backdrop-blur-xl lg:grid-cols-[.86fr_1.14fr]">
      <section className="relative hidden overflow-hidden border-r border-wxBorder bg-premium-band p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,.5)_0_1px,transparent_1px)] [background-size:18px_18px]"
        />
        <div className="relative">
          <LogoWithTrademark
            className="w-40 [&_.wx-brand-logo-image]:brightness-0 [&_.wx-brand-logo-image]:invert"
            sizes="160px"
            priority
          />
          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            WriteX Command Centre
          </p>
          <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-tight">
            One secure view of the work that needs your attention.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">
            Trust, clients, hiring and system operations remain permission
            controlled and fully audited.
          </p>
        </div>
        <div className="relative grid gap-3">
          {[
            "Human approval for sensitive actions",
            "No credentials or raw provider data in the browser",
            "Every operational change is traceable"
          ].map((item) => (
            <p key={item} className="flex items-center gap-2 text-sm text-white/85">
              <ShieldCheck className="h-4 w-4 text-wxGreen500" />
              {item}
            </p>
          ))}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="p-6 sm:p-9 lg:p-12">
        <div className="lg:hidden">
          <LogoWithTrademark className="w-36" sizes="144px" priority />
        </div>
        <div className="mt-8 flex items-start gap-3 lg:mt-0">
          <span className="wx-gradient-action inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white">
            <LockKeyhole aria-hidden size={20} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-wxViolet700">
              Secure team access
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-wxIndigo900">
              Admin sign in
            </h1>
            <p className="mt-2 text-sm leading-6 text-wxIndigo500">
              Use your approved WriteX administrator account.
            </p>
          </div>
        </div>

        <label
          className="mt-8 block text-sm font-semibold text-wxIndigo900"
          htmlFor="email"
        >
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="admin@writex.co.in"
          className="mt-2 h-12 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900 outline-none transition focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
        />

        <div className="mt-5 flex items-center justify-between gap-3">
          <label
            className="block text-sm font-semibold text-wxIndigo900"
            htmlFor="password"
          >
            Password
          </label>
          <Link
            href="mailto:info@writex.co.in?subject=WriteX%20Admin%20Access%20Support"
            className="inline-flex min-h-11 items-center text-xs font-semibold text-wxViolet700"
          >
            Access support
          </Link>
        </div>
        <div className="relative mt-2">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-12 w-full rounded-md border border-wxBorder bg-wxSurface px-3 pr-12 text-sm text-wxIndigo900 outline-none transition focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-1 top-0.5 inline-flex h-11 w-11 items-center justify-center rounded-md text-wxIndigo500 hover:bg-wxSurfaceSoft"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium leading-5 text-red-800"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="wx-gradient-action mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in securely..." : "Sign in securely"}
        </button>

        <p className="mt-5 text-center text-xs leading-5 text-wxIndigo400">
          Access is monitored and audited. Do not share administrator
          credentials.
        </p>
      </form>
    </div>
  );
}
