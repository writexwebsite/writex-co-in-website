import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  FileCheck2,
  MessageSquareWarning,
  ReceiptText
} from "lucide-react";

const actions = [
  {
    title: "Verify Representative",
    description: "Check an official WriteX representative by mobile number.",
    href: "#verify-representative",
    icon: BadgeCheck,
    status: "Live"
  },
  {
    title: "Verify Invoice",
    description: "Confirm an invoice against the official billing system.",
    href: "#verify-invoice",
    icon: ReceiptText,
    status: "Connecting"
  },
  {
    title: "Check Payment Status",
    description: "Review the last verified status recorded for an invoice.",
    href: "#check-payment-status",
    icon: CircleDollarSign,
    status: "Connecting"
  },
  {
    title: "Verify Enquiry",
    description: "Confirm whether an enquiry reference is recognised.",
    href: "#verify-enquiry",
    icon: FileCheck2,
    status: "Connecting"
  },
  {
    title: "Report Suspicious Activity",
    description: "Send suspicious details and private evidence to WriteX.",
    href: "/trust-centre/report",
    icon: MessageSquareWarning,
    status: "Secure report"
  },
  {
    title: "Official Communication Channels",
    description: "Use only the website and email addresses published by WriteX.",
    href: "#official-channels",
    icon: Building2,
    status: "Published"
  }
];

export function TrustActionGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.title}
            href={action.href}
            className="group flex min-h-44 flex-col justify-between rounded-md border border-sageBorder bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-wxViolet700/35 hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-wxSurfaceSoft text-wxViolet700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-xs font-semibold text-wxIndigo500">
                {action.status}
              </span>
            </div>
            <div className="mt-5">
              <h3 className="text-lg font-semibold text-wxIndigo900">
                {action.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-wxIndigo500">
                {action.description}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
