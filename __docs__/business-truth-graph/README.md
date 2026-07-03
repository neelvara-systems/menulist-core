# Business Truth Graph

> **Strategic conceptual model for MenuList's data architecture — the structured, continuously validated model of what a business is in the public world.**

**Created:** March 8, 2026  
**Source:** ChatGPT Strategic Session #13 → Cascade Critical Review  
**Status:** ✅ REVIEW COMPLETE + IMPLEMENTATION DONE (March 8, 2026)  
**Type:** Strategic Architecture Document + Implementation of accepted items

---

## Quick Navigation

| Document                                                             | Audience         | Purpose                                        |
| -------------------------------------------------------------------- | ---------------- | ---------------------------------------------- |
| [ChatGPT Session #13 Review](./_archive/chatgpt-review-session13.md) | Engineering, CEO | Full critical review with codebase cross-check |

---

## What Is This?

The Business Truth Graph (BTG) is a **conceptual vocabulary** for describing MenuList's existing data architecture. It was proposed by ChatGPT as a "missing layer" — but cross-referencing against the codebase revealed that ~75-80% of it is already implemented (after accepted improvements were built).

### BTG is NOT:

- ❌ A new system to build
- ❌ A graph database migration
- ❌ A separate product

### BTG IS:

- ✅ A useful framing for what MenuList already does
- ✅ A vocabulary for investor/partner conversations
- ✅ A taxonomy that identifies ~20-25% remaining gaps (future scope)

---

## Layer Status Overview

| Layer                  | Status                    | Coverage |
| ---------------------- | ------------------------- | -------- |
| Menu Graph             | ✅ Strong                 | 100%     |
| Temporal Events (MOL)  | ✅ Strong                 | 100%     |
| Surface Representation | ✅ Strong                 | 100%     |
| Schema.org Layer       | ✅ Strong                 | 100%     |
| Category & Taxonomy    | ✅ Strong                 | 90%      |
| Public Status          | ✅ Implemented            | 90%      |
| Location               | ✅ Implemented            | 85%      |
| Contact                | ✅ Implemented            | 95%      |
| Identity               | ✅ Implemented            | 80%      |
| Hours & Availability   | ✅ Core done              | 70%      |
| Reputation             | ⏳ Blocked (GBP)          | 60%      |
| Surface Drift (GBP)    | ⚠️ Partial                | 60%      |
| Verification           | ⚠️ Partial                | 30%      |
| Media Graph            | ❌ Minimal                | 25%      |
| Business Attributes    | ✅ Implemented (flag off) | 85%      |
| Citation Graph         | ❌ Not built              | 0%       |

**Overall: ~75-80% complete** — after implementing reservation/order URLs + business attributes layer.

---

## Key Decision

**REJECTED:** Collection-per-layer Firestore storage (12x cost increase).  
**VALIDATED:** Current embedded-document approach on StoreDataType is correct and cost-optimal.

---

## Related Documentation

| Document                       | Location                                                          |
| ------------------------------ | ----------------------------------------------------------------- |
| Category Dominance Doctrine    | `__docs__/constitution/15-category-dominance-doctrine.md`         |
| Infrastructure Compounding     | `__docs__/constitution/17-infrastructure-compounding-doctrine.md` |
| Canonical Truth Infrastructure | `__docs__/canonical-truth-infrastructure/README.md`               |
| Hours & Holiday Accuracy       | `__docs__/hours-holiday-accuracy/README.md`                       |
| Temp Status Layer              | `__docs__/temp-status-layer/README.md`                            |
| Reviews & Reputation           | `__docs__/reviews-reputation/README.md`                           |
| SEO/AEO Discovery              | `__docs__/discovery-infrastructure/README.md`                     |
| GBP Sync                       | `__docs__/gbp-sync/README.md`                                     |
| Official Business Page         | `__docs__/official-business-page/README.md`                       |

---

**Last Updated:** March 8, 2026
