/* eslint-disable @next/next/no-img-element */
import type { AxoStoryVariant } from "@/lib/auth/axoStoryConfig";

type AxoStaticFallbackProps = {
  priority?: boolean;
  className?: string;
  variant?: AxoStoryVariant;
};

export function AxoStaticFallback({ priority = false, className = "" }: AxoStaticFallbackProps) {
  return (
    <div aria-hidden className={`relative flex h-full w-full items-end justify-end ${className}`}>
      <picture className="flex h-full w-full items-end justify-end">
        <source
          media="(min-width: 1024px)"
          srcSet="/images/auth/axo/axo-login-production.webp"
        />
        <source
          media="(min-width: 768px)"
          srcSet="/images/auth/axo/axo-login-tablet.webp"
        />
        <img
          src="/images/auth/axo/axo-login-mobile.webp"
          alt=""
          width={420}
          height={542}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="wx-auth-axo-art h-full w-auto max-w-none select-none object-contain object-right-bottom"
        />
      </picture>
    </div>
  );
}

export function AxoCompactFallback() {
  return (
    <div aria-hidden className="relative h-full w-full overflow-hidden bg-hero-spectrum">
      <img
        src="/images/auth/axo/axo-login-mobile.webp"
        alt=""
        width={420}
        height={542}
        loading="lazy"
        decoding="async"
        className="wx-auth-axo-art wx-axo-entrance h-full w-full object-contain object-center"
      />
    </div>
  );
}
