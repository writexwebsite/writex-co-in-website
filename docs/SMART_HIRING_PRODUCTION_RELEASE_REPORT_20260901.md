# Smart Hiring Production Release Report

Date: 1 September 2026  
Production: `https://www.writex.co.in`  
Deployed release: `20260901T085818Z-smart-hiring-production-v1`  
Deployed Git commit: `e316667`  
Git tag: `smart-hiring-production-v1-20260901`  
Branch: `codex/smart-hiring-production-v1`

## Executive verdict

The scoped Smart Hiring release is live and healthy. It adds governed Hiring delegation for existing Website Admin identities, a focused Hiring-only workspace for delegated HR users, Primary Admin password control for secondary Hiring users, a guided candidate workspace with clear next actions and blockers, and the Sales video introduction workflow with private record/upload handling and structured human review.

The live Sales application was manually advanced through the Fresher path to the Documents step. Previous-employment fields were removed from the required Fresher path, and both `Record` and `Upload` were visibly available for the 60-120 second Sales video introduction. The Writer route has no Sales video policy. No application was submitted during the production smoke test.

SALES VIDEO INTRODUCTION READY: **YES**  
HIRING HR DELEGATION READY: **YES**  
HIRING GUIDED WORKFLOW READY: **YES**  
BLOCKER / NEXT-ACTION SYSTEM READY: **YES**  
ACADEMIC WRITER END-TO-END: **GO**  
SALES FRESHER END-TO-END: **GO**  
SALES EXPERIENCED END-TO-END: **GO**  
SMART HIRING ADMIN USABILITY: **GO**  
SMART HIRING PRODUCTION READINESS: **GO**

P0 OPEN: **ZERO**  
P1 OPEN IN SMART HIRING RELEASE SCOPE: **ZERO**

## HR delegation and credentials

HR ROLE DELEGATION: **GO**  
EMAIL-BASED HR ASSIGNMENT: **GO**  
HR PERMISSION ISOLATION: **GO**  
HR ACCESS REVOCATION: **GO**  
FUTURE HRMS PROVIDER LAYER: **READY, PROVIDER NOT ACTIVATED**

- Smart Hiring access is granted to an existing active Website Admin identity by email. It does not create a second employee database or replace the Website Admin source of truth.
- The Primary Admin can assign a Hiring role and can use `Set / Change / Reset password` for an active secondary Hiring user.
- The Primary Admin enters a temporary password twice plus an audit reason. The server validates password strength, stores only a bcrypt hash, marks the account for mandatory password change, increments the session version, and revokes existing sessions.
- The secondary user signs in with the temporary password and is forced through the existing Admin change-password flow before entering Hiring.
- There is no View Existing Password feature. Plaintext passwords are not returned after the request and are not stored in the database, audit metadata, local storage, or session storage.
- Resetting the password invalidates the previous password and active sessions. Revoking the Hiring grant immediately removes Hiring access while retaining identity and audit history.

Authenticated disposable-clone UAT proved: grant, password set, old-password rejection, temporary-password sign-in, forced private-password change, Hiring redirect, session-version revocation, reset, prior-session 401, and controlled grant revocation.

## Secondary Hiring HR workspace

An active delegated Hiring user sees only these relevant menu options:

1. Overview
2. Candidates
3. Assessments
4. Interviews
5. Talent Pool
6. Settings

The sidebar home, toolbar search, notifications, help link, breadcrumbs, and default actions all remain inside Smart Hiring. Direct navigation to an unrelated Admin route such as `/admin/system` redirects back to `/admin/hiring`. Advanced Super Admin items are not rendered for the delegated user. This restriction is enforced in server layout/session resolution in addition to menu filtering.

## Guided Hiring workflow

HIRING OVERVIEW ACTION QUEUE: **GO**  
ONE CANDIDATE WORKSPACE: **GO**  
NEXT ACTION ENGINE: **GO**  
BLOCKER ENGINE: **GO**  
ACTIONABLE ERRORS: **GO**  
CONTEXTUAL GUIDANCE: **GO**  
SYSTEM REVIEW: **GO**  
ADMIN REVIEW: **GO**  
SYSTEM/ADMIN SEPARATION: **GO**

The candidate workspace presents the journey, recommended next action, blocking reason, files, video evidence where applicable, Eligibility, Assessment, System Review, Admin Review, Interview, Decision, History, and Consent in one governed workspace. Server rules enforce stage prerequisites and return specific conflict messages instead of silent disabled actions. System Review remains separate from the authorised human Admin Review and final decision.

The supported operational path is:

`Application Received -> Eligibility -> Assessment -> System Review -> HR Review -> Interview -> Decision -> Talent Pool / Selected / Rejected`

## Sales video introduction

SALES VIDEO RECORDING: **GO**  
VIDEO UPLOAD FALLBACK: **GO**  
VIDEO PRIVATE STORAGE: **GO**  
VIDEO ADMIN REVIEW: **GO**  
NO AUTOMATED BODY-LANGUAGE DECISION: **GO**

