# Physical Surfaces — Product Specification

**Created:** January 11, 2026  
**Status:** ⚠️ **LEGACY — Superseded by [Menu Kit](../menu-kit/README.md) for identity surfaces**  
**Source:** ChatGPT Brainstorm (Jan 11, 2026) + Architecture Validation  
**Applies:** 3-Year Architecture Freeze Rule  
**Note:** This spec describes campaign-based recommendation surfaces. The strategically stronger approach (identity infrastructure surfaces) is implemented in Menu Kit. See `_archive/chatgpt-review.md` for the full strategic analysis.

## Current Release Boundary

This document is historical strategy/spec evidence only. It is not current implementation approval, deploy approval, or launch certification. Active physical/print output approval routes through the current Menu Kit and Menu Card Export source truth, the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, `npm run verify:menu-card-export`, browser/mobile output QA, visual print artifact review, target deploy evidence, and production-host smoke.

---

## Executive Summary

Physical Surfaces extends MenuListAi's decision intelligence to **printable materials** that create permanent public dependency. Unlike Digital Screens (which can be turned off), printed materials become part of the physical environment.

### Surfaces Covered

| Surface             | Format    | Location        | PONR Level |
| ------------------- | --------- | --------------- | ---------- |
| **Tent Card**       | A6/A5     | Tables/counters | Medium     |
| **Counter Sticker** | 8cm × 8cm | Billing counter | High       |

### The Core Insight

```
Digital Screens = Passive persuasion (customer notices)
Physical Surfaces = Active interruption (customer can't miss)
```

Once printed:

- Customers see MenuList recommendations
- Staff references them
- Removing them creates visible gap
- **MenuList becomes physically embedded**

---

## Why This Exists (PONR Strategy)

Per ChatGPT analysis, Digital Screens alone don't create sufficient dependency because:

- Owner can turn off TV
- Staff might not notice
- Customers might not look

Physical surfaces create **irreversible** dependency:

- Printed = permanent until replaced
- Visible to every walk-in customer
- Staff naturally references what's printed
- Removal creates awkward blank space

---

## 1. Tent Card Mode

### What It Is

A printable card (A6 or A5) placed on tables/counters with:

1. **One strong line of copy** (system-decided)
2. **QR code** (subtle)
3. **Small brand footer**

### What It Is NOT

- ❌ "Scan for menu" generic QR
- ❌ Owner-written marketing copy
- ❌ Multiple items/offers
- ❌ Price claims or discounts

### Sample Output

```
┌─────────────────────────────────────┐
│                                     │
│   Most customers order              │
│   Butter Chicken                    │
│                                     │
│          [QR CODE]                  │
│                                     │
│   joespizza.menulist.ai             │
└─────────────────────────────────────┘
```

### Owner Experience

In Today tab (only when confidence ≥ threshold):

```
┌───────────────────────────────────────┐
│  Table tent is ready                  │
│                                       │
│  Best for walk-in customers today     │
│                                       │
│  [Download tent card]                 │
│                                       │
│  Size: A6 (recommended for tables)    │
└───────────────────────────────────────┘
```

**Critical:** No editing. No copywriting. No size selection. Download or ignore.

### Size Selection (System-Decided)

| Surface Type | Size | Reason                   |
| ------------ | ---- | ------------------------ |
| Table tent   | A6   | Standard table size      |
| Counter tent | A5   | Visibility from distance |

**Owner never chooses.** System decides based on placement context.

### Confidence Gate

Higher than campaigns: **≥ 0.7** (printed = public + persistent)

If nothing qualifies → Don't show the option

### Copy Templates (LOCKED — 5 ONLY)

| #   | Template                                           | Use Case              | Print Eligible      |
| --- | -------------------------------------------------- | --------------------- | ------------------- |
| 1   | "Most customers order {{item_name}}"               | Default social proof  | ✅ Yes              |
| 2   | "Short on time? {{item_name}} is ready fastest"    | Quick Pick winner     | ✅ Yes              |
| 3   | "If you're unsure, start with {{item_name}}"       | Decision helper       | ✅ Yes (edge cases) |
| 4   | "{{item_a}} + {{item_b}} is the most chosen combo" | Combo (if applicable) | ✅ Yes              |
| 5   | "Customers often try this first"                   | Exploration           | ❌ **BANNED**       |

**Template 5 banned from print.** Exploratory language undermines authority on permanent surfaces.

**No other templates.** No experiments. No A/B testing.

---

## 2. Counter Sticker Mode

### What It Is

A small sticker (8cm × 8cm) placed at billing counter with:

1. **One authoritative instruction** (system-decided)
2. **QR code** (small)

### Why Higher Stakes

Counter stickers are:

- Seen at **decision point** (ordering/paying)
- Permanent (harder to remove than tent cards)
- More public (every customer sees)

### Confidence Gate

Highest of all surfaces: **≥ 0.8** (permanent + every customer sees)

Additional requirements:

- Item stable for ≥ 7 days
- Not suppressed
- Not seasonal
- Not new (< 14 days old)

**If nothing qualifies → DO NOT SHOW THIS OPTION**

Silence > risk.

### Owner Experience

In Today tab (only when confidence is **very high**):

```
┌───────────────────────────────────────┐
│  Counter sticker is ready             │
│                                       │
│  Recommended for billing counter      │
│                                       │
│  [Download sticker]                   │
│                                       │
│  Size: 8cm × 8cm                      │
│  Language: English                    │
└───────────────────────────────────────┘
```

### Copy Templates (LOCKED — 4 ONLY)

