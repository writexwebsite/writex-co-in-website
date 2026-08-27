"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  CalendarCheck2,
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  FileText,
  Filter,
  GraduationCap,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Target,
} from "lucide-react";
import type { MyWritexApplication, MyWritexCareer, MyWritexCv, MyWritexJob } from "@/lib/my-writex/types";
import { MetaPill, ProductPageHeader } from "@/components/my-writex/ProductUI";
import { formatDate } from "@/components/my-writex/MyWritexPrimitives";

export function CareerHub({ career, preferredName }: { career: MyWritexCareer; preferredName: string }) {
  const interview = career.applications.find((item) => item.stage === "Interview");
  const currentCv = career.cvs[0];

  return (
    <div className="mw-page-stack max-w-[820px]">
      <ProductPageHeader eyebrow="Career" title={`Your next move, ${preferredName}.`} copy="Relevant roles, focused CVs, applications and interview preparation—all using the same career direction." action={<Link href="/my-writex/career/jobs" className="mw-button-primary"><Search className="h-[18px] w-[18px]" strokeWidth={1.75} />Find Roles</Link>} />

      <section aria-labelledby="career-jobs-title">
        <div className="mb-4 flex items-center justify-between gap-4"><h2 id="career-jobs-title" className="mw-section-title">Jobs for You</h2><span className="mw-status-pill bg-[var(--mw-primary-soft)] text-[var(--mw-primary)]">Updated today</span></div>
        <Link href="/my-writex/career/jobs" className="mw-list-surface mw-list-row min-h-[92px] outline-none hover:bg-[rgba(17,24,39,0.025)] focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]">
          <BriefcaseBusiness className="h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} />
          <span className="min-w-0 flex-1"><span className="mw-object-title block">{career.jobs[0].role}</span><span className="mw-meta mt-1 block">{career.jobs[0].employer} · {career.jobs[0].location}</span><span className="mw-meta mt-1 block">{career.jobs.length} relevant fixture opportunities</span></span>
          <ChevronRight className="h-4 w-4 text-[var(--mw-tertiary)]" strokeWidth={1.75} />
        </Link>
      </section>

      <section aria-labelledby="career-system-title">
        <h2 id="career-system-title" className="mw-section-title mb-4">Your Career</h2>
        <div className="mw-list-surface">
          <CareerRow href="/my-writex/career/cv" icon={FileText} title="Your CV" copy={`${currentCv.name} · ${currentCv.status}`} meta={`${career.cvs.length} versions`} />
          <CareerRow href="/my-writex/career/applications" icon={ClipboardCheck} title="Applications" copy="Keep every next step visible" meta={`${career.applications.length} tracked`} />
          {interview ? <CareerRow href="/my-writex/career/interview" icon={MessageCircle} title={`Interview · ${interview.employer}`} copy={career.interview.focus} meta="Prepare" /> : null}
          <CareerRow href="/my-writex/career/profile" icon={Target} title="Career Profile" copy="Target roles, locations and strengths" meta={`${career.profile.completeness}% complete`} />
          <CareerRow href="/my-writex/career/consultation" icon={CalendarCheck2} title="Career Consultation" copy="Bring one question into focus" meta="Local shell" />
        </div>
      </section>
    </div>
  );
}

