# ChatGPT OBP Distribution & Infrastructure Audit — Review

**Date:** March 18, 2026
**Source:** ~25-section ChatGPT conversation covering: strategic review, distribution system, GBP dominance, lock-in layer, competitor analysis, global expansion, SMB audit, UI/UX audit, scale/performance audit, data integrity audit, distribution/adoption audit, analytics/measurement audit, security/abuse audit, SEO/AEO audit, multi-outlet audit, failure/recovery audit, globalization audit, mobile interaction audit, behavior enforcement system, link dominance strategy, inevitability plan, domain root strategy
**ChatGPT Accuracy:** ~25% actionable (most is strategic commentary on what already exists)
**Reviewer:** Cascade (Lead Architect)

---

## Methodology

1. Read all existing OBP docs (spec, impl, README, freeze plan)
2. Read all OBP codebase files (OBPContent.tsx, OBPActions.tsx, OBPAnalytics.tsx, OBPMenuCTA.tsx, BrandOBPContent.tsx, schema.ts, hoursStatus.ts, generateOBPUrl.ts, OBPLinkCard.tsx, OfficialPageTab.tsx, unified.ts analytics)
3. Cross-checked every ChatGPT claim against actual code
4. Classified as: ALREADY BUILT / VALID / WRONG / REJECT / DEFER

---

## Summary Table

| # | ChatGPT Suggestion | Verdict | Reason |
|---|---|---|---|
| 1 | Reframe OBP as "link replacement protocol" | **VALID** | Strengthens positioning. Doc update only. |
| 2 | Zero customization = correct | **ALREADY BUILT** | Permanent ban list in spec §Scope |
| 3 | Root URL takeover = correct | **ALREADY BUILT** | Routing in `[[...slug]]/page.tsx` |
| 4 | No publish step = correct | **ALREADY BUILT** | Live always, no "publish OBP" button |
| 5 | Data co-location = correct | **ALREADY BUILT** | publicPresence on stores doc |
| 6 | OBP is passive / no behavior enforcement | **PARTIALLY ADDRESSED** | BehaviorNudgeCard exists. Distribution touches core flows → deferred per spec. |
| 7 | No enforced distribution loop | **DEFER** | Requires modifying publish/onboarding flows. Already logged in Future Enhancements. |
| 8 | Replace "Copy Link" with WhatsApp "Send" | **VALID** | Pattern exists in MenuKitSection + useMenuList LinkCard. OBPLinkCard missing it. |
| 9 | Add "Link Replacement Rate" metric | **VALID** | Doc-only addition to Goals & Success Metrics. |
| 10 | Add behavioral ICP segmentation | **VALID** | Doc-only enrichment. |
| 11 | Add User Story 6 (Default Response) | **VALID** | Doc-only addition. |
| 12 | Dynamic CTA priority per business type | **REJECT** | Over-engineering for v1. Restaurant-first. "View Menu" is correct default. |
| 13 | Freshness race condition (priority field bypass) | **REJECT** | revalidateTag already handles immediate invalidation. 60s cache is standard Next.js pattern. Adding bypass = unnecessary complexity. |
| 14 | Make timezone required at store creation | **DEFER** | Touches onboarding flow. hoursStatus.ts already falls back to IST. |
| 15 | Minimum identity contract (name + 1 contact) | **ALREADY HANDLED** | Onboarding requires name + phone. All stores have minimum data. |
| 16 | Domain ownership integrity | **ALREADY BUILT** | `domainVerified: true` check in getStoreByCustomDomain. |
| 17 | WhatsApp fallback chain | **ALREADY HANDLED** | wa.me handles web fallback natively. Standard behavior. |
| 18 | Action button max 3 visible | **REJECT** | Actions only show if data exists. Most stores have ≤3. No overload in practice. |
| 19 | Phone number validation at save | **DEFER** | General data quality issue, not OBP-specific. |
| 20 | Accent color WCAG contrast | **DEFER** | Low priority. Default #111 is safe. |
| 21 | Cache key hardening (include storeId) | **ALREADY BUILT** | Cache uses per-store tags: `client-stores`, `store-{sId}` |
| 22 | OBP_SHARE tracking event | **VALID** | Should track when owner shares OBP link via WhatsApp button. |
| 23 | ADR: OBP is a link system, not page system | **VALID** | Doc-only. Protects against future positioning drift. |
| 24 | GBP website field guidance in dashboard | **VALID** | Already exists in MenuKitSection. Add to OBPLinkCard hint text. |
| 25 | "OBP not being used" as #1 risk | **VALID** | Doc-only addition to Risks table. |
| 26 | Bot traffic filtering for analytics | **ALREADY HANDLED** | Client-side events only (no JS = no event). |
| 27 | Session-based dedup for analytics | **ALREADY BUILT** | sessionId tracking in OBPAnalytics.tsx |
| 28 | Store deleted → "not available" page | **ALREADY BUILT** | `notFound()` in OBPContent.tsx when store not found |
| 29 | Layout shift prevention | **ALREADY BUILT** | SSR with stable structure, no client layout shifts |
| 30 | Multi-outlet brand identity consistency | **ALREADY BUILT** | ADR-7 + ADR-10 in impl.md |
| 31 | Canonical URL for SEO (subdomain vs custom domain) | **ALREADY BUILT** | generateOBPUrl + canonical meta in page.tsx |
| 32 | Global expansion strategy | **STRATEGIC ONLY** | No code changes. Market timing decision. |
| 33 | Competitor defense strategy | **STRATEGIC ONLY** | No code changes. Positioning decision. |
| 34 | Lock-in via QR + WhatsApp + GBP | **ALREADY PARTIALLY BUILT** | QR in OBPLinkCard. WhatsApp share being added. GBP hint being added. |
| 35 | Domain root ownership for custom domains | **ALREADY BUILT** | OBP at root when ENABLE_OBP=true + custom domain support |
| 36 | Overnight/cross-day hours (10pm-2am) | **ALREADY HANDLED** | hoursStatus.ts lines 84-87: cross-midnight logic exists |

---

## Accuracy Analysis

- **Total suggestions across all sections:** ~36 distinct technical/doc items
- **Already built:** 18 (50%)
- **Valid to implement:** 8 (22%)
- **Deferred (touches core flows):** 4 (11%)
- **Rejected:** 3 (8%)
- **Strategic only (no code):** 3 (8%)

**ChatGPT had no codebase access.** Most "gaps" it identified were already implemented. The valuable contributions are strategic framing improvements and the WhatsApp share addition.

---

## Changes Implemented From This Review

### Code Changes
1. **OBPLinkCard.tsx** — Added "Send via WhatsApp" button with wa.me deep link + prefilled message
2. **unified.ts** — Added `OBP_SHARE` event + `trackOBPShare()` function
3. **OBPLinkCard.tsx** — Added GBP website field guidance hint

### Doc Changes
1. **spec.md** — Updated executive summary, added Link Replacement Rate metric, behavioral ICP, User Story 6, distribution risk, strengthened Future Enhancements
2. **impl.md** — Added ADR-12 (OBP is a Link System), updated Dashboard Link Display with WhatsApp share + GBP guidance
3. **README.md** — Added archive entry for this review

---

**Document Signature:** Cascade (Lead Architect)
**Last Updated:** March 18, 2026
