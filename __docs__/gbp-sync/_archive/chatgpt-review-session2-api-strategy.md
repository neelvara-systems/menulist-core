# GBP API Approval Strategy — ChatGPT Review (Session 2)

**Date:** March 21, 2026  
**Source:** ChatGPT multi-session conversation (~16,000 lines) on GBP strategy  
**Reviewer:** Cascade (Lead Architect)  
**ChatGPT Accuracy:** ~35%

---

## Executive Summary

ChatGPT conversation covered GBP API access strategy, pre-API manual layers, reviews on OBP, mismatch detection, homepage repositioning, and multi-surface expansion. ~65% reinvents what already exists in codebase/docs. ~20% is valid new strategic framing. ~15% rejected.

---

## Cross-Check Results

### Already Exists (ChatGPT Unaware — ~65%)

| ChatGPT Topic | Existing Location | Status |
|---|---|---|
| GBP sync (OAuth, nightly sync, link/hours) | `__docs__/gbp-sync/` (10 docs) | SPEC LOCKED |
| Reviews ingestion + classification | `__docs__/reviews-reputation/` (10 docs) | SPEC LOCKED |
| AI reply assist + reputation protection | `__docs__/reputation-protection/` (8 docs) | Draft |
| Google rating badge on OBP | `publicPresence.googleRating/Count/ReviewUrl` | ✅ IMPLEMENTED |
| OBP photos (1-3 curated) | `publicPresence.photos[]` | ✅ IMPLEMENTED |
| "Add to Google" guided flow | `__docs__/menu-presence-monitor/` (7 docs) | Documented, flag OFF |
| Feature flags (GBP_SYNC, REVIEWS_REPUTATION, etc.) | `src/config/features.ts` | ✅ In codebase |
| OBP as canonical identity page | `__docs__/official-business-page/` (9 docs) | ✅ IMPLEMENTED |
| OBP schema.org + AggregateRating | `src/app/_client/obp/schema.ts` | ✅ IMPLEMENTED |
| Store schema for GBP fields | `gbp-sync_impl.md` §Database Schema | Designed, not yet added |
| MOL event types for GBP | `gbp-sync_impl.md` §MOL Event Types | Designed |
| Nightly sync algorithm | `gbp-sync_impl.md` §Nightly Sync Job | Designed |
| API routes for GBP | `gbp-sync_impl.md` §API Routes | Designed |
| Multi-outlet GBP handling | `gbp-sync_spec.md` (per-outlet connection) | Designed |

### Genuinely New (Valid — ~20%)

| Topic | Value | Captured Below |
|---|---|---|
| **Pre-API "Shadow Authority" strategy** | HIGH — Build measurable proof before applying | §1 |
| **GBP API application template** | HIGH — Ready-to-submit draft | §2 |
| **"When to apply" concrete thresholds** | MEDIUM — Existing docs just say "BLOCKED" | §3 |
| **4 Proof Buckets framework** | MEDIUM — Structured metrics for approval | §4 |
| **Pre-mortem: 12 failure modes** | MEDIUM — More detailed than existing risk tables | §5 |

### Rejected (~15%)

| ChatGPT Suggestion | Why Rejected |
|---|---|
| Manual review input (owner enters rating) | Already implemented as `publicPresence.googleRating/Count` fields — owner enters in OfficialPageTab |
| Complex pre-API mismatch detection (parsing Google pages, tolerance algorithms) | Can't reliably parse Google without API. Menu Presence Monitor handles "Add to Google" flow |
| Homepage rewrite around "Your business info is wrong" | Website is v2 Hype/Domination strategy (LOCKED). Narrative doesn't fit |
| Per-industry GBP adaptations | OBP handles via `businessType` + `getBusinessCategory()`. No GBP-specific industry logic needed |
| A/B testing for copy variants | Over-engineering for current stage |
| Lightweight verification layer (behavioral confidence scoring) | Speculation without data |
| Full Review Response Infrastructure (RRI) | Already documented in reputation-protection spec with same scope |
| "Review feed" with reply suggestions on OBP | OBP freeze rules explicitly ban hosting reviews (ADR-12). Only external reference allowed |
| GBP field-level control / sync architecture details | Already in `gbp-sync_impl.md` with identical scope |

