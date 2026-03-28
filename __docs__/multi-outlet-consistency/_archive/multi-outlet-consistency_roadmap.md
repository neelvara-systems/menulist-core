# Multi-Outlet Brand Consistency — Feature Roadmap

> **Status:** Post-Launch Planning  
> **Last Updated:** 2026-01-22  
> **Foundation:** `multi-outlet-consistency_impl.md` (Shipped)  
> **Review Method:** ChatGPT suggestions filtered through MenuList Constitution

---

## Executive Summary

The Multi-Outlet Brand Consistency feature enables **silent brand governance** — HQ menus propagate to outlets without owner intervention. This document filters external suggestions through MenuList's core philosophy.

**North Star:** _"The owner forgets when they last touched the menu."_

**Current State (Shipped):**

- ✅ Master-store linking (silent propagation)
- ✅ Item inheritance with override support
- ✅ InheritanceBadge UI (minimal, non-intrusive)
- ✅ Locked brand-critical fields (automatic governance)
- ✅ MOL event logging (internal only, not exposed)

---

## ⚠️ ChatGPT Suggestion Review

**Review Applied:** Feature Rejection Gate (5 Questions) + 10 Laws of MenuList

### Feature Rejection Gate (ALL must pass)

```
1. Does it REMOVE a decision? (Not add an option)
2. Would anyone NOTICE if we didn't build it?
3. Does it strengthen the CORE MOMENT (customer decides faster)?
4. Can you explain it in ONE SENTENCE without "and"?
5. Will this still MATTER in 3 years?
```

---

## 🔴 REJECTED SUGGESTIONS (Violate Constitution)

| ChatGPT Suggestion               | Rejection Reason                                                 | Law Violated                       |
| -------------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| **Override Audit Trail UI**      | Creates "audit mindset" — owners obsessing over who changed what | Law 8: Trust > Engagement          |
| **Analytics Dashboard**          | Pre-rejected category — creates owner obsession                  | Pre-Rejected List                  |
| **Approval Workflows**           | ADDS decisions (approve/reject) instead of removing them         | Law 6: No Cognitive Load           |
| **Override Analytics Dashboard** | Pre-rejected — analytics expansion                               | Pre-Rejected List                  |
| **POS/Inventory Sync**           | Pre-rejected — "we're not a connector"                           | Pre-Rejected List                  |
| **External Channel Sync**        | Pre-rejected — connector feature                                 | Pre-Rejected List                  |
| **Franchise Revenue/Royalties**  | Out of scope — we're menu, not accounting                        | Law 7: No Feature Without Autonomy |
| **Outlet Roles Matrix**          | ADDS complexity — current Owner/Manager sufficient               | Law 6: No Cognitive Load           |
| **Multi-Outlet Search/Filters**  | HQ dashboard obsession feature                                   | Law 8: Trust > Engagement          |
| **Bulk Actions UI**              | Creates "mass control" mindset, not autonomy                     | Law 7: No Feature Without Autonomy |
| **Rules Engine**                 | Over-engineering — complexity without autonomy                   | Law 6: No Cognitive Load           |
| **Version Control/Rollback**     | Creates audit/revert mindset                                     | Law 8: Trust > Engagement          |
| **Change Approvals**             | Dual authority problem                                           | Law 1: Default Authority           |

### Explicit Disagreements

**1. "Override Audit Trail UI"**

> **DISAGREE** — ChatGPT assumes visibility = value. MenuList philosophy: visibility creates anxiety. MOL events exist for _support debugging_, not owner dashboards. Exposing "who changed what" creates blame culture, not trust.

**2. "Approval Workflows"**

> **DISAGREE** — This fundamentally violates Law 1 (Default Authority). The system decides. Adding approval = dual authority = trust erosion. If HQ doesn't trust outlets, that's an HR problem, not a software feature.

**3. "POS Integration"**

> **DISAGREE** — Explicitly pre-rejected. "We're not a connector." MenuList is menu authority, not middleware.

**4. "Analytics Dashboard"**

> **DISAGREE** — Pre-rejected category. "Override count per outlet" creates owner obsession with metrics. MenuList success = owner forgets the system exists, not checks dashboards daily.

---

## ✅ VALIDATED SUGGESTIONS (Pass Rejection Gate)

### 1. Auto Item Matching (on linking)

**Gate Check:**

1. ✅ Removes decision — Auto-matches items instead of manual mapping
2. ✅ Noticeable — Without it, linking destroys local content
3. ✅ Core moment — Faster onboarding for existing outlets
4. ✅ One sentence — "Smart linking preserves your existing menu items"
5. ✅ 3-year relevance — Fundamental to multi-outlet adoption

**Verdict:** **APPROVED** — Silent auto-matching, NO conflict UI

```typescript
// Automatic item matching during link (NO UI)
interface AutoMatchResult {
  autoMatched: { localId: string; masterId: string }[];
  localOnlyItems: string[]; // Keep as local-only automatically
}
// System decides. No owner intervention.
```