export function JobRadar({ jobs }: { jobs: MyWritexJob[] }) {
  const [query, setQuery] = useState("");
  const [arrangement, setArrangement] = useState("All work modes");
  const [employmentType, setEmploymentType] = useState("All job types");
  const [category, setCategory] = useState("All categories");
  const [saved, setSaved] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState(jobs[0]?.id || "");
  const categories = useMemo(() => ["All categories", ...Array.from(new Set(jobs.map((job) => job.category)))], [jobs]);
  const filtered = useMemo(() => jobs.filter((job) => {
    const matchesQuery = `${job.role} ${job.employer} ${job.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (arrangement === "All work modes" || job.arrangement === arrangement) && (employmentType === "All job types" || job.employmentType === employmentType) && (category === "All categories" || job.category === category);
  }), [arrangement, category, employmentType, jobs, query]);
  const selectedJob = filtered.find((job) => job.id === selectedId) || filtered[0];

  return (
    <div className="mw-page-stack">
      <ProductPageHeader eyebrow="Career · Job Radar" title="Relevant roles, with less noise." copy="Search fixture opportunities, understand why they match, and save a shortlist locally." action={<Link href="/my-writex/career" className="mw-button-secondary"><ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />Career Home</Link>} />

      <section aria-label="Job filters" className="mw-card mw-card-mobile-pad p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_176px_192px_192px]">
          <label className="relative"><span className="sr-only">Search roles</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mw-tertiary)]" strokeWidth={1.75} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roles, employers or skills" className="mw-control w-full pl-10" /></label>
          <label><span className="sr-only">Work mode</span><select value={arrangement} onChange={(event) => setArrangement(event.target.value)} className="mw-control w-full"><option>All work modes</option><option>Hybrid</option><option>Remote</option><option>On-site</option></select></label>
          <label><span className="sr-only">Job type</span><select value={employmentType} onChange={(event) => setEmploymentType(event.target.value)} className="mw-control w-full"><option>All job types</option><option>Part time</option><option>Internship</option><option>Graduate scheme</option><option>Full time</option></select></label>
          <label><span className="sr-only">Category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="mw-control w-full">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </section>

      <div className="mw-jobs-layout">
        <section aria-label="Job results">
          <div className="mb-3 flex items-center justify-between"><p className="mw-meta">{filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"}</p><p className="mw-meta">Fixture source</p></div>
          <div className="mw-list-surface">
            {filtered.map((job) => { const isSaved = saved.includes(job.id); return (
              <article key={job.id} onMouseEnter={() => setSelectedId(job.id)} className={`relative min-h-[92px] border-b border-[var(--mw-line)] p-4 last:border-b-0 ${selectedJob?.id === job.id ? "bg-[var(--mw-primary-soft)]" : "hover:bg-[rgba(17,24,39,0.025)]"}`}>
                <div className="flex items-start gap-3"><Link href={`/my-writex/career/jobs/${job.id}`} onFocus={() => setSelectedId(job.id)} className="min-w-0 flex-1 rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]"><h2 className="text-[15px] font-semibold leading-[22px]">{job.role}</h2><p className="mw-secondary mt-1">{job.employer}</p><p className="mw-meta mt-2">{job.location} · {job.employmentType}</p></Link><button type="button" onClick={() => setSaved((items) => isSaved ? items.filter((id) => id !== job.id) : [...items, job.id])} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)] ${isSaved ? "bg-white text-[var(--mw-primary)]" : "text-[var(--mw-muted)]"}`} aria-label={`${isSaved ? "Remove" : "Save"} ${job.role}`}><Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} strokeWidth={1.75} /></button></div>
              </article>
            ); })}
            {!filtered.length ? <div className="p-8 text-center"><Filter className="mx-auto h-6 w-6 text-[var(--mw-primary)]" strokeWidth={1.75} /><h2 className="mw-section-title mt-4">No matching roles</h2><button onClick={() => { setQuery(""); setArrangement("All work modes"); setEmploymentType("All job types"); setCategory("All categories"); }} className="mw-button-secondary mt-5">Clear filters</button></div> : null}
          </div>
        </section>

        {selectedJob ? <aside className="mw-card hidden p-8 xl:block" aria-label="Selected job detail"><div className="flex flex-wrap gap-2"><MetaPill tone="violet">{selectedJob.category}</MetaPill><MetaPill>{selectedJob.arrangement}</MetaPill></div><h2 className="mt-5 text-2xl font-semibold leading-8">{selectedJob.role}</h2><p className="mw-body mt-2 text-[var(--mw-muted)]">{selectedJob.employer}</p><div className="mw-meta mt-4 flex flex-wrap gap-4"><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" strokeWidth={1.75} />{selectedJob.location}</span><span>{selectedJob.employmentType}</span></div><p className="mw-secondary mt-6">{selectedJob.summary}</p><div className="mt-6 flex flex-wrap gap-3"><Link href={`/my-writex/career/jobs/${selectedJob.id}`} className="mw-button-primary">View & Apply <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} /></Link><button type="button" onClick={() => setSaved((items) => items.includes(selectedJob.id) ? items.filter((id) => id !== selectedJob.id) : [...items, selectedJob.id])} className="mw-button-secondary">Save</button></div><div className="mt-8 border-t border-[var(--mw-line)] pt-6"><p className="mw-eyebrow">Why it matches</p><p className="mw-secondary mt-2">{selectedJob.matchReason}</p><p className="mw-meta mt-5">{selectedJob.source} · checked {selectedJob.lastChecked}</p></div></aside> : null}
      </div>
    </div>
  );
}