| #   | Template                              | Authority Level |
| --- | ------------------------------------- | --------------- |
| 1   | "Most customers order this first"     | Default         |
| 2   | "Regular customers choose this"       | Regulars        |
| 3   | "Not sure what to order? Start here." | Safety          |
| 4   | "This combo is chosen most often"     | Combo (rare)    |

**Absolute rules:**

- No prices
- No emojis
- No urgency
- No marketing language

Authority = boring confidence.

---

## Technical Architecture

### Data Flow

```
CMI Confidence Data
        ↓
Tent Card/Sticker Eligibility Check
        ↓
Template Selection (system-decided)
        ↓
PDF/PNG Generation (client-side)
        ↓
Download
```

### Backend (Minimal)

Reuses existing:

- `TodayCampaignSummary` from campaigns
- `CampaignConfidence` scoring
- Decision Blocks winner

**New fields in campaign summary:**

```typescript
interface CampaignsSummaryDocument {
  // ...existing

  physicalSurfaces?: {
    tentCard?: {
      eligible: boolean;
      itemId?: string;
      itemName?: string;
      templateId: 1 | 2 | 3 | 4 | 5;
      confidence: number;
      validUntil: Timestamp;
    };
    counterSticker?: {
      eligible: boolean;
      itemId?: string;
      itemName?: string;
      templateId: 1 | 2 | 3 | 4;
      confidence: number;
      stableSinceDays: number;
      validUntil: Timestamp;
    };
  };
}
```

### Frontend (PDF Generation)

Use client-side PDF generation (no server):

```typescript
// TentCardGenerator.tsx
import { jsPDF } from "jspdf";

export function generateTentCardPDF(
  itemName: string,
  template: number,
  qrUrl: string,
  size: "A6" | "A5",
): Blob {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: size.toLowerCase(),
  });

  // Add content based on template
  const copy = getTemplateCopy(template, itemName);
  doc.setFontSize(24);
  doc.text(copy, doc.internal.pageSize.width / 2, 40, { align: "center" });

  // Add QR (using qrcode library)
  // ...

  return doc.output("blob");
}
```

---

## What We DO NOT Build

| Feature                     | Why Rejected                 |
| --------------------------- | ---------------------------- |
| ❌ Tent card editor         | Creates management burden    |
| ❌ Custom copy input        | Invites owner mistakes       |
| ❌ Multiple sticker options | Decision fatigue             |
| ❌ Analytics for prints     | Encourages over-optimization |
| ❌ Template selection       | System decides               |
| ❌ A/B testing              | Complexity for no value      |

**If the owner can "optimize" this, trust dies.**

---

## Success Criteria

**Success definition (internal only):**

```
- Owner printed once
- Owner never asked to change it
```

That's it.

**NO scan metrics. NO conversion tracking. NO analytics.**

Printed surfaces are authority objects, not optimization targets.

---

## Failure Modes & Protections

| Failure          | Cause                 | Protection                     |
| ---------------- | --------------------- | ------------------------------ |
| Owner distrust   | Wrong recommendation  | High confidence gate           |
| Looks spammy     | Too much text         | One sentence only              |
| Owner overthinks | Too many options      | Zero options                   |
| Stale content    | Item changed          | Auto-invalidate on menu change |
| Wrong language   | Auto-detection failed | Offer language selection       |

---

## Implementation Order (Internal Only)

**Both surfaces ship as a single capability set.**

Execution sequence for development, not phased launch:

### Tent Card

- [ ] Add `physicalSurfaces.tentCard` to summary document
- [ ] Create eligibility check in campaign sync
- [ ] Build TentCardGenerator component
- [ ] Add download UI to Today tab
- [ ] Test PDF rendering on various devices

### Counter Sticker

- [ ] Add `physicalSurfaces.counterSticker` to summary
- [ ] Implement higher confidence gate (0.8)
- [ ] Add stability check (7 days)
- [ ] Build StickerGenerator component
- [ ] Add download UI to Today tab

---

## Files to Create/Modify

| File                                                                     | Purpose                    |
| ------------------------------------------------------------------------ | -------------------------- |
| `src/lib/physical-surfaces/tentCardGenerator.ts`                         | PDF generation             |
| `src/lib/physical-surfaces/stickerGenerator.ts`                          | PNG generation             |
| `src/lib/physical-surfaces/templates.ts`                                 | Copy templates             |
| `src/components/templates/main-app/today/components/TentCardSection.tsx` | UI                         |
| `src/components/templates/main-app/today/components/StickerSection.tsx`  | UI                         |
| `src/types/campaigns.ts`                                                 | Add physicalSurfaces types |
| `src/database/campaigns/index.ts`                                        | Add sync functions         |

---

## Dependencies

- `jspdf` — PDF generation (~30KB)
- `qrcode` — QR code generation (already used)

---

## Firebase Cost Impact

**Zero additional reads/writes** — Reuses existing campaign summary document.

---

## Future Consideration: Surface Separation (Not Now)

**Current:** Physical Surfaces appear in Today tab.

**Mental Model Risk:**

- Today = ephemeral (daily refresh)
- Physical Surfaces = permanent (printed, deployed)

Mixing them may weaken perceived seriousness of printed materials.

**Future-Safe Architecture (Document Only — No Action Now):**

| Surface                        | Role                                            |
| ------------------------------ | ----------------------------------------------- |
| Today Tab                      | **Activation surface** — "A tent card is ready" |
| Physical Surfaces Tab (future) | **Deployment surface** — "Active in store"      |

This separation prevents re-thinking loops. Owner sees printed surfaces as "deployed infrastructure", not "today's task".

**No implementation needed now.** Today Tab integration is correct for MVP.

---

**Document Status:** Historical legacy spec; not current implementation approval
**Estimated Effort:** 2 weeks total
**Priority:** P1 (after screen hardening)
