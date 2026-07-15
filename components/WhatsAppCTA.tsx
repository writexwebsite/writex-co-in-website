import { getWhatsAppUrl } from "@/lib/site";
import { CTAButton } from "./CTAButton";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

type WhatsAppCTAProps = {
  label?: string;
  message?: string;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "outline";
};

export function WhatsAppCTA({
  label = "Send Brief on WhatsApp",
  message,
  className,
  variant = "primary"
}: WhatsAppCTAProps) {
  return (
    <CTAButton
      href={getWhatsAppUrl(message)}
      variant={variant}
      icon={WhatsAppIcon}
      className={className}
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </CTAButton>
  );
}
