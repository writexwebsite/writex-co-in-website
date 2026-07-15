"use client";

import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

const baseClass = "wx-auth-field h-14 w-full rounded-lg border border-wxBorder px-4 text-base text-wxIndigo900 outline-none transition placeholder:text-wxIndigo500/60 focus:border-wxViolet700 focus:ring-4 focus:ring-wxViolet700/10";

export function AuthInput({ label, icon: Icon, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: LucideIcon }) {
  return <label className="block text-sm font-semibold text-wxIndigo900">{label}<span className="relative mt-2 block">{Icon ? <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-wxIndigo500/65" aria-hidden /> : null}<input {...props} className={`${baseClass} ${Icon ? "pl-12" : ""} ${className}`} /></span></label>;
}

export function SecretInput({ label, helper, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string }) {
  const [visible, setVisible] = useState(false);
  return <label className="block text-sm font-semibold text-wxIndigo900">{label}<span className="relative mt-2 block"><input {...props} type={visible ? "text" : "password"} className={`${baseClass} pr-12`} /><button type="button" aria-label={visible ? `Hide ${label}` : `Show ${label}`} aria-pressed={visible} onClick={() => setVisible((value) => !value)} className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-wxIndigo500 hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wxViolet700">{visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></span>{helper ? <span className="mt-2 block text-xs font-normal text-wxIndigo500">{helper}</span> : null}</label>;
}
