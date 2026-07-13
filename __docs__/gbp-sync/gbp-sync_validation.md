# GBP Sync — Validation Report

**Feature:** Google Business Profile Sync
**Status:** Source scaffolding present; Google sync blocked by API/OAuth/provider gates
**Last Updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records disabled/reserved GBP Sync evidence only: `ENABLE_GBP_SYNC` remains false, token operations fail closed with `GBP_TOKEN_STORE_DISABLED`, and manual Google handoff is the only current owner path. Current implementation or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:public-business-truth`, Google Business Profile API access, OAuth and target-secret setup, provider smoke, scoped deploy evidence, browser/device QA, and production-host smoke.

---

## Current Source Boundary

Current code proves only the disabled/reserved boundary:

| Check | Status | Evidence |
| --- | --- | --- |
| Feature flag default | ✅ blocked | `ENABLE_GBP_SYNC: false` in `src/config/features.ts` |
| Token store | ✅ fail-closed | `src/database/integrations/gbp.ts` throws `GBP_TOKEN_STORE_DISABLED` |
| Owner UI | ✅ gated | The Google Business Profile card is behind `gbpEnabled`; the shared Integrations tab may still host Platform Pull API controls |
| Google OAuth routes | ❌ not shipped | No active `/api/integrations/gbp/*` OAuth/connect/apply route is current runtime |
| Nightly sync worker | ❌ not shipped | No active GBP Cloud Function or scheduler task is current runtime |
| Public claims | ✅ bounded after July 2 update | Website/help/marketing docs now describe manual Google handoff, not automatic sync |

This validation report is historical source evidence plus current source-boundary documentation. It is not ready for testing, ready for implementation, launch approval, or production certification.

## Current Owner Behavior

Owners keep Google Business Profile aligned manually:

1. Copy the current MenuList Official Business Page link or menu link.
2. Open Google Business Profile in Google.
3. Paste/update the website or menu field Google allows for that listing.
4. Save in Google.

MenuList does not currently write to Google.

## Reserved Integration Gates

Direct GBP sync cannot be claimed, tested as release-ready, or shown in public copy until all of these gates have evidence:

| Gate | Required evidence |
| --- | --- |
| Google API access | Approved Google Business Profile API access for the target project |
| OAuth setup | Separate OAuth credentials and target secrets configured |
| API routes | Auth URL, callback, connect-location, disconnect, and apply-hours routes implemented and source-gated |
| Provider smoke | Real Google test listing smoke for connect, read, disconnect, and allowed write paths |
| Function scope | Scoped scheduler/function implementation and deploy evidence if sync workers are added |
| Security | Token storage rules deny client access; routes use auth, permission, validation, rate limits, and bounded diagnostics |
| UI QA | Authenticated desktop/mobile QA for all exposed owner paths |
| Production host | Target environment smoke after deploy |

## Documentation Status

| Document | Current status |
| --- | --- |
| `README.md` | Current disabled-source boundary |
| `gbp-sync_spec.md` | Reserved integration spec; not current runtime |
| `gbp-sync_impl.md` | Reserved implementation blueprint plus disabled scaffold evidence |
| `gbp-sync_firebase.md` | Reserved cost model; no active GBP reads/writes/functions |
| `gbp-sync_mobile-support.md` | No current mobile sync surface while flag is off |
| `gbp-sync_website.md` | Manual Google handoff copy only |
| `gbp-sync_helpdoc.md` | Manual Google handoff help only |
| `gbp-sync_marketing.md` | Source-gated internal handoff copy only |

## Current Verdict

GBP Sync is not release-ready and not active runtime. The current production-safe claim is:

> MenuList provides the Official Business Page and menu link owners can copy into Google Business Profile. Direct Google sync is reserved until API/OAuth/provider/deploy/browser gates are complete.

---

**VALIDATION SIGNATURE:** Source-boundary audit
**TIMESTAMP:** July 2, 2026