---

### 2. SKU/PLU Code Support

**Gate Check:**

1. ✅ Removes decision — Universal identifier eliminates name-matching guesswork
2. ✅ Noticeable — Chains need SKU for inventory systems
3. ✅ Core moment — Item lookup by SKU is faster
4. ✅ One sentence — "Items have universal SKU codes"
5. ✅ 3-year relevance — Industry standard

**Verdict:** **APPROVED** — Add to item schema (optional field, no UI prominence)

```typescript
interface ExtractedDataItem {
  // ... existing
  sku?: string; // Optional, silent field
}
```

---

### 3. Price Variance Limits (Silent Enforcement)

**Gate Check:**

1. ✅ Removes decision — System blocks invalid prices automatically
2. ⚠️ Noticeable — Only if override fails (silent otherwise)
3. ✅ Core moment — Prevents pricing errors reaching customers
4. ✅ One sentence — "Prices stay within brand tolerance"
5. ✅ 3-year relevance — Brand governance fundamental

**Verdict:** **APPROVED** — SILENT enforcement, NO UI controls

```typescript
// Tenant-level config (support-configured, not owner UI)
interface PriceGovernance {
  maxVariancePercent: number; // e.g., 15
}

// Enforcement: Override silently rejected if out of bounds
// NO error message explaining why — just doesn't save
// Per Law 3: No Explanations
```

---

### 4. Multi-Language Inheritance (Silent)

**Gate Check:**

1. ✅ Removes decision — Languages auto-inherit from master
2. ✅ Noticeable — Multi-region chains need this
3. ✅ Core moment — Content appears in right language automatically
4. ✅ One sentence — "Outlets inherit master translations"
5. ✅ 3-year relevance — Internationalization fundamental

**Verdict:** **APPROVED** — Already implicit in current design, no changes needed

---

## 🟡 PARTIAL ACCEPT (Downgraded Scope)

### Master Preview Before Publish

**ChatGPT:** Full preview system with staging/production split.

**MenuList Reality:** This adds cognitive load ("should I publish?").

**Verdict:** **NO CHANGE** — Current immediate-propagation is correct per Law 1. Master changes propagate instantly. If HQ wants "preview," they test on a draft store.

---

### Conflict Detection UI

**ChatGPT:** Full diff UI with conflict resolution modal.

**MenuList Reality:** Owners shouldn't resolve conflicts — system should.

**Verdict:** **AUTO-RESOLVE ONLY** — System auto-matches by name/SKU, keeps rest as local-only. No UI asking owners to "resolve" anything.

---

## 📋 Final Validated Roadmap

| Feature                    | Status       | Implementation                     |
| -------------------------- | ------------ | ---------------------------------- |
| SKU field support          | **APPROVED** | Schema addition, optional field    |
| Auto item matching on link | **APPROVED** | Silent, no UI                      |
| Price variance limits      | **APPROVED** | Silent enforcement, support-config |
| Language inheritance       | **APPROVED** | Already in current design          |

**Total: 4 validated items (from 19 ChatGPT suggestions)**  
**Rejection Rate: 79%** — Most suggestions violated MenuList philosophy

---

## 🚫 Permanently Rejected (Do Not Build Ever)

| Feature                 | Permanent Rejection Reason            |
| ----------------------- | ------------------------------------- |
| Override Audit Trail UI | Creates audit mindset (Law 8)         |
| Approval Workflows      | Dual authority (Law 1)                |
| Analytics Dashboard     | Pre-rejected category                 |
| Outlet Role Matrix      | Cognitive load (Law 6)                |
| POS/Channel Integration | "Not a connector"                     |
| Franchise Royalties     | Out of scope                          |
| Price Governance UI     | Owners shouldn't configure governance |
| Conflict Resolution UI  | Owners shouldn't resolve conflicts    |
| Bulk Actions UI         | Mass control mindset                  |
| Rules Engine            | Over-engineering                      |
| Version Control         | Audit mindset                         |
| Change Approvals        | Dual authority                        |

---

## 📊 Risk Monitoring (Internal Only)

These signals are for **support debugging**, NOT owner dashboards:

```typescript
// Internal metrics (never exposed to owners)
interface MOLInternalMetrics {
  // Support use only
  orphanedOverrides: number;
  staleMasterItems: number;
  linkingFailures: number;
  priceVarianceRejections: number;
}
```

Per Law 6: Owners don't see these. Support uses them to fix problems silently.

---

## References

- `__docs__/constitution/01-core-doctrine.md` — 10 Laws
- `__docs__/constitution/08-feature-rejection-gate.md` — 5 Questions
- `multi-outlet-consistency_impl.md` — Shipped implementation

---

**Architect Note:** ChatGPT's suggestions reflect traditional SaaS thinking (more features = more value). MenuList philosophy is opposite: fewer decisions = more trust. The shipped multi-outlet feature already embodies this — silent inheritance, automatic governance, minimal UI. Most "future features" suggested would actively harm the product.
