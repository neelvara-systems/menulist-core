# Truth & Accuracy Dominance — Spec

**Status:** Maintenance Reference  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** CEO, PM, Clients (non-technical)  
**Pillar:** 2 of 6 — Customer-Facing Infrastructure

---

## Executive Summary

**What:** A structural guarantee that whatever customers see on MenuList is always correct — menu items, prices, hours, availability.

**Why:** 73% of consumers only trust information from the last 30 days (Sixth City Marketing 2025). Wrong info destroys trust instantly. A single wrong price or "open" status when closed creates anger and bad reviews.

**For whom:** Every MenuList business and their customers.

**Impact:** When customers trust MenuList info blindly, owners stop worrying about outdated PDFs and wrong Google listings. MenuList becomes the source of truth.

---

## Goals & Success Metrics

| Goal | Success Metric |
|------|---------------|
| Menu always accurate | Zero customer complaints about wrong menu info |
| Hours always correct | Open/Closed badge matches reality |
| Instant propagation | All surfaces updated within 60 seconds |
| No blank states | Customers never see empty menus or broken layouts |
| Publish integrity | Only fully validated menus go live |

---

## What Already Exists (Complete Truth Stack)

### 1. Menu Correctness Engine (MCE)
- **17 validation rules** across 5 Laws
- Publish-gate blocks invalid menus from going live
- Client-side (zero additional Firebase cost)
- Feature flag: `ENABLE_MCE: false` (ready to activate)
- Docs: `__docs__/menu-correctness-engine/`

### 2. Versioned Publishing
- Atomic publishing — menus are either fully published or not visible
- No half-updated states visible to customers
- Single `updateProject()` call with all data

### 3. 60-Second Propagation
- All public surfaces use `unstable_cache` with 60s TTL
- OBP, digital menu, digital screens, QR pages — all in sync
- CDN layer: `s-maxage=60, stale-while-revalidate=300`
- ~80% of HTML served from edge (zero Firestore reads)

### 4. Hours Status Display
- Real-time Open/Closed badge on client menu and OBP
- Timezone-aware calculation
- Feature flag: `ENABLE_HOURS_STATUS_DISPLAY: true` (active)

### 5. Per-Item Availability
- Available/Unavailable toggles per item in editor
- Reflected immediately on publish
- Command Center allows bulk availability changes

### 6. Zero-Blank Guarantee
- MCE blocks empty categories and missing prices
- Fallback states for missing data (show less, not wrong)

### 7. Multi-Surface Sync
- All surfaces read from same Firestore source
- Cache invalidation synchronized across OBP, menu, screens

---

## What Must NEVER Happen

| Event | Impact | Prevention |
|-------|--------|-----------|
| Customer sees wrong price | Trust collapse | MCE price validation rules |
| Customer sees wrong hours | Anger + bad reviews | Real-time hours status badge |
| Customer sees outdated menu | Trust loss | 60s propagation guarantee |
| Customer sees empty menu | Unprofessional | MCE zero-blank guarantee |
| Customer arrives but item missing | Bad experience | Availability toggles |

---

## Maintenance Discipline (Ongoing)

This pillar requires no new engineering. It requires **reliability discipline**:

1. **Never bypass MCE** — All menu saves go through validation
2. **Never increase cache TTL** beyond 60s for public surfaces
3. **Never allow half-publish states** — atomic or nothing
4. **Test hours accuracy** when timezone logic changes
5. **Monitor CDN hit rates** — should stay >70%

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Cache serves stale data >60s | CDN TTL set to 60s, stale-while-revalidate for graceful refresh |
| MCE blocks valid menus (false positive) | Rules are conservative — only block clearly broken data |
| Hours timezone calculation error | Using `date-fns` with store-specific timezone |
| Database propagation delay | Firestore writes are near-instant; 60s is the cache layer |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** February 19, 2026
