# Knowledge Base — Marketing & Sales Collateral

> **Version:** 2.0.0
> **Last Updated:** 2026-07-18
> **Audience:** Sales, Marketing (Internal)

---

## 1. Elevator Pitch

**One-liner:** "Keep published support articles organized, searchable, and connected to the answers customers actually receive."

**30 seconds:** Answerlattice gives a SaaS founder one governed article workflow for browsing, support retrieval, and feedback. Live edits update navigation and freshness state together, stale vectors are removed before regeneration, and unanswered or disliked content remains reviewable evidence rather than becoming automatic truth.

---

## 2. Key Selling Points

| Point | Evidence |
|-------|---------|
| **Governed support source** | Published articles can support browsing, retrieval, citations, FAQs, and product context |
| **1-read navigation** | Entire KB structure loads in a single Firestore read |
| **Rich content** | TipTap editor — formatting, lists, images, code blocks |
| **Search readiness is explicit** | Current `embeddingStatus` and the active vector must agree before publish/search-ready claims |
| **Safe management** | Article and navigation changes commit together; non-empty containers cannot be deleted accidentally |
| **Source provenance** | Track which uploaded file generated each article |
| **Feedback built in** | Published-content reactions use one server transaction, bounded audit history, and retention |
| **Status lifecycle** | Draft → Review → Published → Archived |

---

## 3. Claim boundary

Do not sell the Knowledge Base as a generic CMS, a full help desk, or proof that generated answers are correct. The defensible value is the controlled article lifecycle behind Answerlattice's governed answer and retrieval surfaces. Pricing, competitor feature, accuracy, and cost comparisons require current external verification before publication.
