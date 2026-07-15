# AXO Academic Website Audit

Date: 11 July 2026

## Current platform

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Motion, PostgreSQL and private AWS S3 adapters.
- Public routes include Home, six approved academic support services, Pricing/Quote, Contact, Samples, Help, Privacy and Terms.
- Public conversion paths are the progressive quote form, WhatsApp Business and contact form. Authenticated client and admin portals are separate from public chrome.
- SEO is server-rendered with page metadata, canonical URLs, JSON-LD, sitemap and indexable service content.
- Quote leads use strict Zod schemas, rate limiting, lead scoring, audit logs and notification adapters. Uploads use private storage and database file records.
- The only repository asset containing the company mascot is `public/images/login/writex-client-login-showcase.png`. AXO v1 uses a lightweight CSS crop of that approved asset. A standalone transparent AXO export is recommended.

## Current journey

Visitors discover a service, read scope and trust content, then use WhatsApp or the pricing form. The quote form is complete but asks visitors to understand service categories and prepare their requirement without much guidance. Existing customers must identify the client-login route before they can safely continue an order.

## Friction and missing information

- Students may not know which service or referencing option fits their brief.
- Complex dissertation, SOP and editing requests need different questions; a universal form creates unnecessary effort.
- File requirements and deadline timezone can be omitted, increasing follow-up.
- Existing-order and revision requests need a distinct privacy-safe path.
- WhatsApp is low friction but unstructured, so teams may receive incomplete requirements.

## Mobile and accessibility risks

- Existing mobile sticky actions occupy the bottom edge, so AXO must sit above them and become a keyboard-safe bottom sheet.
- Large guided forms must use progressive disclosure, 44px targets, visible focus, Escape close and reduced-motion fallbacks.
- Session prompts must be frequency-capped and must not obstruct primary content.

## Trust and conversion opportunities

- Identify AXO as an AI-powered support assistant and keep final scope, price and feasibility human-reviewed.
- Convert uncertain visitors into structured, editable requirement summaries.
- Preserve normal forms and contact paths when AXO, uploads, analytics or JavaScript fail.
- Provide approved-answer search and a transparent unknown-answer handoff.

## Integration points

- `components/AppChrome.tsx`: lazy public-page mount.
- `/api/quote`: validated lead creation after explicit confirmation.
- `/api/upload-brief`: private S3 upload, database asset record and rate limiting.
- `/client-login`, `/contact`, configured WhatsApp and support email: human or existing-order handoff.
- `window.dataLayer` and `writex:axo-event`: sanitized event transport.

## Security and performance risks

- Academic files can contain malware or spoofed extensions; signatures are now verified and an approved scanner boundary is enforced when configured.
- Raw briefs and PII must never enter analytics; AXO uses an explicit payload allowlist.
- Saved drafts require consent; session storage is default, local storage is opt-in, and file contents are never persisted locally.
- The shared mascot poster is larger than ideal. It is lazy-loaded with AXO and cropped in CSS, but a small standalone WebP/AVIF asset remains a recommended optimisation.
- Optional conversational AI is intentionally disabled in v1. Deterministic service rules and approved knowledge prevent fabrication and prompt-injection exposure.

## Decision

Integrate AXO as an optional, dynamically loaded companion. Do not replace indexable page content, quote forms, WhatsApp, contact, or authenticated portals.
