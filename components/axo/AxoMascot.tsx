"use client";

import Image from "next/image";
import type { AxoState } from "@/lib/axo/types";
import { cn } from "@/lib/utils";

const mascotByState: Record<AxoState, string> = {
  idle: "/images/mascots/writex-mascot-peeking-portrait.webp",
  welcoming: "/images/mascots/writex-mascot-standing-wave.webp",
  attentive: "/images/mascots/writex-mascot-half.webp",
  curious: "/images/mascots/writex-mascot-peeking-wide.webp",
  thinking: "/images/mascots/writex-mascot-assistant-laptop.webp",
  guiding: "/images/mascots/writex-mascot-standing-wave.webp",
  reassuring: "/images/mascots/writex-mascot-sitting.webp",
  waiting: "/images/mascots/writex-mascot-sitting.webp",
  concerned: "/images/mascots/writex-mascot-peeking-portrait.webp",
  pleased: "/images/mascots/writex-mascot-standing-wave.webp",
  successful: "/images/mascots/writex-mascot-activated.webp",
  unavailable: "/images/mascots/writex-mascot-sitting.webp"
};

export function AxoMascot({ state = "idle", compact = false }: { state?: AxoState; compact?: boolean }) {
  return (
    <span
      className={cn("relative block shrink-0 overflow-visible", compact ? "h-12 w-12" : "h-[5.25rem] w-[5.25rem] sm:h-24 sm:w-24")}
      role="img"
      aria-label={`AXO is ${state}`}
    >
      <span aria-hidden className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,.22),rgba(236,72,153,.1)_48%,transparent_72%)] blur-md" />
      <span className={`wx-axo-emotion wx-axo-emotion-${state} absolute inset-0`}>
        <Image
          key={state}
          src={mascotByState[state]}
          alt=""
          fill
          loading={compact ? "lazy" : "eager"}
          sizes={compact ? "48px" : "96px"}
          className="object-contain object-center drop-shadow-[0_10px_14px_rgba(49,46,129,.24)]"
        />
      </span>
    </span>
  );
}
