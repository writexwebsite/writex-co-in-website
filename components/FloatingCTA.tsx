import Link from "next/link";
import { FileText } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/site";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

export function FloatingCTA() {
  return (
    <div className="fixed bottom-4 right-4 z-40 hidden flex-col gap-2 lg:flex">
      <a
        href={getWhatsAppUrl()}
        target="_blank"
        rel="noreferrer"
        className="wx-gradient-action inline-flex h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white shadow-lift transition hover:-translate-y-0.5"
      >
        <WhatsAppIcon className="h-4 w-4" />
        WhatsApp
      </a>
      <Link
        href="/pricing#quote"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-sageBorder bg-white px-4 text-sm font-semibold text-charcoalInk shadow-lift transition hover:-translate-y-0.5 hover:border-mutedCopper"
      >
        <FileText className="h-4 w-4" aria-hidden />
        Get Quote
      </Link>
    </div>
  );
}
