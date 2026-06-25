# ChatGPT Production Analytics Stack Review

**Feature:** Client Menu Analytics / Owner Analytics / Website Analytics Boundary
**Source:** `/Users/danny/.codex/attachments/a1afbbdf-335d-460d-b56a-4d35b66ae76d/pasted-text.txt`
**Review Date:** June 25, 2026
**Status:** Reviewed against current codebase and live vendor docs

## Executive Summary

ChatGPT is directionally right on the main boundary: third-party analytics may measure acquisition and internal product usage, but MenuList-owned data must remain the source of truth for public menu, OBP, customer app, and owner-facing Business Health metrics.

The final ChatGPT recommendation is not directly adoptable. It overstates the need for Plausible Business and PostHog, misses that Sentry is already installed, duplicates the existing public analytics endpoint, and treats GA4 too broadly despite the repo already separating MenuList-owned analytics from owner-provided GA4/Meta scripts.

## Final Decision

Use this production boundary:

| Surface | Use | Decision |
| --- | --- | --- |
| MenuList main marketing website | Current consent-gated GA4/Clarity, or Plausible Cloud if we explicitly migrate | Do not add Plausible by default without a migration task. If buying now, Growth is enough unless funnels/custom properties/Stats API/Looker are required immediately. |
| Answerlattice marketing website | Current consent-gated GA4 | Same as MenuList website; keep Answerlattice analytics as website-only, not product governance analytics. |
| Public MenuList menu, OBP, customer app | Existing MenuList-owned analytics route and Firestore daily/read-model docs | Keep. Do not add Plausible/PostHog/GA4 as canonical business-truth analytics. |
| Owner dashboard / Business Health | Existing owner dashboard summaries, Business Health read models, Sentry for errors | Do not add PostHog now. Add only after a docs-first internal-product-analytics plan. |
| Paid Google acquisition | Google Ads conversion tracking / GA4 key events when campaigns exist | Valid, but only for acquisition conversion measurement. |
| Error monitoring | Existing Sentry integration | Already present. Verify DSNs/flags/coverage; do not introduce it as a new tool. |

## Live Vendor Verification

Plausible current pricing page shows the 10k pageview tier as Starter $9/month for one site, Growth $14/month with up to 3 sites and 3 team members, and Business $19/month with up to 10 sites, custom properties, Stats API, Looker Studio, ecommerce attribution, funnels, user journeys, and consolidated view. Source: https://plausible.io/

Plausible subscription docs describe Starter/Growth/Business by need: Growth for multiple sites/team sharing, Business for funnels, journeys, revenue tracking, custom properties, Stats API, or Looker. Source: https://plausible.io/docs/subscription-plans

Plausible custom events count toward billable monthly pageviews. Source: https://plausible.io/docs/custom-event-goals

Plausible custom properties are a Business feature and must not include PII such as names, emails, addresses, phone numbers, precise locations, IP addresses, cookie IDs, advertising IDs, or similar identifiers. Source: https://plausible.io/docs/custom-props/introduction

Plausible Cloud vs CE docs confirm Cloud handles infrastructure, CDN, high availability, backups, security, and maintenance; CE means self-managed server, backups, uptime, capacity, dashboard speed, and bot filtering. Source: https://plausible.io/self-hosted-web-analytics

PostHog pricing currently has a free tier that includes 1M analytics events, 5K session replays, 1M feature flag requests, 100K exceptions, and EU Frankfurt cloud region selection. Source: https://posthog.com/pricing

PostHog GDPR docs recommend Cloud EU for robust GDPR posture and note it is hosted in Frankfurt; they also warn IP data can be personal data and should be controlled. Source: https://posthog.com/docs/privacy/gdpr-compliance

PostHog docs confirm autocapture can capture pageviews/pageleaves and element interactions when initialized, and privacy controls should be configured before use. Sources: https://posthog.com/docs/getting-started/send-events and https://posthog.com/docs/privacy/data-collection

Google Ads docs confirm conversion measurement is for business-valued actions such as purchases, sign-ups, and phone calls; GA4 can be linked to Google Ads for consistent conversions and ad performance. Sources: https://support.google.com/google-ads/answer/1722022 and https://support.google.com/analytics/answer/9379420

## Codebase Reality Check

