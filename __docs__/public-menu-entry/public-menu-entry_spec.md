# Public Menu Entry - Specification

**Status:** Local source complete; external release evidence pending
**Last reviewed:** July 16, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The `/create-menu` page is public, but source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

**Local result:** Local source complete. Preview polling is 5 seconds apart and capped at 36 reads. Expired claimed draft receipts are cleaned without deleting promoted project sources. Approved app release and hosted evidence remain pending.

## Goal

Let a non-technical owner move from one current menu source to an owner-reviewable, permanent MenuList menu without anonymous AI cost, duplicate account creation, or hidden publication.

## Functional requirements

| Requirement | Current contract |
| --- | --- |
| Public discovery | `/create-menu` is reachable without auth; processing controls require sign-in. |
| Sign-in | Inline Google/OTP paths may return to the flow; password fallback uses the normal sign-in route. |
| Inputs | One JPEG, PNG, or WebP up to the route cap, or a public page/PDF/image link with permission confirmation. |
| Admission | Feature flags, fail-closed burst limiter, complete account scope, existing-store extraction permission, SAFE_MODE, bounded body/file validation, dedupe, then daily new-source quota. |
| Draft | Deterministic, owner-bound, 24-hour, atomic with its extraction job. |
| Preview | Status-only reads every 5 seconds, maximum 36; one full DTO read after completion; explicit retry on timeout. |
| Existing account claim | Reuse tenant/store identity, require current publish permission, add a new canonical menu project. |
| New account claim | Create the existing starter tenant/store plus first project and session claim context. |
| Publish truth | Validate source, prices, phone, business type, slug, project identity, summary, and Menu Correctness stamp before one transaction commits. |
| Retry | Same owner can replay a successful claim from the persisted receipt without duplicate writes. |
| Public effects | Refresh menu, OBP, client-store, Digital Screens, and assistant state after commit. |
| Cleanup | Delete expired unclaimed files before drafts; preserve retry on Storage failure; delete expired claimed draft receipts while preserving promoted sources. |

## Failure rules

- Rate-limit provider failure returns `503` before expensive work or Firestore polling.
- Partial tenant/store session returns `409`; it is never interpreted as a new owner.
- Wrong owner, missing/expired draft, incomplete extraction, invalid DTO/source/price/phone, inactive or blocked store, and missing publish authority fail closed.
- Owner responses use bounded fixed copy and never expose worker/provider errors.
- Poll timeout ends the spinner and offers retry.
- Post-commit cache effects may be retried independently and do not turn a committed claim into a client rollback.

## Non-goals

- Anonymous extraction or anonymous draft polling.
- Automatic subscription checkout during extraction or claim.
- Publishing without owner confirmation.
- A new queue, collection, operation ledger, or real-time listener.
- A separate mobile dashboard screen; this is a responsive website funnel.

## Acceptance boundary

The source gate, behavior tests, extraction suite, auth/tenant/public truth gates, TypeScript, lint, Functions build/lint, docs, and diff must pass. Approved app release, Firebase QA Function deployment, provider/Razorpay smoke, signed-in browser and physical-device QA, and production-host smoke remain external evidence.
