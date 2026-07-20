"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { AXO_AUTH_SUCCESS_EVENT } from "@/lib/auth/axoLoginTransition";

export function AxoLoginTransition({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("Preparing your WriteX workspace...");

  useEffect(() => {
    const onSuccess = (event: Event) => {
      setMessage((event as CustomEvent<{ message?: string }>).detail?.message || "Preparing your WriteX workspace...");
      setActive(true);
    };
    window.addEventListener(AXO_AUTH_SUCCESS_EVENT, onSuccess);
    return () => window.removeEventListener(AXO_AUTH_SUCCESS_EVENT, onSuccess);
  }, []);

  return (
    <div className={`wx-auth-card relative flex min-h-0 w-full min-w-0 max-w-[32rem] flex-col justify-center rounded-[1.75rem] border p-6 transition duration-300 sm:p-8 lg:p-8 ${active ? "border-wxViolet700 shadow-soft" : "border-wxBorder shadow-soft"}`}>
      <div className="wx-auth-card-logo mb-6 flex justify-center sm:mb-8">
        <BrandLogo
          markClassName="wx-auth-card-logo-mark w-60 sm:w-72"
          sizes="(min-width: 640px) 288px, 240px"
        />
      </div>
      {children}
      <div className={`pointer-events-none absolute inset-0 flex items-end justify-center rounded-[1.75rem] bg-wxSurface/80 p-6 transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`} aria-hidden={!active}>
        <p role="status" aria-live="polite" className="rounded-full border border-wxViolet700/25 bg-wxSurface px-5 py-3 text-sm font-semibold text-wxIndigo900 shadow-soft">
          {message}
        </p>
      </div>
    </div>
  );
}