export function JobDetail({ job }: { job: MyWritexJob }) {
  const [saved, setSaved] = useState(false);
  const [started, setStarted] = useState(false);
  return (
    <div className="mw-page-stack max-w-[980px]">
      <Link href="/my-writex/career/jobs" className="mw-text-link inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--mw-primary)]"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} />Back to Job Radar</Link>
      <article className="mw-card mw-card-mobile-pad p-8">
        <div className="flex flex-wrap gap-2"><MetaPill tone="violet">{job.category}</MetaPill><MetaPill>{job.arrangement}</MetaPill><MetaPill>{job.employmentType}</MetaPill></div>
        <h1 className="mt-5 text-2xl font-semibold leading-8">{job.role}</h1><p className="mw-body mt-2 text-[var(--mw-muted)]">{job.employer}</p>
        <div className="mw-meta mt-4 flex flex-wrap gap-4"><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" strokeWidth={1.75} />{job.location}</span><span>Posted {formatDate(job.postedAt)}</span></div>
        <p className="mw-secondary mt-6 max-w-[720px]">{job.summary}</p>
        <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => setStarted(true)} className="mw-button-primary"><FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />Apply</button><button onClick={() => setSaved((value) => !value)} className="mw-button-secondary"><Bookmark className={`h-[18px] w-[18px] ${saved ? "fill-current text-[var(--mw-primary)]" : ""}`} strokeWidth={1.75} />{saved ? "Saved" : "Save"}</button><Link href="/my-writex/career/cv" className="mw-button-secondary">Tailor CV</Link></div>
        {started ? <div role="status" className="mt-5 rounded-[12px] bg-[#eaf6f0] p-4 text-sm font-medium text-[#155f43]">Application preparation is staged locally. No employer submission occurred.</div> : null}
        <div className="mt-8 border-t border-[var(--mw-line)] pt-6"><p className="mw-eyebrow">Why it matches</p><p className="mw-secondary mt-2">{job.matchReason}</p><div className="mt-4 flex flex-wrap gap-2">{job.skills.map((skill) => <MetaPill key={skill}>{skill}</MetaPill>)}</div><p className="mw-meta mt-5">Source: {job.source} · last checked {job.lastChecked}. Verify externally before applying.</p></div>
      </article>
    </div>
  );
}

