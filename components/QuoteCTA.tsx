import type { AnchorHTMLAttributes } from "react";
import { FileText } from "lucide-react";
import { CTAButton } from "./CTAButton";

type QuoteCTAProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  label?: string;
  href?: string;
  variant?: "primary" | "secondary" | "dark" | "outline";
  showArrow?: boolean;
};

export function QuoteCTA({
  label = "Get Quote",
  href = "/pricing#quote",
  variant = "primary",
  showArrow = true,
  ...props
}: QuoteCTAProps) {
  return (
    <CTAButton
      href={href}
      variant={variant}
      icon={FileText}
      showArrow={showArrow}
      {...props}
    >
      {label}
    </CTAButton>
  );
}
