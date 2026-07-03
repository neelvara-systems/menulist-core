# GBP Sync — Documentation Hub

> **Feature:** Google Business Profile Synchronization  
> **Status:** Feature-Flagged (ENABLE_GBP_SYNC) — BLOCKED on API access  
> **Last Updated:** July 2, 2026

---

## Current Source Boundary

Current runtime truth:

- `ENABLE_GBP_SYNC` is `false` in `src/config/features.ts`.
- `src/database/integrations/gbp.ts` contains server-only token-shape scaffolding, but token operations fail closed with `GBP_TOKEN_STORE_DISABLED`.
- `src/components/templates/main-app/businessSettings/tabs/IntegrationsTab.tsx` gates the Google Business Profile card behind `gbpEnabled`; the shared Integrations tab may still host Platform Pull API controls when `ENABLE_PUBLIC_API` is on.
- No Google OAuth route, Google Business Profile callback route, nightly GBP sync worker, or active apply-hours route is shipped.
- Current owner-facing behavior is manual Google handoff through Official Business Page links, Menu Presence Monitor, and owner-managed Google Business Profile updates.

Reserved capability:

GBP API sync remains a conditional integration candidate after Google Business Profile API access, separate OAuth setup, target secrets, provider smoke, scoped deploy evidence, browser/device QA, and production-host smoke exist. Until those gates pass, docs and public copy must not say MenuList updates Google automatically.

**Principle:** MenuList becomes the source owners can safely point Google to before it writes to Google.

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
| **Menu Presence Monitor**       | `__docs__/menu-presence-monitor/`             | Documented, flag OFF        | Current pre-API handoff — guides owners to add OBP link to Google |
| **Reviews & Reputation**        | `__docs__/reviews-reputation/`                | SPEC LOCKED, BLOCKED on API | Requires same GBP API access                              |
| **Reputation Protection**       | `__docs__/reputation-protection/`             | Draft, BLOCKED on API       | AI reply assist layer on top of reviews                   |
| **OBP**                         | `__docs__/official-business-page/`            | ✅ IMPLEMENTED              | The canonical page GBP should point to                    |
| **OBP Google Review Reference** | `publicPresence.googleRating/Count/ReviewUrl` | ✅ IMPLEMENTED              | Owner-entered rating badge on OBP                         |

## One-Liner

Reserved Google Business Profile sync scaffolding exists, but current MenuList behavior is owner-managed Google handoff using the Official Business Page and menu links.

## Problem Solved

Business owners forget to update their Google Business Profile when menu links or hours change. Until GBP API access is approved and the integration is built end-to-end, MenuList keeps the canonical OBP/menu links ready and guides owners to keep Google aligned manually.
