import Link from "next/link";
import { ChevronDown, Clock3, LockKeyhole, Mail, MapPin, Phone } from "lucide-react";
import { getOfficeMapUrl, getPhoneUrl, getWhatsAppUrl, siteConfig } from "@/lib/site";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { BrandLogo } from "./BrandLogo";
import { SpectrumBackground } from "./visual/SpectrumBackground";

type FooterLink = { label: string; href: string };

const services: FooterLink[] = [
  { label: "Coursework & Brief Support", href: "/assignment-support" },
  { label: "Dissertation & Thesis Support", href: "/dissertation-thesis-support" },
  { label: "Academic Editing & Proofreading", href: "/editing-proofreading" },
  { label: "SOP & Admissions Support", href: "/sop-admissions-writing" },
  { label: "Originality & AI Review", href: "/plagiarism-ai-review" },
  { label: "Formatting & Referencing Support", href: "/formatting-referencing" }
];

const resources: FooterLink[] = [
  { label: "Help Centre", href: "/help" },
  { label: "Samples", href: "/samples" },
  { label: "Reviews", href: "/reviews" }
];

const company: FooterLink[] = [
  { label: "About Us", href: "/about-us" },
  { label: "Contact Us", href: "/contact" },
  { label: "Client Login", href: "/client-login" },
  { label: "Employee Login", href: "/employee-login" }
];

function LinkList({ items }: { items: FooterLink[] }) {
  return <ul className="mt-4 grid gap-2.5 text-sm text-wxIndigo500">{items.map((item) => <li key={item.href}><Link href={item.href} className="transition hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wxViolet700">{item.label}</Link></li>)}</ul>;
}

function FooterGroup({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <>
      <details className="group border-b border-wxViolet700/10 py-3 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold text-wxIndigo900">{title}<ChevronDown className="h-4 w-4 text-wxViolet700 transition group-open:rotate-180" aria-hidden /></summary>
        <LinkList items={items} />
      </details>
      <nav className="hidden lg:block" aria-label={`${title} footer navigation`}><h2 className="text-sm font-semibold text-wxIndigo900">{title}</h2><LinkList items={items} /></nav>
    </>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-wxViolet700/10 text-wxIndigo900">
      <SpectrumBackground variant="section" overlayStrength="light" intensity={0.52} animate className="pt-14 sm:pt-16">
        <div className="premium-container">
          <div className="grid gap-9 lg:grid-cols-[1.35fr_1fr_0.85fr_0.85fr_1.15fr]">
            <section aria-label="WriteX overview">
              <BrandLogo markClassName="h-12 w-44" />
              <p className="mt-4 max-w-xs text-sm leading-6 text-wxIndigo500">Academic Support &amp; Review for university students worldwide.</p>
              <p className="mt-2 text-sm font-semibold text-wxIndigo700">Confidential. Professional. QA-led.</p>
              <div className="mt-5 flex gap-2">
                <a href={getWhatsAppUrl()} target="_blank" rel="noreferrer" aria-label="WriteX on WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-lg border border-wxViolet700/10 bg-white text-wxViolet700 shadow-sm transition hover:-translate-y-0.5 hover:border-wxViolet700"><WhatsAppIcon className="h-5 w-5" /></a>
                <a href={`mailto:${siteConfig.email}`} aria-label="Email WriteX" className="flex h-11 w-11 items-center justify-center rounded-lg border border-wxViolet700/10 bg-white text-wxBlue500 shadow-sm transition hover:-translate-y-0.5 hover:border-wxBlue500"><Mail className="h-4 w-4" /></a>
              </div>
            </section>

            <FooterGroup title="Services" items={services} />
            <FooterGroup title="Resources" items={resources} />
            <FooterGroup title="Company" items={company} />

            <section aria-label="Contact WriteX">
              <h2 className="text-sm font-semibold text-wxIndigo900">Contact</h2>
              <ul className="mt-4 grid gap-4 text-sm leading-6 text-wxIndigo500">
                <li className="flex gap-3"><WhatsAppIcon className="mt-1 h-4 w-4 shrink-0 text-wxViolet700" /><span><strong className="block text-wxIndigo700">WhatsApp</strong><a href={getWhatsAppUrl()} target="_blank" rel="noreferrer" className="underline decoration-wxViolet700/25 underline-offset-4 hover:text-wxViolet700">{siteConfig.whatsappDisplay}</a></span></li>
                <li className="flex gap-3"><Phone className="mt-1 h-4 w-4 shrink-0 text-wxBlue500" aria-hidden /><span><strong className="block text-wxIndigo700">Phone numbers</strong>{[siteConfig.primaryPhone, ...siteConfig.supportPhones].map((phone) => <a key={phone} href={getPhoneUrl(phone)} className="block underline decoration-wxViolet700/20 underline-offset-4 hover:text-wxViolet700">{phone}</a>)}</span></li>
                <li className="flex gap-3"><Mail className="mt-1 h-4 w-4 shrink-0 text-wxPink500" aria-hidden /><span><strong className="block text-wxIndigo700">Email</strong>{[siteConfig.email, siteConfig.supportEmail].map((email) => <a key={email} href={`mailto:${email}`} className="block break-all underline decoration-wxViolet700/20 underline-offset-4 hover:text-wxViolet700">{email}</a>)}</span></li>
                <li className="flex gap-3"><Clock3 className="mt-1 h-4 w-4 shrink-0 text-wxBlue500" aria-hidden /><span><strong className="block text-wxIndigo700">Hours</strong>Monday to Saturday<br />10:00 AM - 8:00 PM IST</span></li>
                <li className="flex gap-3"><MapPin className="mt-1 h-4 w-4 shrink-0 text-wxOrange500" aria-hidden /><span><strong className="block text-wxIndigo700">Location</strong><a href={getOfficeMapUrl()} target="_blank" rel="noreferrer" className="underline decoration-wxViolet700/20 underline-offset-4 hover:text-wxViolet700">Kolkata, India</a></span></li>
              </ul>
            </section>
          </div>

          <p className="mt-10 border-t border-wxViolet700/10 pt-5 text-xs leading-6 text-wxIndigo500">WriteX provides academic support, research guidance, editing, proofreading, formatting, originality review, and learning-focused assistance. Students remain responsible for following their institution&apos;s academic integrity policies.</p>
          <div className="mt-5 flex flex-col gap-4 border-t border-wxViolet700/10 py-5 text-xs text-wxIndigo500 md:flex-row md:items-center md:justify-between">
            <p>&copy; 2026 WriteX. All rights reserved.</p>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms &amp; Conditions</Link><Link href="/academic-integrity">Academic Integrity</Link></nav>
            <p className="inline-flex items-center gap-2 font-semibold text-wxIndigo700"><LockKeyhole className="h-4 w-4 text-wxGreen500" aria-hidden />Secure &amp; Confidential</p>
          </div>
        </div>
      </SpectrumBackground>
    </footer>
  );
}
