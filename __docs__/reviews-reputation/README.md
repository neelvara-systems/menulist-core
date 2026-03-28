# Reviews & Reputation

**Feature:** Reviews & Reputation  
**Status:** 🔒 SPEC LOCKED — Implementation blocked until GBP API access granted  
**Version:** 1.0  
**Last Updated:** February 2, 2026

---

## Quick Navigation

| Document                                                  | Audience          | Purpose                                       |
| --------------------------------------------------------- | ----------------- | --------------------------------------------- |
| [Product Spec](./reviews-reputation_spec.md)              | CEO, PM, Business | Business requirements, user stories, scope    |
| [Implementation Plan](./reviews-reputation_impl.md)       | Developers        | Technical blueprint, DB schema, API contracts |
| [Marketing Collateral](./reviews-reputation_marketing.md) | Sales, Marketing  | Pitch deck, landing page copy, messaging      |

### Archive

| Document                                                                      | Purpose                              |
| ----------------------------------------------------------------------------- | ------------------------------------ |
| [ChatGPT Critical Review](./_archive/CHATGPT-CONVERSATION-CRITICAL-REVIEW.md) | Original ChatGPT conversation review |
| [Initial Spec](./_archive/REVIEWS_REPUTATION_SPEC.md)                         | First locked spec (superseded)       |

---

## One-Line Description

> **Defensive infrastructure that prevents irreversible public reputation damage.**

---

## Architecture Overview (60 Seconds)

```
Google Reviews → MenuList (Read-Only) → Classification → Owner Warning

States:
• benign/informational → [SILENCE - Owner sees nothing]
• negative_high_risk   → "It's better not to respond to this publicly."
• volatile             → "A recent review may need careful handling."
```

**Key Principle:** Owner sees at most 2 sentences. No dashboards. No analytics. Just protection.

---

## Key Files in Codebase

| File                                                            | Purpose                               | Status     |
| --------------------------------------------------------------- | ------------------------------------- | ---------- |
| `src/types/reviews.ts`                                          | Review, ReviewState types             | 🔶 BLOCKED |
| `src/database/reviews/index.ts`                                 | DAL for reviews collections           | 🔶 BLOCKED |
| `src/app/api/reviews/states/route.ts`                           | GET review states API (booleans only) | 🔶 BLOCKED |
| `src/components/templates/main-app/reviews/ReputationGuard.tsx` | Passive warning notice (auto-expires) | 🔶 BLOCKED |
| `functions/src/reviews/reviewsIngestion.ts`                     | Cloud Function - ingestion            | 🔶 BLOCKED |
| `functions/src/reviews/reviewsClassifier.ts`                    | Cloud Function - classification       | 🔶 BLOCKED |
| `functions/src/reviews/classificationRules.ts`                  | Classification rules                  | 🔶 BLOCKED |

---

## Feature Flags

```typescript
// src/config/features.ts

ENABLE_REVIEWS_REPUTATION: false; // Master toggle - INACTIVE until GBP access
REVIEWS_CLASSIFICATION: true; // Rule-based classification
REVIEWS_BLOCK_STATE: true; // Block dangerous replies
REVIEWS_ESCALATION: true; // Rare escalation notices
```

---

## Dependencies

| Dependency                   | Status      | Impact                        |
| ---------------------------- | ----------- | ----------------------------- |
| **GBP API Access**           | 🔶 BLOCKED  | Cannot implement without this |
| GBP Sync Feature             | 🔶 BLOCKED  | Shares same dependency        |
| Internal Feedback            | ✅ COMPLETE | Cross-reference integration   |
| MOL (Menu Observation Layer) | ✅ COMPLETE | Logging integration           |

---

## Hard Bans (NEVER Build)

| Feature                 | Reason                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ~~AI reply generation~~ | ~~Pre-Rejected Feature~~ → **UPGRADED**: AI reply **suggestions** allowed (owner must review + approve before posting). See `__docs__/reputation-protection/reputation-protection_spec.md` |
| AI auto-post replies    | Owner MUST review before posting. Google GBP API requires explicit action.                                                                                                                 |
| Sentiment dashboard     | Violates Law 7                                                                                                                                                                             |
| Rating analytics        | Violates Law 7                                                                                                                                                                             |
| Review gating           | FTC violation                                                                                                                                                                              |
| Reply templates         | Breaks authority                                                                                                                                                                           |

---

## Related Documentation

| Document                 | Location                                             |
| ------------------------ | ---------------------------------------------------- |
| Internal Feedback System | `__docs__/projects/internal-feedback-system/`        |
| GBP Sync                 | `__docs__/gbp-sync/`                                 |
| Core Doctrine            | `__docs__/constitution/01-core-doctrine.md`          |
| Language Governance      | `__docs__/constitution/02-language-governance.md`    |
| Feature Rejection Gate   | `__docs__/constitution/08-feature-rejection-gate.md` |

---

## Version History

| Version | Date        | Changes                                       |
| ------- | ----------- | --------------------------------------------- |
| 1.0     | Feb 2, 2026 | Initial spec complete, implementation blocked |

---

## Document Owners

| Role            | Responsibility                          |
| --------------- | --------------------------------------- |
| **Product**     | Spec accuracy, user stories             |
| **Engineering** | Implementation plan, technical accuracy |
| **Marketing**   | Approved language, messaging            |
| **Founder**     | Final approval, doctrine alignment      |

---

**IMPLEMENTATION STATUS:** 🔶 BLOCKED (GBP API dependency)

_This feature is defined, not built. Implementation begins only after GBP API access is granted._
