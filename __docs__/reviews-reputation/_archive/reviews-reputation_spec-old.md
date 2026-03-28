# Reviews & Reputation — Specification

**Feature:** Reviews & Reputation  
**Version:** 1.0  
**Status:** 🔒 SPEC LOCKED — Implementation blocked until GBP API access granted  
**Author:** Lead Architect (Cascade)  
**Date:** February 2, 2026

---

## Surface Definition

> **Defensive infrastructure that prevents irreversible public reputation damage.**

This is NOT:
- A reviews feature
- A reputation management tool
- An analytics dashboard
- A reply automation system

This IS:
- A silent layer that stops owners from making public situations worse

---

## Owner-Visible Contract (FINAL)

Owners see **exactly two sentences**. Nothing more.

| State | Message |
|-------|---------|
| **Block** | "It's better not to respond to this publicly." |
| **Escalation** | "A recent review may need careful handling." |

**LOCKED:** No titles. No descriptions. No timestamps. No explanations.

Any addition breaks authority.

---

## Internal States (Names Only)

| State | Description (Internal Only) |
|-------|----------------------------|
| `benign` | Safe — no action needed |
| `informational` | Neutral — no action needed |
| `negative_low_risk` | Negative but recoverable |
| `negative_high_risk` | Triggers Block state |
| `volatile` | Triggers Escalation state |

Owners never see these states. Classification is rule-based.

---

## Hard Bans (PERMANENT)

These features will **never** be built:

| Banned Feature | Reason |
|---------------|--------|
| AI reply generation | Pre-Rejected Feature |
| Sentiment analytics dashboard | Pre-Rejected Feature |
| Rating optimization nudges | Pre-Rejected Feature |
| Review volume tracking | Violates Law 7 |
| Competitive benchmarking | Violates Law 3 |
| Review gating | FTC violation |
| Reply templates | Breaks authority |
| Performance metrics | Violates "Silence Is a Feature" |

---

## Dependency

**Implementation blocked until GBP API access is granted.**

Reviews ingestion requires Google Business Profile API access.  
GBP API access is currently BLOCKED (see `gbp-sync_spec.md`).

This spec is complete. No code until dependency is resolved.

---

## Integration Points

| System | Integration |
|--------|-------------|
| Internal Feedback | Cross-reference complaints |
| Hours System | Flag time-related reviews |
| Pricing Integrity | Flag price mismatch reviews |
| MOL | Log all system actions |

---

## Feature Flags

```typescript
ENABLE_REVIEWS_REPUTATION: false  // Master toggle - INACTIVE until GBP access
REVIEWS_CLASSIFICATION: true      // Rule-based classification
REVIEWS_BLOCK_STATE: true         // Block dangerous replies
REVIEWS_ESCALATION: true          // Rare escalation notices
```

---

## Firestore Schema

```
reviews/{tId}/{sId}/{reviewId}
```

Multi-tenant. Matches projects pattern.

---

**DOCUMENT STATUS:** 🔒 LOCKED  
**IMPLEMENTATION STATUS:** BLOCKED (GBP API dependency)

---

*This feature is now defined, not built.*
