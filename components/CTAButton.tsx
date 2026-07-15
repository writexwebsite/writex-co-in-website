import Link from "next/link";
import type { ComponentType, AnchorHTMLAttributes } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CTAButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: "primary" | "secondary" | "dark" | "outline";
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  showArrow?: boolean;
};

const styles = {
  primary:
    "wx-gradient-action text-white hover:brightness-[1.03] focus-visible:outline-wxViolet700",
  secondary:
    "border border-wxViolet700/30 bg-white text-wxIndigo900 hover:border-wxViolet700 hover:bg-wxSurfaceSoft focus-visible:outline-wxViolet700",
  dark: "bg-wxIndigo900 text-white hover:bg-wxIndigo700 focus-visible:outline-wxIndigo900",
  outline:
    "border border-wxBorder bg-white text-wxIndigo900 hover:border-wxViolet700 hover:bg-wxSurfaceSoft focus-visible:outline-wxViolet700"
};

export function CTAButton({
  href,
  variant = "primary",
  className,
  children,
  icon: Icon,
  showArrow = true,
  ...props
}: CTAButtonProps) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  const classes = cn(
    "wx-cta-glow inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-base",
    styles[variant],
    className
  );

  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      <span>{children}</span>
      {showArrow ? <ArrowRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
    </>
  );

  if (isExternal) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {content}
    </Link>
  );
}