| ChatGPT claim | Codebase truth | Verdict |
| --- | --- | --- |
| Use Plausible Cloud for MenuList and Answerlattice websites | Plausible is not installed or wired today. Current MenuList website uses consent-gated GA4 and Clarity via `src/components/website/WebsiteAnalyticsConsent.tsx:96-114`, `src/components/website/GoogleAnalytics.tsx:5-37`, and `src/components/website/ClarityAnalytics.tsx:1-17`. Answerlattice has its own consent-gated GA4 wrapper at `src/app/sites/answerlattice/components/AnswerlatticeAnalytics.tsx:7-150`. | Partial. Plausible is a valid buy-vs-host choice, but it is a migration decision, not the current production truth. |
| Start with Plausible Business, not Growth | Live Plausible docs support Business only when custom properties, funnels, Stats API, Looker, ecommerce attribution, user journeys, or consolidated view are immediately needed. Current repo has no Plausible event taxonomy or Plausible API consumer. | Disagree as default. Start Growth if simply replacing website analytics for two marketing sites. Use Business only with a concrete reporting requirement. |
| Do not self-host Plausible | Vendor docs and repo cost posture agree. Saving a small subscription cost does not justify another production service. | Agree. |
| Add PostHog Cloud EU to owner dashboard | `package.json:55-100` includes Sentry and Google Analytics data deps, but no PostHog package. Owner-facing analytics already uses Firestore daily docs, dashboard summaries, and Business Health read models. | Reject for now. PostHog may become an internal product analytics tool later, but it must not drive owner-facing analytics and needs docs-first approval. |
| Disable PostHog autocapture/session replay initially | If PostHog is ever introduced, this is correct. The dashboard has sensitive owner workflows, and PostHog docs confirm autocapture/privacy controls need deliberate setup. | Agree as future guardrail. |
| Add Sentry | Sentry is already installed at `package.json:86`, client initialized in `instrumentation-client.ts:1-25`, server/edge initialized in `sentry.server.config.ts:1-16` and `sentry.edge.config.ts:1-16`, and shared sanitization lives in `src/lib/monitoring/sentryShared.ts:1-99`. | Reject as new work. Validate current Sentry configuration instead. |
| Create `POST /api/events/public` | Existing endpoint is `POST /api/public/analytics/track`. It validates input with Zod, rate limits public traffic, verifies tenant/store/project targets, checks store analytics preferences, filters disabled decision-block counters, resolves trusted store-local dates, and writes with Admin SDK at `src/app/api/public/analytics/track/route.ts:1-219`. | Reject duplicate endpoint. Extend existing route only if a documented gap exists. |
| Use MenuList-owned public event collector for public menu/OBP/customer app | This already exists. The client queue and public API write into daily analytics docs through `src/database/analytics/index.ts:1-420`, `src/lib/analytics/serverWrite.ts:1-99`, and `src/lib/analytics/unified.ts:663-1146`. | Agree, already implemented. |
| Build raw event tables / `business_daily_metrics` style collections | Current contract explicitly rejects raw-event lakes. `_spec.md` says analytics is not a raw-event lake/API ingestion pipeline, and `analytics-tracking_firebase.md` keeps metrics as additive fields on daily docs plus read-model summaries. | Reject. Preserve current daily/read-model pattern. |
| Track public events like menu views, QR views, calls, directions, WhatsApp, reviews, share | Existing events cover menu views, OBP views, menu final actions, OBP actions, OBP links, OBP shares, customer app prompts/installs/opens/shortcuts, search, unavailable taps, decision blocks, and source quality in `src/lib/analytics/unified.ts:471-551` and `src/lib/analytics/unified.ts:760-1114`. | Mostly agree, already covered. Any new event must attach to existing daily counters and owner-visible read models. |
| Keep owner-facing analytics from MenuList-owned aggregates | Business Health docs require compact read-only models and forbid raw scans/action workflow docs. See `__docs__/owner-business-assistant/owner-business-assistant_firebase.md:1-76` and `__docs__/owner-business-assistant/owner-business-assistant_business-health.md:1-68`. | Agree. |
| Use GA4 only when paid ads start | Too broad. MenuList and Answerlattice websites already have optional consent-gated GA4. Owner public pages also support owner-provided GA4/Meta IDs as external owner-owned integrations, documented in `__docs__/client-menu/analytics-tracking/analytics-tracking_firebase.md`. | Partial. Use Google Ads conversion tracking only for paid campaigns, but do not remove current consent-gated website analytics or owner-provided GA4/Meta support without a migration plan. |
| Track no hovers, scroll noise, every tab click, per-keystroke input | Current feature docs already reject scroll depth, per-keystroke search, hover/passive exposure, high-frequency continuous behavior, and generic ops counters in Firestore. | Agree, already enforced. |

## Architecture Concerns

1. PostHog is the largest scope risk. Adding it to the owner dashboard would create a second internal user-behavior plane, new privacy controls, new consent/DPDP review, a dependency addition, CSP updates, env setup, and a tracking taxonomy. It is not needed for launch-critical owner analytics because the existing Firestore read models already serve Business Health and dashboard summaries.

2. Plausible Business as the default is overbuilt unless we need Business-only features on day one. The current production decision is buy Cloud instead of self-host; the plan tier should be tied to immediate use, not hypothetical reporting.

