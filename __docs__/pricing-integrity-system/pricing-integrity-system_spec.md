# Pricing Integrity System — Product Specification

**Document Type:** Non-Technical PRD  
**Status:** ✅ READY FOR IMPLEMENTATION  
**Priority:** P0 (Feature #1 — LOCKED)  
**Date:** January 18, 2026  
**Author:** Lead Architect  
**Target ICP:** Premium SMB (India + Non-India)

> **Scope Clarification:** Web/QR menu and Staff Prompt already read live from Firestore—no new work needed. This feature is specifically about **Screens refresh** and **PDF auto-regeneration**.

---

## Executive Summary

### What Is This?

Pricing Integrity guarantees that menu prices are **always consistent** across all MenuList surfaces. When an owner changes a price once, it updates everywhere automatically—QR menu, PDF, screens, and staff view.

### Why Does This Matter?

Premium businesses lose trust instantly when prices don't match. A customer seeing ₹299 on the QR menu and ₹349 on the PDF creates:

- Public embarrassment
- Billing arguments at the counter
- Brand damage
- Owner anxiety ("is everything correct?")

### The Promise

> **"Change a price once. It updates everywhere."**

Owner changes price → MenuList propagates → Owner never thinks about consistency again.

---

## Goals

| Goal                            | Success Metric                                   |
| ------------------------------- | ------------------------------------------------ |
| **Eliminate price mismatches**  | Zero discrepancy across surfaces                 |
| **Remove owner mental load**    | Owner never manually "syncs" anything            |
| **Maintain premium perception** | No formatting bugs, no layout breaks             |
| **Enable silent autonomy**      | System works without explanation or notification |

---

## Scope

### ✅ In Scope (P0 — Must Ship)

| Capability                      | Description                                                 | Dev Work?                |
| ------------------------------- | ----------------------------------------------------------- | ------------------------ |
| **Single Source of Truth**      | All pricing originates from MenuList UI edits               | ❌ Already exists        |
| **QR/Web Menu Consistency**     | Reads live from Firestore                                   | ❌ Already works         |
| **Staff Prompt Consistency**    | Reads live from Firestore                                   | ❌ Already works         |
| **Screen Version Refresh**      | Screens check version and refresh on price change           | ✅ **NEW**               |
| **PDF On-Demand Generation**    | Generate fresh PDF when owner clicks "Share/Download"       | ✅ **NEW**               |
| **PDF Background Regen (FLAG)** | Infrastructure built but disabled; enable if users complain | ✅ **NEW (flagged off)** |
| **PDF "Updated on" Footer**     | Shows date on PDF so stale forwards are visible             | ✅ **NEW**               |
| **Variant Integrity**           | Half/Full, Small/Large prices stay aligned                  | ❌ Already works         |
| **Add-on Integrity**            | Optional extras maintain correct pricing                    | ❌ Already works         |
| **Time-Slot Integrity**         | Brunch/Dinner/Happy Hour menus show correct prices          | ❌ Already works         |
| **Audit Trail (MOL)**           | Immutable log of all price changes (internal only)          | ✅ **NEW**               |
| **Validation Rules**            | Price strings validated to prevent display bugs             | ✅ **NEW**               |

### ❌ Out of Scope (Explicit Exclusions)

| Excluded                | Reason                                             |
| ----------------------- | -------------------------------------------------- |
| Swiggy/Zomato sync      | External channel complexity; not owned by MenuList |
| POS integrations        | External system; out of control                    |
| Analytics dashboards    | Violates "no monitoring" doctrine                  |
| Recommended pricing     | Decision Blocks don't change prices                |
| Owner approval flows    | Owner IS the editor; no extra confirmation         |
| Multi-currency per menu | One currency per outlet (existing architecture)    |

---

## User Stories

### Story 1: Owner Changes Item Price

> As a premium restaurant owner, I change the price of "Truffle Pasta" from ₹899 to ₹949 in MenuList.
>
> **Expected:** Within seconds, the new price appears on:
>
> - My QR menu link
> - My downloadable PDF
> - My digital screens
> - Staff prompt view
>
> **I never click "sync" or "regenerate PDF".**

### Story 2: Owner Updates Variant Price

> As a café owner, I increase "Large Latte" from ₹249 to ₹279 while keeping "Regular Latte" at ₹199.
>
> **Expected:** Both prices stay correct everywhere. The PDF shows updated variant pricing without me regenerating it manually.

### Story 3: Owner Manages Time-Based Menu

> As a lounge owner, I have different pricing for Happy Hour (5-8 PM).
>
> **Expected:** During Happy Hour, all surfaces show Happy Hour prices. Outside that window, regular prices display. No manual switching required.

### Story 4: Owner Uses "Market Price"

> As a seafood restaurant owner, I mark "Lobster" as "Market Price" instead of a fixed number.
>
> **Expected:** "Market Price" displays correctly on all surfaces without formatting bugs or layout breaks.

---

## Functional Requirements

### FR-1: Price Source of Truth

| Requirement | Detail                                                                |
| ----------- | --------------------------------------------------------------------- |
| **FR-1.1**  | Owner-edited price in MenuList UI is the authoritative source         |
| **FR-1.2**  | Decision Blocks may influence presentation but MUST NOT change prices |
| **FR-1.3**  | Price changes are immediate upon save (Save = Live)                   |

### FR-2: Surface Propagation

| Surface             | Update Behavior           | SLA                               | Dev Work?            |
| ------------------- | ------------------------- | --------------------------------- | -------------------- |
| **QR/Web Menu**     | Immediate (reads from DB) | < 2 seconds                       | ❌ Already works     |
| **Staff Prompt**    | Immediate (reads from DB) | < 2 seconds                       | ❌ Already works     |
| **Digital Screens** | Version-based refresh     | ≤ 2 minutes                       | ✅ Add version check |
| **PDF Export**      | On-demand generation      | ≤ 15 seconds (progress indicator) | ✅ Add regen worker  |

### FR-3: Price Data Types

| Type    | Example                    | Supported |
| ------- | -------------------------- | --------- |
| Numeric | "299", "299.00"            | ✅        |
| Text    | "Market Price", "Seasonal" | ✅        |
| Range   | "199-249", "199 – 249"     | ✅        |

### FR-4: Price String Validation

| Rule                   | Constraint                                        |
| ---------------------- | ------------------------------------------------- |
| **Max Length**         | 20 characters                                     |
| **Allowed Characters** | Letters, numbers, spaces, `-`, `.`, `/`, `₹`, `$` |
| **Blocked**            | HTML, emojis, special symbols that break PDF      |
| **Normalization**      | Trim whitespace, standardize dash style           |

### FR-5: Time-Slot Pricing

| Requirement | Detail                                                        |
| ----------- | ------------------------------------------------------------- |
| **FR-5.1**  | Items visible in a time slot show correct price for that slot |
| **FR-5.2**  | Overlapping time slots blocked at save-time (not allowed)     |
| **FR-5.3**  | All surfaces respect same time-slot rules                     |

### FR-6: Variant & Add-on Pricing

| Requirement | Detail                                                 |
| ----------- | ------------------------------------------------------ |
| **FR-6.1**  | Base item may have price (optional if variants exist)  |
| **FR-6.2**  | Each attribute (variant/add-on) may have its own price |
| **FR-6.3**  | All attribute prices follow same validation rules      |

### FR-7: PDF Generation Strategy

| Requirement | Detail                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| **FR-7.1**  | On "Share PDF" or "Download PDF" click → generate fresh PDF on-demand        |
| **FR-7.2**  | Show progress indicator during generation (~5-15 seconds)                    |
| **FR-7.3**  | PDF footer shows "Updated on: [date]" to identify stale forwards             |
| **FR-7.4**  | Only ONE PDF stored per project (overwrite, no history)                      |
| **FR-7.5**  | If generation fails → show clean error, allow retry                          |
| **FR-7.6**  | Background regeneration infrastructure built but **flagged OFF**             |
| **FR-7.7**  | Enable background regen via flag only if real users complain about wait time |

**Why on-demand first:**

- No evidence that 10-second wait causes owners to send old PDFs
- Premium owners prefer fresh PDF over instant-but-stale
- Simpler to launch, validate with real usage, then optimize if needed
- Background infrastructure ready to enable via feature flag

### FR-8: Audit Trail (Internal Only)

| Requirement | Detail                                                        |
| ----------- | ------------------------------------------------------------- |
| **FR-8.1**  | Every price change logged with: who, what, when, before/after |
| **FR-8.2**  | Logs are immutable (append-only)                              |
| **FR-8.3**  | No user-facing audit UI (internal debugging only)             |

---

## Non-Functional Requirements

### Performance

| Metric                     | Target                               |
| -------------------------- | ------------------------------------ |
| Web/QR price update        | < 2 seconds after save               |
| Screen refresh             | ≤ 2 minutes                          |
| PDF generation             | ≤ 15 seconds (progress indicator)    |
| System handles rapid edits | No job explosion (debounce enforced) |

### Reliability

| Metric                 | Target                         |
| ---------------------- | ------------------------------ |
| PDF generation success | 99.5%                          |
| Retry recovery         | Must succeed within 3 attempts |
| Zero stale PDFs served | MANDATORY                      |

### Security

| Requirement              | Implementation                          |
| ------------------------ | --------------------------------------- |
| All API routes protected | `withAuth()` middleware                 |
| Tenant isolation         | `verifyTenantAccess()` on all writes    |
| Input validation         | Zod schemas for all price mutations     |
| Rate limiting            | Standard DATA_WRITE limits (50 req/min) |

---

## Architecture Overview (Non-Technical)

```
┌─────────────────────────────────────────────────────────────────┐
│                     OWNER EDITS PRICE                           │
│                    (MenuList Dashboard)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PRICING INTEGRITY ENGINE                       │
│  • Validates price string                                       │
│  • Writes to database (single source)                           │
│  • Logs change (audit trail)                                    │
│  • Triggers surface updates                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │ QR/Web + │        │ Screens  │        │   PDF    │
    │  Staff   │        │ (≤2 min) │        │(≤15 sec) │
    │(already  │        │  [NEW]   │        │  [NEW]   │
    │  works)  │        │          │        │          │
    └──────────┘        └──────────┘        └──────────┘
```

### What This Feature Actually Builds

| Component                      | Effort      | Why                                                |
| ------------------------------ | ----------- | -------------------------------------------------- |
| Screen version check           | ~2 days     | Screens poll `screens.version`; refresh if changed |
| PDF on-demand generation       | ~2 days     | Generate on click, show progress, add footer       |
| PDF background regen (flagged) | ~1 day      | Build infrastructure, keep disabled                |
| MOL audit logging              | ~1 day      | Append-only price change log                       |
| Price string validation        | ~1 day      | Zod schema, max 20 chars, no emojis                |
| **Total**                      | **~1 week** | Pragmatic, flag-gated                              |

---

## Firebase Cost Impact

| Operation            | Frequency          | Cost Impact                      |
| -------------------- | ------------------ | -------------------------------- |
| Price write          | Per edit           | 1 write per item/attribute       |
| Audit log write      | Per edit           | 1 write per change               |
| PDF generation       | On-demand          | 1 write per regen (not per edit) |
| Screen version check | Per screen refresh | 1 read per check                 |

**Estimated Monthly Cost (100 outlets, 10 price changes/day each):**

- Writes: ~30,000/month × $0.18/100K = **< $1**
- Reads: ~90,000/month × $0.06/100K = **< $1**
- Storage: PDF files ~5MB each = **< $1**

**Total: < $3/month** (negligible)

---

## Risks & Mitigations

| Risk                            | Likelihood | Impact | Mitigation                                        |
| ------------------------------- | ---------- | ------ | ------------------------------------------------- |
| PDF generation fails            | Low        | High   | 3-retry policy with exponential backoff           |
| Rapid edits cause job explosion | Medium     | Medium | 60-second debounce; only latest version generated |
| Price string breaks PDF layout  | Medium     | High   | Strict validation rules (max 20 chars, no emojis) |
| Time-slot conflicts             | Low        | Medium | Block overlapping slots at save-time              |

---

## Open Questions

| #   | Question                     | Status      | Resolution                              |
| --- | ---------------------------- | ----------- | --------------------------------------- |
| 1   | Save = Live or Save = Draft? | ✅ RESOLVED | **Save = Live** (per MenuList doctrine) |
| 2   | PDF debounce duration?       | ✅ RESOLVED | **60 seconds**                          |
| 3   | Screen refresh SLA?          | ✅ RESOLVED | **≤ 2 minutes**                         |
| 4   | Max price string length?     | ✅ RESOLVED | **20 characters**                       |

---

## Acceptance Criteria

### P0 Complete When:

- [ ] Editing item price updates Web/QR immediately
- [ ] Editing variant/add-on price updates Web/QR immediately
- [ ] Screens reflect updated pricing within 2 minutes
- [ ] Staff Prompt reflects updated pricing immediately
- [ ] PDF generates on-demand when owner clicks Share/Download
- [ ] PDF download always serves latest generated version
- [ ] Time-slot pricing shows correctly on all surfaces
- [ ] Overlapping time slots blocked at save-time
- [ ] All changes logged immutably
- [ ] System survives rapid edits without job explosion
- [ ] "Market Price" and range prices display without bugs

---

## Success Definition

> **Owner changes prices once and never checks "did it update everywhere?" again.**

That's the product. That's the moat.

---

## Why PDF Matters for Premium India

PDF is **not optional** for this ICP:

- **WhatsApp sharing is standard** — owners send menus as PDFs constantly
- **PDF feels "official"** — links feel temporary to corporate/event buyers
- **PDF works offline** — inside venues, network is unreliable
- **Digital menu is for consumption; PDF is for sharing** — both needed

If we skip PDF, we lose deals and hear "can you send a PDF?" constantly.

**Generation Strategy:**

- **Launch:** On-demand generation when owner clicks Share/Download (~10 seconds with progress indicator)
- **Future:** Background regeneration infrastructure built but disabled; enable via feature flag only if real users complain about wait time

This is pragmatic: ship simple, validate with real usage, optimize if needed.

---

## Approvals

| Role             | Name    | Status      |
| ---------------- | ------- | ----------- |
| Product Owner    | Danny   | ⏳ Pending  |
| Lead Architect   | Cascade | ✅ Approved |
| Engineering Lead | —       | ⏳ Pending  |

---

**Document Signature:** Lead Architect  
**Last Updated:** January 17, 2026