---

## §1 — Pre-API "Shadow Authority" Strategy (NEW)

**Core Insight:** Don't wait for API to build authority. Build measurable proof of ecosystem improvement now.

### Three Phases (Independent of API)

**Phase 1 — "Shadow Authority" (NOW)**
- Manual GBP linking via Menu Presence Monitor (already designed)
- Owner sees "This is what Google shows" vs "This is what MenuList has"
- Position as "Google correctness layer", not "Google integration tool"
- Track: corrections owners make after seeing gaps

**Phase 2 — "Behavior Influence Layer" (Pre-API)**
- Generate consistency alerts
- Push actions: "Fix this on Google"
- Guide behavior without owning the surface
- Track: fix clicks, resolution rates

**Phase 3 — "Sync Layer" (Post-API Approval)**
- Turn guidance → automation
- Turn manual → programmatic
- Nothing changes in product philosophy — only execution speed

### Strategic Principle
> MenuList should become the system Google trusts BEFORE it integrates with it.

---

## §2 — GBP API Application Template (NEW)

Ready-to-submit template. Replace `[placeholders]` with real numbers.

### Section 1 — Product Description
> MenuList is a canonical business data layer that ensures public-facing business information — such as menu, operating hours, and contact details — remains accurate and consistent across customer-facing platforms.

### Section 2 — Problem Statement
> Business information on public platforms is frequently inconsistent or outdated. This includes incorrect hours, missing or outdated menus, and incorrect contact details. These inconsistencies lead to incorrect customer expectations, failed visits, and reduced trust.

### Section 3 — Current Functionality (Pre-API)
> MenuList currently detects inconsistencies between its structured data and publicly visible business information. When discrepancies are identified, MenuList presents them clearly to the business owner and guides them to correct the information directly on the platform.
>
> Key capabilities: Detection of inconsistencies in operating hours, menu presence, and phone number. Clear comparison between MenuList data (source of truth) and publicly visible data. Action prompts and manual resolution confirmation.

### Section 4 — Impact Data
> Over the past [X] days: MenuList analyzed data across [N] businesses and [M] locations. Detected [A] total inconsistencies. Business owners acted on [B]% of detected issues. [C]% of issues were resolved within 72 hours.

### Section 5 — Interaction Model
> Currently, MenuList does not modify Google Business Profile data directly. All updates are performed manually by business owners on Google, based on discrepancies identified by MenuList. This ensures full user control, no automated or unauthorized changes, and clear accountability.

### Section 6 — Purpose of API Access
> API access will allow MenuList to reduce friction in correcting verified inconsistencies while maintaining strict user control and auditability. Intended use: Allow business owners to update operating hours, contact details, and website/menu link through explicit user-initiated, field-level actions. No background automation, no bulk edits.

### Section 7 — Safety & Compliance
> - **Review Integrity:** MenuList does not influence, filter, or gate customer reviews
> - **User Control:** All updates are explicitly initiated by the business owner
> - **Auditability:** Every data change is logged with user attribution, timestamp, and before/after values (MOL system)
> - **Data Validation:** Strict validation rules prevent incorrect or malformed data

### Section 8 — Scale
> MenuList manages structured business data across [N] businesses, [M] total locations, including multi-location brands with centralized control.

### Section 9 — Future Intent
> MenuList aims to improve the overall accuracy of business information on Google by maintaining a consistent and verified source of truth. API access will enable more efficient correction of inconsistencies while preserving user control and data integrity.

### Attachments (Recommended)
- Screenshot: Menu Presence Monitor UI (mismatch guidance)
- Screenshot: OBP (canonical business page)
- Screenshot: MOL audit logs
- Internal dashboard: detection/resolution metrics

---

## §3 — "When to Apply" Thresholds (NEW)

### Minimum Viable (Don't Apply Before This)
- 300–500 active businesses
- 30–50 multi-outlet brands
- Live audit + logging system (MOL — already done)
- Live OBP links in production
- Menu Presence Monitor active

### Strong Application (Recommended)
- 1,000+ active businesses
- 100+ multi-outlet brands
- High update frequency (weekly edits happening)
- Evidence of "Google correction behavior" (owners fixing data after seeing mismatch)
- Measurable resolution metrics from Menu Presence Monitor

