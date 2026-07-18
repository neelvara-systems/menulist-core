# AI System Layer — Mobile Support Assessment

**Feature:** Centralized AI Infrastructure for MenuList  
**Status:** Source-backed mobile assessment — not current device or release certification
**Last Updated:** July 14, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI System Layer evidence only. Current MenuList approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:functions-deploy-preflight`, `npm run verify:menu-extraction-pipeline`, scoped Firebase deploy evidence for affected MenuList Functions, target Vercel deploy evidence for affected app routes, provider smoke with target-specific key/model/quota configuration, SAFE_MODE/rate-limit/accounting/provider-health smoke, authenticated browser/device QA for affected owner/platform surfaces, and production-host smoke. Answerlattice retains separate doctrine, credentials, Firebase target, billing/cost evidence, deploy approval, and release certification; this document cannot authorize an Answerlattice deploy or release.

---

## Mobile Relevance Decision: **INDIRECT INFRASTRUCTURE + EXISTING MOBILE CONSUMERS**

The AI System Layer does not add a new mobile infrastructure screen. Its accounting and history contracts are consumed by existing Mobile Billing, Menu Upload, and Mobile Transactions surfaces.

---

## Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Daily/multiple times per day? | Existing upload, AI action, Billing, and history flows can be used on mobile | ✅ PASS |
| **Speed** | Completes in <5 seconds on mobile? | UI feedback is immediate; provider/extraction work keeps existing asynchronous states | ✅ PASS |
| **Touch** | Works with thumb-only? | Existing MobileShell screens retain 44px owner actions | ✅ PASS |
| **Value** | Needed while away from desk? | Owners can upload, check Pack balance, and review activity from mobile | ✅ PASS |

**Result:** No new mobile screen is needed, but parity is mandatory for existing mobile consumers.

---

## Mobile Impact (Indirect)

Mobile users benefit indirectly because:
- Menu extraction (triggered from `MenuUploadSheet.tsx`) uses the same pipeline
- Processing reliability improves for mobile uploads
- The existing Mobile Transactions screen now consumes the same runtime-validated AI-operation DTO as desktop and Answerlattice history. Malformed response rows/cursors do not enter mobile state, and nested response detail is read through safe JSON-object helpers. No new screen, tab, route, data load, or mobile-specific persistence path was added.
- Mobile Transactions uses the MenuList-only owner action allowlist and keeps a translated, explicit 44px Next action when an empty capped filtered scan requires manual continuation.
- Successful/partial authenticated menu extraction appears as a no-credit activity row in the selected outlet history; detailed provider cost/token telemetry remains platform-only.
- Balance updates carry the effective `billingStoreId` and are applied only to the matching active subscription, so a late response from another store cannot overwrite mobile Billing state.
- Mobile Billing shows the exact purchased Pack balance and generic plan-enhancement availability. It does not show monthly allowance, monthly remaining, used-this-cycle counts, provider cost, or margin.
- Mobile navigation continues to hide Transactions without `canAccessBilling`; the server history route now independently rechecks that current persisted permission, so a direct request cannot bypass the mobile shell gate.
- Help Center search response parsing and request policy are shared at the browser helper level. The current changed callers are desktop Help Chat and AI Search modal surfaces; no new mobile screen, route bypass, or mobile-specific data load was added.
- No mobile-specific changes required

---

## Localization / Auth / Settings

Existing screens inherit MobileShell auth, localization, selected-store context, and shared subscription/history DALs. No mobile-only persistence contract is introduced.

---

_Document Status: Source-backed mobile parity assessment for existing consumers; no new infrastructure screen, and not current device or release certification._