3. The suggested public event collector is already implemented under a different route. Creating another endpoint would violate the repo's DAL/cost discipline and duplicate validation/security work.

4. Sentry should be treated as an operational readiness check, not a vendor selection. Any remaining work is config, DSN, sampling, and coverage verification.

5. Before adding Plausible, decide whether it replaces website GA/Clarity or runs in parallel. Running all three on marketing pages would increase consent complexity and script surface without a clear reporting owner.

6. Completed follow-up: Answerlattice and MenuList website resource analytics no longer send generated `session_id` parameters to GA events. Before adding more analytics vendors, keep custom session identifiers out of third-party website payloads unless a separate privacy/legal review approves them.

## Approved Tracking Boundary

### Marketing Websites

Allowed:

- Page views
- High-signal CTA clicks
- Lead/demo/contact form success
- Pricing page visits
- Resource/blog CTA clicks
- 404s
- UTM campaign reporting
- AI/referral source reporting

Rejected:

- Owner/customer identifiers
- Private business data
- Raw account IDs
- Form field values
- Heatmaps/session replay by default
- Every tab/FAQ/hover/scroll event

### Public Menu / OBP / Customer App

Allowed through existing MenuList-owned analytics:

- Menu opens
- OBP opens
- QR/source-tagged menu views
- Item detail opens
- Search demand and no-result search terms after sanitization
- Unavailable-item taps
- Final actions: call, WhatsApp, directions, reserve, order
- OBP links: review/social/website
- OBP share actions
- Customer app prompt/install/open/shortcut signals
- Source quality and owner-confidence summaries

Rejected:

- Third-party tools as the owner-facing source of truth
- Raw customer identity
- Raw IP stored long-term
- Per-keystroke tracking
- Hovers and scroll heatmaps
- New event collection per interaction when existing daily counters can hold the signal

### Owner Dashboard

Allowed:

- Existing owner dashboard analytics summaries
- Business Health read-only checks and analytics strips
- Sentry error and performance monitoring with sanitized context

Deferred:

- PostHog for internal product analytics, only after a separate docs-first plan with manual events, autocapture off, replay off, consent/privacy review, CSP/env updates, and a migration-safe wrapper.

## Prioritized Action Plan

### P0 - Decision Before Any Code

1. Current implementation decision: marketing websites stay on the existing consent-gated GA4/Clarity or GA4 stack. Plausible requires a separate migration task.
2. If using Plausible now, pick Growth unless a named Business-only requirement exists immediately.
3. Keep public menu/OBP/customer-app analytics on the existing MenuList-owned route and read-model docs.
4. Do not add PostHog for launch unless there is a concrete internal product-analytics question that existing logs/Sentry/Firestore summaries cannot answer.

### P1 - If Plausible Is Approved

1. Create a docs-first implementation note for the website analytics migration.
2. Update privacy/legal copy, consent behavior, CSP allowlist, env docs, launch prerequisites, and website analytics tests.
3. Define a sparse website-only event taxonomy.
4. Do not send tenant IDs, owner/user IDs, raw business fields, or session identifiers to Plausible.
5. Decide whether GA4/Clarity are removed or kept for a bounded transition.

### P1 - If PostHog Is Later Approved

1. Use PostHog Cloud EU.
2. Manual events only.
3. Autocapture disabled.
4. Session replay disabled initially.
5. No owner names, emails, phones, business names, raw menu text, tenant IDs, payment details, tokens, or raw uploaded content.
6. Product analytics stays internal; owner-facing analytics remains MenuList-owned aggregates.

### P2 - Cleanup / Audit

1. Completed June 25, 2026: Answerlattice and MenuList website resource GA4 events no longer send custom repo-generated `session_id` parameters.
2. Verify Sentry DSNs, feature flags, sampling, and production project separation.
3. Re-check website privacy copy if GA4/Clarity/Plausible combinations change.

## Doctrine Preservation Check

Doctrine-worthy principle found: "Third-party tools are for operators; MenuList-owned data is for product truth." This is already represented by the active analytics specs, Firebase cost doc, Business Health docs, and MenuList cost posture. No new constitution-level doctrine document is required from this conversation.

## Review Verdict

Adopt the boundary, not the stack list.

The correct immediate strategy is:

1. Keep MenuList-owned analytics as canonical for public menu, OBP, customer app, owner dashboard, and Business Health.
2. Treat Plausible Cloud as an optional marketing-site analytics replacement or supplement, not a product analytics layer.
3. Do not self-host Plausible.
4. Do not add PostHog now.
5. Use Sentry as the existing reliability layer.
6. Use Google Ads/GA4 only where acquisition measurement requires it, while preserving current consent-gated website analytics and owner-provided GA/Meta integrations unless a migration plan changes them.