export function CvStudio({ initialCvs }: { initialCvs: MyWritexCv[] }) {
  const [cvs, setCvs] = useState(initialCvs);
  const [selected, setSelected] = useState(initialCvs[0].id);
  const [creating, setCreating] = useState(false);
  const current = cvs.find((cv) => cv.id === selected) || cvs[0];
  function duplicate() { const copy = { ...current, id: `local-${crypto.randomUUID()}`, name: `${current.name} — Copy`, status: "Draft" as const, updatedAt: "2026-08-27" }; setCvs((items) => [...items, copy]); setSelected(copy.id); }
  function rename() { setCvs((items) => items.map((cv) => cv.id === current.id ? { ...cv, name: cv.name.includes("Role Focus") ? cv.name : `${cv.name} — Role Focus`, updatedAt: "2026-08-27" } : cv)); }
  function createCv() { const copy = { ...initialCvs[0], id: `local-${crypto.randomUUID()}`, name: "New role-focused CV", focus: "Add a target role", status: "Draft" as const, updatedAt: "2026-08-27" }; setCvs((items) => [...items, copy]); setSelected(copy.id); setCreating(false); }

  return (
    <div className="mw-page-stack">
      <ProductPageHeader eyebrow="Career · CV Studio" title="Your CVs" copy="Create and compare focused CV versions in a safe local workspace." action={<button onClick={() => setCreating(true)} className="mw-button-primary"><Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />Create CV</button>} />
      {creating ? <section className="mw-card mw-card-mobile-pad flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><p className="mw-object-title">Create a local CV draft?</p><p className="mw-meta mt-1">Your career profile supplies the starting context.</p></div><div className="flex gap-2"><button onClick={() => setCreating(false)} className="mw-button-secondary">Cancel</button><button onClick={createCv} className="mw-button-primary">Create Draft</button></div></section> : null}
      <section className="mw-cv-grid" aria-label="CV versions">
        {cvs.map((cv) => (
          <article key={cv.id} className={`rounded-[14px] border bg-white p-3 ${selected === cv.id ? "border-[var(--mw-primary)]" : "border-[var(--mw-line)]"}`}>
            <button type="button" onClick={() => setSelected(cv.id)} className="block w-full rounded-[8px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]" aria-label={`Open ${cv.name}`}>
              <div className="mw-cv-preview"><p className="text-xl font-semibold">Rahul Sharma</p><p className="mw-meta mt-1 text-[var(--mw-primary)]">Graduate Business Analyst</p><div className="mt-6 border-t border-[var(--mw-line-strong)] pt-4"><p className="mw-meta font-medium text-[var(--mw-ink)]">PROFILE</p><p className="mt-2 text-[11px] leading-[18px] text-[var(--mw-muted)]">Research, structured problem-solving and stakeholder communication experience.</p></div><div className="mt-5"><p className="mw-meta font-medium text-[var(--mw-ink)]">EXPERIENCE</p><div className="mt-2 grid gap-2">{[1,2,3].map((item) => <span key={item} className="h-2 rounded bg-[var(--mw-soft)]" />)}</div></div></div>
              <div className="p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="mw-object-title truncate">{cv.name}</h2><p className="mw-meta mt-1 truncate">{cv.focus}</p></div><MetaPill tone={cv.status === "Ready" ? "green" : cv.status === "Needs review" ? "orange" : "neutral"}>{cv.status}</MetaPill></div><p className="mw-meta mt-3">Updated {formatDate(cv.updatedAt)}</p></div>
            </button>
            {selected === cv.id ? <div className="flex gap-2 border-t border-[var(--mw-line)] p-3"><button onClick={rename} className="mw-button-secondary flex-1 px-3">Rename</button><button onClick={duplicate} className="mw-button-secondary flex-1 px-3"><Copy className="h-4 w-4" strokeWidth={1.75} />Duplicate</button></div> : null}
          </article>
        ))}
      </section>
      <p className="mw-meta">Local UAT preview. No CV is generated, exported or submitted.</p>
    </div>
  );
}

export function CareerProfile({ career }: { career: MyWritexCareer }) {
  const tagSections = [["Target roles", career.profile.targetRoles], ["Preferred locations", career.profile.preferredLocations], ["Work modes", career.profile.workModes], ["Strengths", career.profile.strengths], ["Certificates", career.profile.certificates], ["Selected projects", career.profile.projects]] as const;
  return <div className="mw-page-stack max-w-[820px]"><ProductPageHeader eyebrow="Career · Profile" title="Your career direction" copy="One reusable profile supplies Job Radar, CV Studio, applications and interview preparation." /><section className="mw-card mw-card-mobile-pad p-6"><div className="flex items-center justify-between gap-4"><h2 className="mw-section-title">Profile foundations</h2><MetaPill tone="green">{career.profile.completeness}% complete</MetaPill></div>{tagSections.map(([label, values]) => <div key={label} className="mt-6 border-t border-[var(--mw-line)] pt-5"><p className="mw-meta font-medium text-[var(--mw-ink)]">{label}</p><div className="mt-3 flex flex-wrap gap-2">{values.map((item) => <MetaPill key={item} tone="violet">{item}</MetaPill>)}</div></div>)}</section><section className="mw-card mw-card-mobile-pad p-6"><GraduationCap className="h-6 w-6 text-[var(--mw-primary)]" strokeWidth={1.75} /><p className="mw-eyebrow mt-5">Graduation</p><h2 className="mw-section-title mt-2">{career.profile.graduationDate}</h2><p className="mw-secondary mt-2">{career.profile.availability}</p>{career.profile.education.map((item) => <div key={item.qualification} className="mt-5 border-t border-[var(--mw-line)] pt-4"><p className="text-sm font-medium">{item.qualification}</p><p className="mw-meta mt-1">{item.institution} · {item.period}</p></div>)}</section></div>;
}

export function ApplicationTracker({ applications }: { applications: MyWritexApplication[] }) {
  const stages: MyWritexApplication["stage"][] = ["Saved", "Applied", "Interview", "Offer", "Closed"];
  const [stage, setStage] = useState<MyWritexApplication["stage"] | "All">("All");
  const visible = stage === "All" ? applications : applications.filter((item) => item.stage === stage);
  return <div className="mw-page-stack"><ProductPageHeader eyebrow="Career · Applications" title="Applications" copy="Every application, grouped by state, with one next step." /><div className="flex gap-1 overflow-x-auto">{["All", ...stages].map((item) => <button key={item} onClick={() => setStage(item as typeof stage)} className={`h-10 shrink-0 rounded-[8px] px-4 text-sm font-medium ${stage === item ? "bg-[var(--mw-primary-soft)] text-[var(--mw-primary)]" : "text-[var(--mw-muted)]"}`}>{item}</button>)}</div><section className="mw-list-surface">{visible.map((item) => <article key={item.id} className="mw-project-list-row md:grid-cols-[minmax(0,1fr)_140px_120px_40px]"><div><h2 className="mw-object-title">{item.role}</h2><p className="mw-meta mt-1">{item.employer} · {item.nextStep}</p></div><MetaPill tone={item.stage === "Interview" ? "orange" : item.stage === "Offer" ? "green" : "neutral"}>{item.stage}</MetaPill><p className="mw-meta">{formatDate(item.updatedAt)}</p><ChevronRight className="h-4 w-4 text-[var(--mw-tertiary)]" strokeWidth={1.75} /></article>)}</section></div>;
}

export function InterviewPrep({ career }: { career: MyWritexCareer }) {
  const [prepared, setPrepared] = useState(false);
  return <div className="mw-page-stack max-w-[820px]"><ProductPageHeader eyebrow="Career · Interview Prep" title="Prepare stories you can say aloud." copy="Use structured fixture prompts to turn your experience into clear, specific answers." /><section className="mw-card mw-card-mobile-pad p-6"><MetaPill tone="orange">Next session</MetaPill><h2 className="mw-section-title mt-4">{career.interview.nextSession}</h2><p className="mw-secondary mt-2">Focus: {career.interview.focus}</p><button onClick={() => setPrepared(true)} className="mw-button-primary mt-5">Open Practice Set</button></section>{prepared ? <section className="mw-card mw-card-mobile-pad p-6"><p className="mw-eyebrow">Practice set 1 of {career.interview.questionSets}</p><h2 className="mw-section-title mt-2">Tell me about a time you turned complex research into a clear recommendation.</h2><ol className="mt-5 divide-y divide-[var(--mw-line)]">{["Set the specific situation", "Explain your decisions", "Finish with the measurable result"].map((item, index) => <li key={item} className="flex min-h-[64px] items-center gap-3 py-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mw-primary-soft)] text-xs font-medium text-[var(--mw-primary)]">{index + 1}</span><span className="mw-secondary">{item}</span></li>)}</ol></section> : null}</div>;
}

export function CareerConsultation() {
  const [sent, setSent] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSent(true); }
  return <div className="mw-page-stack max-w-[720px]"><ProductPageHeader eyebrow="Career · Consultation" title="Bring one career question into focus." copy="Prepare a local consultation request with your chosen topic and current context." />{sent ? <section role="status" className="mw-card mw-card-mobile-pad p-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf6f0] text-[var(--mw-green)]"><Check className="h-5 w-5" strokeWidth={1.75} /></span><h2 className="mw-section-title mt-5">Request prepared locally</h2><p className="mw-secondary mx-auto mt-2 max-w-[360px]">Nothing was sent. This demonstrates the future confirmation state.</p></section> : <form onSubmit={submit} className="mw-card mw-card-mobile-pad grid gap-[18px] p-6"><label><span className="text-sm font-medium">What would you like to discuss?</span><select className="mw-control mt-[7px] w-full"><option>Choosing target roles</option><option>CV direction</option><option>Application strategy</option><option>Interview preparation</option></select></label><label><span className="text-sm font-medium">Your question</span><textarea required rows={5} placeholder="Add the context that would make this conversation useful…" className="mw-control mt-[7px] h-auto w-full py-3" /></label><button className="mw-button-primary justify-self-start">Prepare Request <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} /></button><p className="mw-meta">Local UAT shell only. No appointment or message will be created.</p></form>}</div>;
}

function CareerRow({ href, icon: Icon, title, copy, meta }: { href: string; icon: typeof FileText; title: string; copy: string; meta: string }) {
  return <Link href={href} className="mw-list-row outline-none hover:bg-[rgba(17,24,39,0.025)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--mw-primary)]"><Icon className="h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} /><span className="min-w-0 flex-1"><span className="mw-object-title block">{title}</span><span className="mw-meta mt-0.5 block">{copy}</span></span><span className="mw-meta hidden sm:block">{meta}</span><ChevronRight className="h-4 w-4 shrink-0 text-[var(--mw-tertiary)]" strokeWidth={1.75} /></Link>;
}
