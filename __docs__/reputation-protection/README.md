# Reputation Protection (Pillar 3)

> **MenuList becomes the system that protects the business's public reputation.**

**Created:** February 19, 2026  
**Pillar:** 3 of 6 — Customer-Facing Infrastructure  
**Status:** SCAFFOLDING ONLY — product not implemented or active; blocked on GBP API access and runtime completion
**Parent:** [`__docs__/customer-facing-infrastructure/`](../customer-facing-infrastructure/README.md)  
**Related:** [`__docs__/reviews-reputation/`](../reviews-reputation/README.md) (detailed spec/impl)

---

## Quick Navigation

| Document                                                    | Audience     | Purpose                         |
| ----------------------------------------------------------- | ------------ | ------------------------------- |
| [Spec](./reputation-protection_spec.md)                     | CEO, PM      | Strategy + behavioral design    |
| [Impl](./reputation-protection_impl.md)                     | Developers   | Technical architecture overview |
| [Marketing](./reputation-protection_marketing.md)           | Sales        | Pitch deck, messaging           |
| [Website](./reputation-protection_website.md)               | Public       | Landing page content            |
| [Help Doc](./reputation-protection_helpdoc.md)              | Customers    | How reputation protection works |
| [Firebase](./reputation-protection_firebase.md)             | Cost Control | Review ingestion + AI costs     |
| [Mobile Support](./reputation-protection_mobile-support.md) | Internal     | Mobile review reply flow        |

### Detailed Technical Docs (Existing)

| Document                 | Location                                                     |
| ------------------------ | ------------------------------------------------------------ |
| Full Product Spec        | `__docs__/reviews-reputation/reviews-reputation_spec.md`     |
| Full Implementation Plan | `__docs__/reviews-reputation/reviews-reputation_impl.md`     |
| Firebase Cost Detail     | `__docs__/reviews-reputation/reviews-reputation_firebase.md` |

---

## One-Liner

Future design: a tenant-scoped review warning and owner-reviewed reply-assistance workflow. MenuList does not currently ingest, list, monitor, or post Google reviews.

## Problem Solved

The statistics below are historical concept inputs, not current launch evidence or approved public claims. Re-verify primary sources before any future use.

- 88% of consumers read Google reviews before selecting a business (BrightLocal 2025)
- 4+ negative reviews deter ~70% of potential customers (LocaliQ 2025)
- 73% only trust reviews from last 30 days (Sixth City Marketing)
- Owners either ignore reviews, reply emotionally, or reply too late
- No calm system exists to handle reputation stability

## Planned Architecture (Not Current Runtime)

```
Google Reviews API
  ↓ (nightly ingestion when GBP API approved)
MenuList Review Store
  ↓
Classification Engine (rule-based)
  ├── benign/informational → SILENCE (owner sees nothing)
  ├── negative_high_risk → "May need careful handling"
  └── volatile → "Recent review needs attention"
  ↓
Future owner surfaces
  ├── Reputation Status / Review Inbox (not implemented)
  └── Reply posting to Google (not implemented)
```

Current source contains dormant types, classification rules, two disabled API routes, one unmounted passive notice, and one unmounted pasted-review suggestion component. It contains no GBP review ingestion/classifier writer, review inbox, Google reply route, reputation status card, or mobile review workflow.

## Key Decision: AI Reply Assist (UPGRADED)

**Previous spec:** AI reply generation was on the Hard Ban list.  
**Updated decision:** AI reply **suggestions** are allowed. Owner MUST review and explicitly approve before posting.

**Why the change:** ChatGPT correctly distinguished between autopilot (banned) and assist (valuable). Google's GBP API requires explicit business owner action. Reply-assist helps owners respond calmly, professionally, and quickly — this is protection, not automation.

**What's still banned:**

- ❌ Auto-post replies (no human review)
- ❌ Sentiment dashboards
- ❌ Rating analytics
- ❌ Review gating (FTC violation)
- ❌ "Get more reviews" campaigns

**Current runtime boundary:** Review reply suggestions remain feature-flag disabled and unmounted. If enabled, `/api/reviews/suggest` requires an authenticated session, tenant/store access, bounded input, and the `canManageFeedback` store permission before AI capacity, Gemini, or accounting work.

## Feature Flags

```typescript
ENABLE_REVIEWS_REPUTATION: false; // Existing master kill switch
ENABLE_AI_REPLY_ASSIST: false; // Requires the parent flag
```

## Dependencies

| Dependency       | Status                                  |
| ---------------- | --------------------------------------- |
| GBP API Access   | 🔶 BLOCKED — Google approval pending    |
| GBP Sync (OAuth) | ✅ Built (`ENABLE_GBP_SYNC: false`)     |
| Guest Feedback   | ✅ Active (private reputation firewall) |
| Gemini AI        | ✅ Available (for reply suggestions)    |

## Future Success Test

> **Owner instinctively opens MenuList to check & reply to reviews.**
> Not Google. MenuList becomes the reputation control center.

---

**Last Updated:** July 11, 2026
