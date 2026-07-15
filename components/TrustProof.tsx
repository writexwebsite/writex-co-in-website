import { ShieldCheck } from "lucide-react";
import { whatStudentsValue } from "@/lib/content";
import { AnimatedCard } from "./animations/AnimatedCard";
import { Stagger } from "./animations/Stagger";

export function TrustProof() {
  return (
    <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" itemClassName="h-full">
      {whatStudentsValue.map((item) => (
        <AnimatedCard key={item.title} className="h-full">
          <div className="h-full rounded-md border border-sageBorder bg-white p-5 shadow-sm transition duration-500 hover:border-mutedCopper">
            <ShieldCheck className="h-5 w-5 text-softTeal" aria-hidden />
            <h3 className="mt-4 text-lg font-semibold text-charcoalInk">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slateText">
              {item.description}
            </p>
          </div>
        </AnimatedCard>
      ))}
    </Stagger>
  );
}
