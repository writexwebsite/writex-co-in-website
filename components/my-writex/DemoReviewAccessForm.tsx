"use client";

import { type FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

export function DemoReviewAccessForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/dev/my-writex-review-auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: String(form.get("code") || "") }),
    });
    setBusy(false);
    if (!response.ok) {
      setMessage("We couldn't verify that review code.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="my-writex-product min-h-screen bg-[var(--mw-bg)] p-4 sm:p-8">
      <main className="mx-auto mt-[12vh] max-w-[480px] rounded-[16px] border border-[var(--mw-line)] bg-white p-6 shadow-sm sm:p-8">
        <LockKeyhole className="h-7 w-7 text-[var(--mw-primary)]" aria-hidden />
        <p className="mw-eyebrow mt-5">Restricted demo inspector</p>
        <h1 className="mw-section-title mt-2">Founder review access</h1>
        <p className="mw-secondary mt-2">Enter the separate review code. This inspector can change only the isolated Shubham demo request store.</p>
        <form onSubmit={submit} className="mt-6">
          <label className="block text-sm font-semibold" htmlFor="demo-review-code">Review code</label>
          <input id="demo-review-code" name="code" type="password" required autoComplete="off" className="mw-control mt-2 w-full" />
          {message ? <p role="alert" className="mt-3 text-sm font-semibold text-[#934122]">{message}</p> : null}
          <button disabled={busy} className="mw-button-primary mt-5 w-full">{busy ? "Checking…" : "Open Demo Inspector"}</button>
        </form>
      </main>
    </div>
  );
}