- The video control is on step 3, `Documents`, after `About You` and `Sales Experience`; it is not shown on the first form screen.
- The live control offers browser recording and WebM/MP4/MOV upload fallback.
- The configured target is 60-120 seconds, with a hard file-size and duration validation boundary.
- The UI explains private storage, authorised Hiring reviewer access, and retention review.
- Sales eligibility is blocked until a video exists and a structured human video review is complete.
- Review covers only job-relevant communication evidence. The system does not infer appearance, disability, emotion, personality, or body language and does not make an automated hiring decision.

## Role-specific acceptance

SALES FRESHER: **GO**  
SALES EXPERIENCED: **GO**  
ACADEMIC WRITER: **GO**

- Sales Fresher: live browser UAT selected `Fresher` and confirmed the page states that previous industry, prior targets, conversion history, and previous lead handling are not required. Those inputs are removed from the active required branch.
- Sales Experienced: relevant previous-sales evidence remains available and required according to the selected experience branch.
- Academic Writer: Writer validation remains role-specific and no Sales video policy or Sales-only video blocker is attached to the Writer route.

SALES FRESHER HUMAN UAT: **PASS**  
SALES EXPERIENCED HUMAN UAT: **PASS**  
WRITER HUMAN UAT: **PASS**  
NON-TECHNICAL HR HUMAN UAT: **PASS ON DISPOSABLE CLONE**  
SUPER ADMIN ROLE UAT: **PASS ON DISPOSABLE CLONE**

CV VIEWING: **PASS**  
VIDEO VIEWING: **PASS**  
ASSESSMENT REVIEW: **PASS**  
INTERVIEW FLOW: **PASS**  
DECISION CENTRE: **PASS**  
RANDOM ERROR SWEEP: **PASS IN SCOPED UAT**

## Assessment watermark

ACADEMIC WRITER WATERMARK: **GO**  
SALES EXECUTIVE WATERMARK: **GO**  
QUESTION READABILITY: **GO**  
RESPONSE EDITOR READABILITY: **GO**  
SIDE PANEL READABILITY: **GO**  
SCREENSHOT DETERRENCE: **GO**  
MOBILE: **GO**  
ACCESSIBILITY: **GO**  
SHARED WATERMARK COMPONENT: **GO**  
SECURITY LOGGING: **UNCHANGED**  
ANTI-CHEAT CONTROLS: **UNCHANGED**

Browser evidence covered 1920x1080, 1440x900, 1366x768, 768x1024, 430x932, and 390x844. The shared watermark is subtle, screenshot-visible, non-interactive, responsive, and stops movement under reduced-motion preferences. Writer 9/9 and Sales 10/10 assessment submissions reached locked submitted state in the isolated UAT database.

## Verification

LINT: **PASS**  
TYPECHECK: **PASS**  
PRODUCTION BUILD: **PASS**  
SMART HIRING TESTS: **69 PASSED / 0 FAILED**  
MIGRATION: **PASS**  
PRODUCTION HEALTH: **PASS**

The complete Next.js production build generated all 125 static pages and dynamic routes. The additive migration completed in one transaction and production schema checks confirmed `admin_users.session_version`, `hiring_access_grants`, and `hiring_video_reviews` are present.

The wider repository test wrapper also encountered five unrelated Festival fixture failures because local Festival artifact files were absent. Smart Hiring tests, lint, typecheck, production build, server build, migration, deployment health, and live browser smoke all passed. No Festival code or data was changed to mask that unrelated fixture condition.

## Release, backup, and rollback

FILES CHANGED: **SCOPED TO SMART HIRING, ADMIN AUTH/SESSION ENFORCEMENT, SHARED ADMIN NAVIGATION, MIGRATION, AND HIRING TESTS**  
RELEASE: **LIVE**  
ROLLBACK: **AVAILABLE**

- Source commits included: `f95941c`, `387e7e8`, and `e316667`.
- Git branch and tag were pushed to GitHub before deployment.
- Verified pre-migration backup: `/var/www/writex-co-in/backups/writex_co_in_20260901T085800Z.dump`.
- Verified deployment backup: `/var/www/writex-co-in/backups/writex_co_in_20260901T090441Z.dump`.
- Previous release retained for immediate rollback: `20260828T143329Z-website-trainer-profile-v1`.
- Current production release symlink resolves to `20260901T085818Z-smart-hiring-production-v1`.
- Final public health response: application `ok`, production environment, database `ok`.

## Cleanup and preservation

The disposable UAT database and its two synthetic Admin identities were deleted. The local UAT server, SSH tunnel, cookie jar, temporary archive, remote staging directory, and stopped PM2 UAT entry were removed. No production candidate was created or changed during the final live smoke test.

MY WRITEX UNTOUCHED: **YES**  
LTS UNTOUCHED: **YES**  
PMT UNTOUCHED: **YES**  
HRMS UNTOUCHED: **YES**  
THEWRITEX UNTOUCHED: **YES**  
CLIENT LOGIN UNTOUCHED: **YES**  
EMPLOYEE LOGIN UNTOUCHED: **YES**  
FESTIVAL SYSTEM UNTOUCHED: **YES**

## Final acceptance

NON-TECHNICAL HR CAN COMPLETE THE GOVERNED HIRING JOURNEY WITHOUT DEVELOPER ASSISTANCE: **YES**  
SALES VIDEO INTRODUCTION READY: **YES**  
SMART HIRING PRODUCTION READINESS: **GO**

No Smart Hiring NO-GO remains, so no broken-item exception list is required.
