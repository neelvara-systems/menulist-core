# SignalDesk Trust Partner Rail - Implementation Plan

**Status:** Runtime implemented for internal testing; real partner outreach/payment/contract execution remains manual and owner-approved
**Created:** June 24, 2026

## Current Runtime Fit

SignalDesk already has several primitives this feature should reuse:

| Existing primitive | Reuse |
| --- | --- |
| `signaldeskMarketPods` | Attach partner tests to a city/category/segment pod. |
| `signaldeskAudienceSegments` | Store partner-audience assumptions and owner-fit signals. |
| `signaldeskBudgetPolicies` | Cap partner/source/deal spend before approval. |
| `signaldeskApprovalPackets` | Present founder approval for partner, brief, and renewal decisions. |
| `signaldeskRunTimelines` | Show partner test progress without raw dashboards. |
| `signaldeskOutcomeSummaries` and `signaldeskDemandSignalSummaries` | Attribute partner output to MenuList outcomes. |
| `signaldeskSelfServiceCtas` | Give partners approved CTAs such as current-list submission or preview request. |

## Feature Flag

Runtime flag:

```ts
ENABLE_MENULIST_SIGNALDESK_TRUST_PARTNER_RAIL: true
```

## Proposed Product Modules

| Module | Purpose |
| --- | --- |
| Partner profile registry | Store candidate partners and trust-test score. |
| Niche test planner | Group 3-5 partner tests by niche, market pod, and angle. |
| Deal tracker | Track flat fee, deliverables, post dates, budget, and owner approval. |
| Lean brief builder | Generate one-page partner brief from approved claims and CTAs. |
| Deliverable tracker | Store scheduled content, post URL, review state, and reminder state. |
| Outcome scorer | Recommend renew, hold, cut, or retest from outcomes and risk. |

## Proposed Collections

| Collection | Purpose |
| --- | --- |
| `signaldeskTrustPartnerProfiles` | Candidate partner, channel, audience, trust score, source notes. |
| `signaldeskTrustPartnerNicheTests` | 3-5 test group with market pod, angle, status, and recommendation. |
| `signaldeskTrustPartnerDeals` | Flat-fee offer, deliverables, payment state, approval state, and budget ref. |
| `signaldeskTrustPartnerBriefs` | One-page brief, approved claims, banned claims, disclosure requirements, CTA. |
| `signaldeskTrustPartnerDeliverables` | Scheduled post/content record, due date, post URL, review status, metrics refs. |
| `signaldeskTrustPartnerMetrics` | Compact result summary: reach, comments, owner leads, submissions, activations. |
| `signaldeskTrustPartnerRenewalDecisions` | Renew/hold/cut recommendation with evidence and owner decision. |

## API Actions

All actions must use the existing `/api/signaldesk/actions` guard pattern: `withAuth`, `requireSignalDeskRuntime`, `requireSignalDeskAccess`, `parseSignalDeskJsonBody`, Zod validation, rate limiting, audit events, and safe error strings.

| Action | Permission | Behavior |
| --- | --- | --- |
| `upsert-trust-partner-profile` | `source.configure` | Create/update candidate partner profile and trust-test fields. |
| `create-trust-partner-niche-test` | `policy.approve` | Create a 3-5 test plan for a niche and market pod. |
| `create-trust-partner-brief` | `draft.create` | Generate/store one-page brief using approved claim rails. |
| `review-trust-partner-deal` | `policy.approve` | Approve/reject partner deal and budget. |
| `record-trust-partner-deliverable` | `source.configure` | Capture due date, post URL, and review state. |
| `record-trust-partner-metrics` | `source.configure` | Capture compact result metrics and outcome refs. |
| `review-trust-partner-renewal` | `policy.approve` | Approve renew, hold, cut, or retest. |

## UI Placement

Do not add a public page.

Recommended internal route:

```txt
/signaldesk/partners
```

Workspace sections:

| Surface | Purpose |
| --- | --- |
| Partner shortlist | Candidates, trust test, audience fit, and source notes. |
| Niche tests | 3-5 test status, partner count, outcome movement, recommendation. |
| Deals | Flat fees, deliverables, approval state, budget status. |
| Briefs | Approved one-page briefs and banned claims. |
| Deliverables | Due dates, post URLs, reminders, result capture. |
| Renewal decisions | Renew/hold/cut recommendations and founder decision. |

## Guardrails

1. No deal without founder-approved budget.
2. No brief without approved claims, CTA, and disclosure checklist.
3. No renewal from views alone.
4. No per-view default pricing.
5. No broad consumer creator scoring without owner-audience fit.
6. No automated payment or contract execution.
7. No public partner portal.
8. No paid campaign automation.
9. No provider-send enablement.

## Build Checklist

| Step | Status |
| --- | --- |
| Add feature flag | Done. |
| Add types for partner profiles, deals, briefs, deliverables, metrics, and renewal decisions | Done. |
| Add product-local collection constants | Done. |
| Add Firestore read rules for internal readers and deny client writes | Done. |
| Add workspace section and route | Done. |
| Add action schemas and server actions | Done. |
| Add summary-first workspace reads | Done. |
| Add docs/code verifier coverage | Done. |

## Validation Requirements

| Check | Expected |
| --- | --- |
| `npm run verify:signaldesk` | Must pass after runtime changes. |
| `npx tsc --noEmit --incremental false --pretty false` | Must pass after runtime changes. |
| Unauthenticated API smoke | Partner APIs return 401. |
| Public isolation scan | No partner route appears in sitemap, robots, website, or owner/customer nav. |
| Firebase emulator parse | Rules/indexes parse after collection updates. |

## Owner Decisions Before Runtime

| Decision | Default |
| --- | --- |
| First partner niche | Restaurant consultants or menu photographers in first market pod. |
| First deal budget | Founder-approved flat-fee cap. |
| Disclosure wording | Required for paid/incentivized content. |
| Payment process | Manual record only; no payment automation. |
