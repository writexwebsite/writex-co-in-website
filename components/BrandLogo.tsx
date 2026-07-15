import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
};

export function BrandLogo({
  className,
  markClassName
}: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mutedCopper",
        className
      )}
      aria-label="WriteX home"
    >
      <span
        className={cn(
          "flex h-10 w-36 items-center justify-center overflow-hidden",
          markClassName
        )}
      >
        <Image
          src="/images/original/writex-logo-cropped.png"
          alt="WriteX"
          width={1040}
          height={293}
          className="wx-brand-logo-image h-full w-full object-contain"
          priority
        />
      </span>
    </Link>
  );
}
