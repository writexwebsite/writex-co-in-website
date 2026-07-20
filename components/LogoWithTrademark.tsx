import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoWithTrademarkProps = {
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function LogoWithTrademark({
  className,
  priority = false,
  sizes = "(min-width: 1280px) 360px, (min-width: 640px) 288px, 176px"
}: LogoWithTrademarkProps) {
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-visible leading-none",
        className
      )}
    >
      <Image
        src="/images/original/writex-logo-cropped.png"
        alt="WriteX"
        width={1040}
        height={293}
        sizes={sizes}
        className="wx-brand-logo-image block h-auto w-full object-contain"
        priority={priority}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[calc(100%+0.1rem)] top-0 text-[0.38rem] font-semibold leading-none text-wxIndigo700"
      >
        {"\u2122"}
      </span>
    </span>
  );
}

