"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function AdminChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword")
      })
    });
    const payload = await response.json().catch(() => null);

    setIsSubmitting(false);

    if (!response.ok) {
      setError(
        payload?.error?.message ||
          "The password could not be changed. Check the requirements and try again."
      );
      return;
    }

    router.replace(payload?.data?.destination || "/admin/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-lg border border-sageBorder bg-white p-6 shadow-soft"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-academicEmerald text-white">
          <KeyRound aria-hidden="true" size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-charcoalInk">Set a permanent password</h1>
          <p className="text-sm text-slateText">
            Replace the temporary administrator password before continuing.
          </p>
        </div>
      </div>

      <label
        className="block text-sm font-semibold text-charcoalInk"
        htmlFor="newPassword"
      >
        New password
      </label>
      <input
        id="newPassword"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={14}
        required
        aria-describedby="password-requirements"
        className="mt-2 w-full rounded-md border border-sageBorder bg-white px-3 py-3 text-sm outline-none transition focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
      />
      <p id="password-requirements" className="mt-2 text-xs text-slateText">
        Use at least 14 characters with uppercase, lowercase, number, and symbol.
      </p>

      <label
        className="mt-5 block text-sm font-semibold text-charcoalInk"
        htmlFor="confirmPassword"
      >
        Confirm new password
      </label>
      <input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={14}
        required
        className="mt-2 w-full rounded-md border border-sageBorder bg-white px-3 py-3 text-sm outline-none transition focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
      />

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-deepCrimson/20 bg-deepCrimson/5 px-3 py-2 text-sm font-semibold text-deepCrimson"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded-md bg-mutedCopper px-4 py-3 text-sm font-bold text-white transition hover:bg-mutedCopper/90 focus:outline-none focus:ring-2 focus:ring-mutedCopper/35 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Updating password..." : "Set password and continue"}
      </button>
    </form>
  );
}
