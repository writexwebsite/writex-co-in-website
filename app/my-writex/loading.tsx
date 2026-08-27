export default function MyWritexLoading() {
  return (
    <div aria-label="Loading My WriteX" className="animate-pulse space-y-8 motion-reduce:animate-none">
      <div className="grid gap-3"><div className="h-8 w-72 rounded-[8px] bg-[#eaecf0]" /><div className="h-5 w-80 rounded-[8px] bg-[#f2f4f7]" /></div>
      <div className="overflow-hidden rounded-[16px] border border-[var(--mw-line)] bg-white">
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-16 border-b border-[var(--mw-line)] last:border-b-0" />)}
      </div>
      <div className="h-40 rounded-[16px] border border-[var(--mw-line)] bg-white" />
    </div>
  );
}
