import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoWithTrademark } from "./LogoWithTrademark";

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  priority?: boolean;
  sizes?: string;
};

export function BrandLogo({
  className,
  markClassName,
  priority = true,
  sizes
}: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mutedCopper",
        className
      )}
      aria-label="WriteX trademark home"
    >
      <LogoWithTrademark
        className={cn("w-36", markClassName)}
        priority={priority}
        sizes={sizes}
      />
    </Link>
  );
}

