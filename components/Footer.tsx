import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck
} from "lucide-react";
import {
  getPhoneUrl,
  getWhatsAppUrl,
  siteConfig
} from "@/lib/site";
import { getCompanyFooterNavigation } from "@/lib/public-navigation";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { BrandLogo } from "./BrandLogo";
import { SpectrumBackground } from "./visual/SpectrumBackground";
import { HolidayFooterDecoration } from "./holiday/HolidayDecorations";

type FooterLink = { label: string; href: string };

const services: FooterLink[] = [
  { label: "Coursework & Brief Support", href: "/assignment-support" },
  { label: "Dissertation & Thesis Support", href: "/dissertation-thesis-support" },
  { label: "Academic Editing & Proofreading", href: "/editing-proofreading" },
  { label: "SOP & Admissions Support", href: "/sop-admissions-writing" },
  { label: "Originality & AI Review", href: "/plagiarism-ai-review" },
  { label: "Formatting & Referencing", href: "/formatting-referencing" }
];

const resources: FooterLink[] = [
  { label: "Pricing & Quote", href: "/pricing" },
  { label: "Help Centre", href: "/help" },
  { label: "Samples", href: "/samples" },
  { label: "Reviews", href: "/reviews" },
  { label: "Free Tools", href: "/tools" }
];

const trustPoints = [
  "Scope reviewed before quoting",
  "Confidential file handling",
  "QA-led academic review"
];

function LinkList({ items }: { items: FooterLink[] }) {
  return (
    <ul className="mt-3 grid gap-2 text-sm leading-5 text-wxIndigo500">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="transition hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wxViolet700"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FooterGroup({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <>
      <details className="group border-b border-wxViolet700/10 py-2.5 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-wxIndigo900">
          {title}
          <ChevronDown
            className="h-4 w-4 text-wxViolet700 transition group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="pb-3">
          <LinkList items={items} />
        </div>
      </details>
      <nav className="hidden lg:block" aria-label={`${title} footer navigation`}>
        <h2 className="text-sm font-semibold text-wxIndigo900">{title}</h2>
        <LinkList items={items} />
      </nav>
    </>
  );
}

export function Footer({ showCareers }: { showCareers: boolean }) {
  const phones = [siteConfig.primaryPhone, ...siteConfig.supportPhones];
  const emails = [siteConfig.email, siteConfig.supportEmail];
  const company = getCompanyFooterNavigation(showCareers);

  return (
    <footer className="relative overflow-hidden border-t border-wxViolet700/10 text-wxIndigo900">
      <HolidayFooterDecoration />
      <SpectrumBackground
        variant="section"
        overlayStrength="light"
        intensity={0.52}
        animate
        className="pt-10 sm:pt-12"
      >
        <div className="premium-container">
          <div className="grid gap-8 border-b border-wxViolet700/10 pb-8 md:grid-cols-[0.9fr_1.1fr] xl:grid-cols-[1.05fr_1.35fr_1.25fr] xl:gap-10">
            <section aria-label="WriteX overview">
              <BrandLogo markClassName="w-40" sizes="160px" />
              <p className="mt-4 max-w-sm text-sm leading-6 text-wxIndigo500">
                Premium Academic Support &amp; Review for university students worldwide.
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-wxIndigo700">
                {trustPoints.map((point) => (
                  <li key={point} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-wxGreen500" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand-spectrum px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  WhatsApp
                </a>
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxIndigo700 shadow-sm transition hover:border-wxViolet700 hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  Email
                </a>
              </div>
            </section>

            <section aria-label="Explore WriteX" className="md:order-3 md:col-span-2 xl:order-none xl:col-span-1">
              <div className="lg:grid lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:gap-6">
                <FooterGroup title="Services" items={services} />
                <FooterGroup title="Resources" items={resources} />
                <FooterGroup title="Company" items={company} />
              </div>
            </section>

            <section aria-label="Contact WriteX" className="md:order-2 xl:order-none">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-wxIndigo900">Contact WriteX</h2>
                  <p className="mt-1 text-xs leading-5 text-wxIndigo500">
                    Verified channels for enquiries, briefs, and support.
                  </p>
                </div>
                <Link
                  href="/trust-centre"
                  className="shrink-0 text-xs font-semibold text-wxViolet700 underline decoration-wxViolet700/25 underline-offset-4"
                >
                  Verify details
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6">
                <div className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-wxBlue500" aria-hidden />
                  <div className="text-sm leading-5 text-wxIndigo500">
                    <h3 className="font-semibold text-wxIndigo700">Phone &amp; WhatsApp</h3>
                    {phones.map((phone) => (
                      <a
                        key={phone}
                        href={getPhoneUrl(phone)}
                        className="block underline decoration-wxViolet700/20 underline-offset-4 hover:text-wxViolet700"
                      >
                        {phone}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-wxPink500" aria-hidden />
                  <div className="min-w-0 text-sm leading-5 text-wxIndigo500">
                    <h3 className="font-semibold text-wxIndigo700">Email</h3>
                    {emails.map((email) => (
                      <a
                        key={email}
                        href={`mailto:${email}`}
                        className="block break-all underline decoration-wxViolet700/20 underline-offset-4 hover:text-wxViolet700"
                      >
                        {email}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-wxViolet700" aria-hidden />
                  <div className="text-sm leading-5 text-wxIndigo500">
                    <h3 className="font-semibold text-wxIndigo700">Support hours</h3>
                    Monday to Saturday
                    <br />
                    10:00 AM - 8:00 PM IST
                  </div>
                </div>

                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-wxOrange500" aria-hidden />
                  <div className="text-sm leading-5 text-wxIndigo500">
                    <h3 className="font-semibold text-wxIndigo700">Office</h3>
                    <p>
                      {siteConfig.address}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex max-w-4xl gap-3 text-xs leading-5 text-wxIndigo500">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-wxGreen500" aria-hidden />
              <p>
                WriteX provides academic support, research guidance, editing, proofreading,
                formatting, originality review, and learning-focused assistance. Students
                remain responsible for following their institution&apos;s academic integrity policies.
              </p>
            </div>

            <div className="grid gap-3 text-xs text-wxIndigo500 lg:justify-items-end">
              <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
                <Link href="/privacy" className="hover:text-wxViolet700">Privacy</Link>
                <Link href="/terms" className="hover:text-wxViolet700">Terms</Link>
                <Link href="/academic-integrity" className="hover:text-wxViolet700">Academic Integrity</Link>
              </nav>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p>&copy; 2026 WriteX. All rights reserved.</p>
                <p className="inline-flex items-center gap-1.5 font-semibold text-wxIndigo700">
                  <LockKeyhole className="h-4 w-4 text-wxGreen500" aria-hidden />
                  Secure &amp; confidential
                </p>
              </div>
            </div>
          </div>
        </div>
      </SpectrumBackground>
    </footer>
  );
}
