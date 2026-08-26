"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, FileText, SearchCheck, ShieldCheck, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motionDurations, motionEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

const workflowSteps: Array<{
  label: string;
  detail: string;
  icon: LucideIcon;
  color: string;
}> = [
  {
    label: "Brief Received",
    detail: "Your requirements are securely received",
    icon: FileText,
    color: "#0B81F7"
  },
  {
    label: "Scope Reviewed",
    detail: "Our experts review the scope and details",
    icon: SearchCheck,
    color: "#5516F2"
  },
  {
    label: "Expert Assigned",
    detail: "The right expert is assigned to your brief",
    icon: UserCheck,
    color: "#B42CE0"
  },
  {
    label: "QA Checked",
    detail: "Quality and accuracy checks are completed",
    icon: ShieldCheck,
    color: "#E83874"
  },
  {
    label: "Quote Ready",
    detail: "Clear quote and timeline shared with you",
    icon: CheckCircle2,
    color: "#1ECC6F"
  }
];

export function AcademicCommandVisual() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="relative hidden w-full max-w-[29rem] justify-self-end lg:block"
      initial={shouldReduceMotion ? false : { opacity: 0.94, y: 10 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: motionDurations.slow, ease: motionEase, delay: 0.42 }}
    >
      <div
        data-testid="hero-command-visual"
        className="relative overflow-hidden rounded-xl border border-wxViolet700/10 bg-white/[0.88] p-5 shadow-[0_24px_70px_rgba(61,42,140,0.12)] backdrop-blur-xl"
      >
        <div
          aria-hidden
          className="absolute inset-0 rounded-md bg-[radial-gradient(circle_at_85%_12%,rgba(232,56,116,0.12),transparent_34%),linear-gradient(135deg,rgba(85,22,242,0.08),transparent_42%)]"
        />
        <motion.div
          aria-hidden
          className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-wxViolet700/10 to-transparent"
          initial={shouldReduceMotion ? false : { x: "-20%" }}
          animate={shouldReduceMotion ? undefined : { x: "320%" }}
          transition={{ duration: 1.05, ease: motionEase, delay: 0.68 }}
        />

        <div className="relative flex items-start justify-between gap-4 border-b border-wxBorder pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-wxViolet700">
              WriteX Support Workflow
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-tight text-wxIndigo900">
              A clear path from brief to quote
            </h2>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxViolet700 ring-1 ring-wxViolet700/12">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </span>
        </div>

        <ol className="relative mt-4 grid gap-2">
          <motion.span
            aria-hidden
            className="absolute left-[1.1rem] top-8 h-[calc(100%-4rem)] w-px bg-gradient-to-b from-wxBlue500 via-wxViolet700 via-wxMagenta500 to-wxGreen500"
            initial={shouldReduceMotion ? false : { scaleY: 0.12 }}
            animate={shouldReduceMotion ? undefined : { scaleY: 1 }}
            transition={{ duration: 1.1, ease: motionEase, delay: 0.72 }}
            style={{ originY: 0 }}
          />
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            const active = index === 1 || index === workflowSteps.length - 1;

            return (
              <motion.li
                key={step.label}
                data-state={active ? "selected" : "default"}
                className={cn(
                  "wx-interactive-state relative grid grid-cols-[2.25rem_1fr] gap-3 rounded-md border p-3"
                )}
                style={{
                  boxShadow: active ? `0 12px 28px ${step.color}1F` : undefined
                }}
                initial={shouldReduceMotion ? false : { opacity: 0.72, y: 10 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{
                    duration: motionDurations.heroStep,
                    ease: motionEase,
                    delay: 0.76 + index * 0.18
                  }}
                >
                <span
                  className={cn(
                    "wx-state-icon-surface relative z-10 flex h-9 w-9 items-center justify-center rounded-md border",
                    active
                      ? "border-transparent"
                      : "border-wxBorder"
                  )}
                  style={{
                    backgroundColor: active ? step.color : "#F3EBFD",
                    color: active ? "#FFFFFF" : step.color
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-wxIndigo900">
                    {step.label}
                  </span>
                  <span className="wx-state-muted mt-0.5 block text-xs leading-5">
                    {step.detail}
                  </span>
                </span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </motion.div>
  );
}
