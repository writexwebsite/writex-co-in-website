"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";

export class AxoErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { if (process.env.NODE_ENV !== "production") console.error("AXO boundary", error.message, info.componentStack); }
  render() { return this.state.failed ? <Link href="/contact" className="fixed bottom-24 right-4 z-40 rounded-full bg-indigo-950 px-4 py-3 text-sm font-semibold text-white shadow-xl lg:bottom-6">Contact WriteX support</Link> : this.props.children; }
}
