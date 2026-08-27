"use client";

export default function MyWritexError({ reset }: { reset: () => void }) {
  return <section className="mw-card p-8 text-center"><h1 className="mw-page-title">We could not open this part of My WriteX.</h1><p className="mw-secondary mx-auto mt-3 max-w-[360px]">Your session remains protected. Try again, or return to Home.</p><button type="button" onClick={reset} className="mw-button-primary mt-6">Try again</button></section>;
}