### Decision Framework (All Must Be YES)
1. Are businesses depending on MenuList to stay accurate publicly?
2. Are we influencing behavior outside our product (Google updates)?
3. Do we represent multi-location scale?
4. Can we prove reduced inconsistency?

---

## §4 — 4 Proof Buckets (NEW)

Metrics to continuously maintain for API application evidence.

### A. Data Quality Impact (Strongest Lever)
- Total mismatches detected (from Menu Presence Monitor)
- Correction actions ("Fix on Google" clicks)
- Resolution rate (% resolved within 24h/72h/7d)
- Target output: "MenuList identified X inconsistencies and helped resolve Y (Z%) within 72 hours"

### B. Behavioral Influence
- External correction evidence (click → return → mark resolved)
- Update frequency (avg updates per business per month, target >60% monthly active)
- Dependency signal (sessions per store, repeat usage)

### C. Integrity & Control (Pass/Fail Gate)
- Full audit trail (MOL — who, what, before→after, when) ✅ Already built
- Validation enforcement (invalid inputs blocked) ✅ MCE handles this
- Role-based control ✅ Existing RBAC
- No silent automation ✅ All user-initiated

### D. Review Neutrality (Critical Risk Zone)
- Private feedback ≠ Google reviews ✅ Internal Feedback System is separate
- No gating (every user sees same CTA) ✅ By design
- No rating biasing ✅ No UI that nudges ratings
- Reply assistance = suggestions only, no auto-posting ✅ reputation-protection spec

---

## §5 — Pre-Mortem: 12 Failure Modes (NEW)

| # | Failure | Severity | Prevention |
|---|---------|----------|------------|
| 1 | **False positive mismatches** — flagging issues that aren't real | CRITICAL | Only show HIGH confidence; ±15min tolerance for hours; silence > being wrong |
| 2 | **No perceived value** — "all good" state feels useless | MEDIUM | Show "Your listing matches MenuList" + "Last checked: X hours ago" |
| 3 | **Action drop-off** — user sees issue, does nothing | MEDIUM | Strong CTA ("Fix on Google"), consequence framing, limit to top 3 issues |
| 4 | **Broken resolution loop** — user fixes Google but MenuList still shows issue | HIGH | "I've updated this" button + recheck at +2h and +24h |
| 5 | **Over-expansion** — adding reviews/rankings/SEO tips | HIGH | Hard scope lock: correctness only |
| 6 | **Platform dependency creep** — designing around Google | MEDIUM | Every feature must pass "Does this work without Google?" |
| 7 | **Review policy violation** — influencing reviews | CRITICAL | Strict neutrality, no gating/filtering/routing |
| 8 | **Low usage after first visit** — no habit formation | MEDIUM | Passive monitoring, periodic rechecks, subtle dashboard nudges |
| 9 | **Too many issues shown** — user overwhelmed | MEDIUM | Show max 3-5, collapse rest |
| 10 | **Wrong mental model** — user thinks "Google feature" | MEDIUM | Language: "MenuList detected…" not "Google says…" |
| 11 | **Engineering overkill** — complex scraping/real-time | LOW | Keep snapshot-based, periodic checks |
| 12 | **Trust collapse from 1-2 wrong alerts** | CRITICAL | Bias hard toward high confidence, low noise, clear action |

---

## Relationship to Existing Docs

| Existing Doc | Relationship |
|---|---|
| `__docs__/gbp-sync/` | This strategy doc PRECEDES the sync spec. Sync spec activates after API approval. |
| `__docs__/reviews-reputation/` | Remains BLOCKED on API. No changes needed. |
| `__docs__/reputation-protection/` | Remains BLOCKED on API. No changes needed. |
| `__docs__/menu-presence-monitor/` | The ACTIVE pre-API feature. Menu Presence Monitor IS the "Shadow Authority" Phase 1. |
| `__docs__/official-business-page/` | OBP is the canonical page that GBP should point to. Google review reference already implemented. |
| `__docs__/customer-facing-infrastructure/` | GBP strategy fits under Pillar 3 (Reputation Protection). |

---

**Document Signature:** Cascade (Lead Architect)  
**Created:** March 21, 2026
