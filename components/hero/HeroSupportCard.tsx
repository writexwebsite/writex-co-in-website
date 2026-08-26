export type HeroSupportCardData = {
  title: string;
  description: string;
};

type HeroSupportCardProps = HeroSupportCardData & {
  index?: number;
};

export function HeroSupportCard({
  title,
  description,
  index
}: HeroSupportCardProps) {
  return (
    <article
      data-hero-support-card
      className="flex min-h-[6.5rem] flex-col rounded-md border border-wxBorder bg-white/88 p-4 shadow-sm backdrop-blur sm:p-5"
    >
      <div className="flex items-start gap-3">
        {typeof index === "number" ? (
          <span
            aria-hidden
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-wxViolet700/10 text-[11px] font-bold text-wxViolet700"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-6 text-wxIndigo900">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-wxIndigo500">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}
