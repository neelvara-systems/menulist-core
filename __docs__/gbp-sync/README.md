# GBP Sync — Documentation Hub

> **Feature:** Google Business Profile Synchronization  
> **Status:** Feature-Flagged (ENABLE_GBP_SYNC) — BLOCKED on API access  
> **Last Updated:** March 21, 2026

---

## Strategic Context

GBP integration follows a **3-phase strategy** that does NOT depend on API access:

| Phase | Name               | API Required | Status                               | Key Feature                              |
| ----- | ------------------ | ------------ | ------------------------------------ | ---------------------------------------- |
| 1     | Shadow Authority   | NO           | **Active via Menu Presence Monitor** | Guide owners to set OBP link on Google   |
| 2     | Behavior Influence | NO           | Planned                              | Mismatch detection + correction tracking |
| 3     | Sync Layer         | YES          | BLOCKED on API                       | Automated link/hours enforcement         |

**Principle:** MenuList becomes the system Google trusts BEFORE it integrates with it.

### When to Apply for API Access

Do NOT apply before: **300–500 active businesses + 30–50 multi-outlet brands + measurable correction behavior.**  
See `_archive/chatgpt-review-session2-api-strategy.md` §3 for full thresholds.

---

## Quick Navigation

| Audience      | Document                                         | Purpose                     |
| ------------- | ------------------------------------------------ | --------------------------- |
| CEO / PM      | [gbp-sync_spec.md](./gbp-sync_spec.md)           | Business requirements       |
| Developer     | [gbp-sync_impl.md](./gbp-sync_impl.md)           | Technical blueprint         |
| Marketing     | [gbp-sync_marketing.md](./gbp-sync_marketing.md) | Sales positioning           |
| Website       | [gbp-sync_website.md](./gbp-sync_website.md)     | Public landing page content |
| Support       | [gbp-sync_helpdoc.md](./gbp-sync_helpdoc.md)     | Customer help documentation |
| Ops / Finance | [gbp-sync_firebase.md](./gbp-sync_firebase.md)   | Firebase cost tracking      |

## Additional Documents

| Document                                                                                                | Purpose                                                                                                     |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [gbp-sync_validation.md](./gbp-sync_validation.md)                                                      | Validation report                                                                                           |
| [gbp-sync_doc-feedback-audit.md](./gbp-sync_doc-feedback-audit.md)                                      | Documentation feedback audit                                                                                |
| [gbp-chatgpt-critical-review.md](./gbp-chatgpt-critical-review.md)                                      | ChatGPT critical review (Session 1 — Jan 2026)                                                              |
| [\_archive/chatgpt-review-session2-api-strategy.md](./_archive/chatgpt-review-session2-api-strategy.md) | ChatGPT critical review (Session 2 — Mar 2026) — API approval strategy, application template, proof metrics |

## Related Features (Same Ecosystem)

| Feature                         | Location                                      | Status                      | Relationship                                              |
| ------------------------------- | --------------------------------------------- | --------------------------- | --------------------------------------------------------- |
| **Menu Presence Monitor**       | `__docs__/menu-presence-monitor/`             | Documented, flag OFF        | Pre-API Phase 1 — guides owners to add OBP link to Google |
| **Reviews & Reputation**        | `__docs__/reviews-reputation/`                | SPEC LOCKED, BLOCKED on API | Requires same GBP API access                              |
| **Reputation Protection**       | `__docs__/reputation-protection/`             | Draft, BLOCKED on API       | AI reply assist layer on top of reviews                   |
| **OBP**                         | `__docs__/official-business-page/`            | ✅ IMPLEMENTED              | The canonical page GBP should point to                    |
| **OBP Google Review Reference** | `publicPresence.googleRating/Count/ReviewUrl` | ✅ IMPLEMENTED              | Owner-entered rating badge on OBP                         |

## One-Liner

Automatically sync menu data to Google Business Profile — hours, links, contact details — keeping GBP always accurate without manual updates.

## Problem Solved

Business owners forget to update their Google Business Profile when menu items or hours change. GBP Sync ensures the GBP listing always reflects the latest MenuList data. Pre-API, the Menu Presence Monitor guides owners to manually keep Google aligned.
