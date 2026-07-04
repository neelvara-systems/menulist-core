# Truth & Accuracy Dominance — Spec

**Status:** Source-gated pillar reference; not current launch certification
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** CEO, PM, Clients (non-technical)  
**Pillar:** 2 of 6 — Customer-Facing Infrastructure

---

## Executive Summary

**What:** A source-boundary reference for supported MenuList customer-facing surfaces. Those surfaces read saved and verified project/store data after their normal refresh, publish, cache, download, or provider flow completes.

**Why:** 73% of consumers only trust information from the last 30 days (Sixth City Marketing 2025). Wrong info destroys trust quickly. A single wrong price or "open" status when closed creates anger and bad reviews.

**For whom:** Every MenuList business and their customers.

**Impact:** Owners can point customers to the MenuList source for supported menu, hours, availability, and business-info surfaces while external platforms, downloaded artifacts, and provider targets stay tied to their own evidence.

## Launch Boundary

This document is source-gated evidence, not release approval. Current approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:public-business-truth`, public menu/OBP/Digital Screens browser and device QA, provider evidence where relevant, target deploy evidence, and production-host smoke.

---

## Goals & Success Metrics

| Goal | Success Metric |
|------|---------------|
| Menu source match | Public menu and OBP output match the current approved project/store source after the public cache path settles |
| Hours source match | Open/Closed badge uses the current store-hours source, timezone, and closure data |
| Source refresh boundary | Public menu/OBP follow the 60-second public cache window; Digital Screens use the screen-data cache/listener path; downloaded or provider targets require separate evidence |
| No blank states | MCE and fallback states prevent broken public output when required menu data is missing |
| Publish integrity | Only fully validated menus go live |

---

## Current Source Stack

### 1. Menu Correctness Engine (MCE)
- **17 validation rules** across 5 Laws
- Publish-gate blocks invalid menus from going live
- Client-side validation on the project update path
- Active runtime flag: `ENABLE_MCE: true`
- Source-gated MCE evidence; not current launch certification
- Docs: `__docs__/menu-correctness-engine/`

### 2. Versioned Publishing And Source Writes
- Project updates persist menu data plus MCE metadata through the existing DAL path
- Publish metadata such as `menuVersion` and `lastPublishedAt` identifies the approved customer-visible source
- Current approval requires the same audit, runbook, verifier, browser/device QA, target deploy evidence, and production-host smoke listed above

### 3. Public Cache And Surface-Specific Refresh
- Public menu and OBP routes use cache tags and the 60-second public cache window
- Digital Screens use their own `screen-data` cache, local cache-first display path, and content-version listener
- QR links resolve to the public menu URL and inherit that public menu cache path
- PDF artifacts, POS integrations, Google/third-party surfaces, and other downloaded or provider targets need separate target evidence
- The cache window is not a universal freshness promise

### 4. Hours Status Display
- Open/Closed badge on client menu and OBP
- Timezone-aware calculation
- Feature flag: `ENABLE_HOURS_STATUS_DISPLAY: true` (active)

### 5. Per-Item Availability
- Available/Unavailable toggles per item in editor
- Reflected through the publish and cache path
- Command Center allows bulk availability changes

### 6. Show-Less Fallbacks
- MCE blocks empty categories and missing prices
- Fallback states for missing data (show less, not wrong)

### 7. Supported Surface Source Contract
- Supported MenuList surfaces read from the same saved project/store source through their audited paths
- Public cache invalidation, screen content-version touches, generated artifacts, and provider sends are verified per target

---

## What Must NEVER Happen

| Event | Impact | Prevention |
|-------|--------|-----------|
| Customer sees wrong price | Trust collapse | MCE price validation rules |
| Customer sees wrong hours | Anger + bad reviews | Hours status badge sourced from store hours and timezone data |
| Customer sees outdated menu | Trust loss | Public cache invalidation, the 60-second public cache window, and target-specific QA evidence |
| Customer sees empty menu | Unprofessional | MCE required-field checks and fallback states |
| Customer arrives but item missing | Bad experience | Availability toggles |

---

## Maintenance Discipline (Ongoing)

This pillar requires reliability discipline and current evidence:

1. **Keep MCE active** - Project update paths covered by current source gates must preserve the `ENABLE_MCE: true` runtime hook.
2. **Do not increase cache TTL** beyond the current public cache boundary without updating docs, verifiers, and release evidence.
3. **Preserve acknowledged write, publish, and cache-invalidation paths** before showing local success.
4. **Test hours accuracy** when timezone logic changes
5. **Track target evidence** in the production-readiness audit and External Certification Runbook before making public release claims.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Cache serves stale data beyond the public cache window | Verify cache headers, revalidation tags, and the write path that triggers public cache refresh |
| MCE blocks valid menus (false positive) | Rules are conservative — only block clearly broken data |
| Hours timezone calculation error | Using `date-fns` with store-specific timezone |
| External or downloaded target drifts | Require target-specific artifact/provider/device evidence before claiming freshness |
| Docs overstate the runtime | `npm run verify:public-business-truth` rejects stale blanket freshness and correctness claims |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** July 4, 2026
