import { academicIntegrityDisclaimer } from "@/lib/site";

export function AcademicIntegrityDisclaimer() {
  return (
    <div className="rounded-md border border-white/[0.12] bg-white/[0.06] p-4 text-xs leading-6 text-white/[0.72]">
      <p className="mb-1 font-semibold text-mutedCopper">Academic integrity</p>
      <p>{academicIntegrityDisclaimer}</p>
    </div>
  );
}
