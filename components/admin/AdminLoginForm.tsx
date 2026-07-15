"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        payload?.error?.message ||
          "Unable to sign in. Check the admin email and password."
      );
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-lg border border-sageBorder bg-white p-6 shadow-soft"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-academicEmerald text-white">
          <ShieldCheck aria-hidden="true" size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-charcoalInk">Admin login</h1>
          <p className="text-sm text-slateText">Secure access for WriteX team members.</p>
        </div>
      </div>

      <label className="block text-sm font-semibold text-charcoalInk" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className="mt-2 w-full rounded-md border border-sageBorder bg-white px-3 py-3 text-sm outline-none transition focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
      />

      <label
        className="mt-5 block text-sm font-semibold text-charcoalInk"
        htmlFor="password"
      >
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="mt-2 w-full rounded-md border border-sageBorder bg-white px-3 py-3 text-sm outline-none transition focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
      />

      {error ? (
        <p className="mt-4 rounded-md border border-deepCrimson/20 bg-deepCrimson/5 px-3 py-2 text-sm font-semibold text-deepCrimson">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded-md bg-mutedCopper px-4 py-3 text-sm font-bold text-white transition hover:bg-mutedCopper/90 focus:outline-none focus:ring-2 focus:ring-mutedCopper/35 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
