import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

export function ProductPageHeader({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mw-page-header">
      <div className="min-w-0">
        <p className="mw-eyebrow">{eyebrow}</p>
        <h1 className="mw-page-title mt-2 max-w-4xl">{title}</h1>
        <p className="mw-page-header-copy">{copy}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function ProductCard({
  children,
  className = "",
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "soft" | "ink" | "accent";
}) {
  const tones = {
    default: "mw-card bg-[var(--mw-surface)]",
    soft: "mw-card bg-[var(--mw-soft)]",
    ink: "mw-card mw-card-ink bg-[var(--mw-ink)] text-white",
    accent: "mw-card mw-card-accent bg-[var(--mw-primary)] text-white",
  };
  return <section className={`${tones[tone]} ${className}`}>{children}</section>;
}

export function ModuleLink({
  href,
  icon: Icon,
  label,
  copy,
  meta,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  copy: string;
  meta?: string;
}) {
  return (
    <Link href={href} className="mw-module-link group">
      <span className="mw-icon-tile"><Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="mw-object-title block text-[var(--mw-ink)]">{label}</span>
        <span className="mw-meta mt-1 block">{copy}</span>
      </span>
      {meta ? <span className="mw-meta hidden sm:block">{meta}</span> : null}
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mw-text-link inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold text-[var(--mw-primary)] outline-none hover:text-[var(--mw-primary-strong)]">
      {children}<ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

export function MetaPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "orange" | "violet" }) {
  const tones = {
    neutral: "bg-[#f2f4f7] text-[#475467]",
    green: "bg-[#eaf6f0] text-[#146044]",
    orange: "bg-[#fff3e8] text-[#8d421d]",
    violet: "bg-[var(--mw-primary-soft)] text-[#5a2bb3]",
  };
  return <span className={`mw-status-pill ${tones[tone]}`}>{children}</span>;
}
