import Link from "next/link";
import { ArrowRight, FileSearch, ShieldCheck } from "lucide-react";

type SampleCardProps = {
  title: string;
  description: string;
  category: string;
  reviewed: string;
  changed: string;
  learn: string;
  tags: string[];
  ctaHref?: string;
};

export function SampleCard({
  title,
  description,
  category,
  reviewed,
  changed,
  learn,
  tags,
  ctaHref = "/samples"
}: SampleCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-sageBorder bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-mutedCopper hover:shadow-soft">
      <div className="border-b border-sageBorder bg-warmIvory px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-sm border border-softTeal/20 bg-softTeal/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-softTeal">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Demonstration sample
          </span>
          <FileSearch className="h-5 w-5 text-mutedCopper" aria-hidden />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold leading-snug text-charcoalInk">{title}</h3>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">{category}</p>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-softTeal">
            What it shows
          </p>
          <p className="mt-2 text-sm leading-7 text-slateText">{description}</p>
        </div>

        <dl className="mt-5 grid gap-4 text-sm leading-6 text-wxIndigo500">
          <div>
            <dt className="font-semibold text-wxIndigo700">What was reviewed</dt>
            <dd className="mt-1">{reviewed}</dd>
          </div>
          <div>
            <dt className="font-semibold text-wxIndigo700">What changed</dt>
            <dd className="mt-1">{changed}</dd>
          </div>
          <div>
            <dt className="font-semibold text-wxIndigo700">What you can learn</dt>
            <dd className="mt-1">{learn}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-sm bg-paleSage px-2.5 py-1 text-xs font-semibold text-slateText"
            >
              {tag}
            </span>
          ))}
        </div>

        <Link
          href={ctaHref}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-softTeal transition hover:text-charcoalInk"
        >
          <span>Explore relevant service</span>
          <ArrowRight
            className="h-4 w-4 transition duration-300 group-hover:translate-x-1"
            aria-hidden
          />
        </Link>
      </div>
    </article>
  );
}
