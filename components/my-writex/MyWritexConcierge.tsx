"use client";

import { useState } from "react";
import { Check, MessageCircle, Send, X } from "lucide-react";

const prompts = [
  "My current project",
  "A new requirement",
  "Job search",
  "CV help",
  "Viva or understanding",
  "Payment concern",
  "Talk to my manager",
  "Something went wrong",
];

export function MyWritexConcierge({ managerName }: { managerName: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function submit() {
    if (!message.trim()) return;
    setSent(true);
  }

  return (
    <section className="mw-card overflow-hidden">
      <div className="mw-card-mobile-pad p-5">
        <p className="mw-eyebrow">Quick Help</p>
        <h2 className="mw-object-title mt-2">Not sure where to begin?</h2>
        <p className="mw-secondary mt-1">Ask one question and keep the right context close to {managerName}.</p>
        <button type="button" onClick={() => { setOpen((value) => !value); setSent(false); }} className="mw-button-secondary mt-4 w-full" aria-expanded={open}>{open ? <><X className="h-[18px] w-[18px]" strokeWidth={1.75} />Close</> : <><MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />Ask concierge</>}</button>
      </div>
      {open ? (
        <div className="border-t border-[var(--mw-line)] bg-white p-5">
          {sent ? (
            <div role="status" className="flex items-start gap-3 rounded-[12px] bg-[#eaf6f0] p-4 text-[#155f43]"><span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#176b4c] text-white"><Check className="h-3.5 w-3.5" strokeWidth={1.75} /></span><div><p className="text-sm font-semibold">Saved in this local preview</p><p className="mt-1 text-xs leading-[18px]">No message was sent. A connected release would route this with your current context.</p></div></div>
          ) : (
            <>
              <div className="grid gap-1">{prompts.slice(0, 4).map((prompt) => <button key={prompt} type="button" onClick={() => setMessage(prompt)} className="min-h-11 rounded-[8px] px-2 text-left text-xs font-medium text-[var(--mw-muted)] outline-none hover:bg-[var(--mw-soft)] focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]">{prompt}</button>)}</div>
              <div className="mt-4 grid gap-3"><label className="sr-only" htmlFor="concierge-message">Ask WriteX concierge</label><input id="concierge-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What do you need help with?" className="mw-control min-w-0 w-full" /><button type="button" onClick={submit} className="mw-button-primary disabled:cursor-not-allowed disabled:opacity-45" disabled={!message.trim()}><Send className="h-[18px] w-[18px]" strokeWidth={1.75} />Continue</button></div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
