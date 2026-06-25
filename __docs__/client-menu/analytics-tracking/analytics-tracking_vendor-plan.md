# Analytics Vendor Plan

**Feature:** Customer Menu Analytics and Public Website Measurement  
**Status:** Active decision  
**Last Updated:** June 26, 2026  
**Source Review:** `analytics-tracking/_archive/chatgpt-production-analytics-stack-review-2026-06-25.md`

---

## Decision

MenuList keeps product analytics and owner-facing business truth inside the existing MenuList-owned analytics pipeline. Third-party analytics tools are allowed only for public marketing-site acquisition measurement or owner-provided external pixels.

| Surface | Approved System | Boundary |
| --- | --- | --- |
| MenuList marketing website | Consent-gated Plausible Cloud, plus GA4 only where needed for Google Ads/conversion continuity, plus Microsoft Clarity only where visual behavior review is intentionally retained | Website-only analytics. Do not send tenant ids, owner ids, user ids, customer ids, raw IPs, emails, phone numbers, custom session ids, or business/private identifiers. |
| Answerlattice marketing website | Consent-gated Plausible Cloud, plus existing GA4 wrapper only where needed for ads/conversion continuity | Keep website measurement separate from Answerlattice product governance, support analytics, widget analytics, and customer workspace truth. |
| Public menu, Official Business Page, and Customer App | Existing `POST /api/public/analytics/track` daily-doc pipeline | Third-party tools must not become canonical owner dashboard or Business Health truth. |
| Owner dashboard and Business Health | Existing Firestore read models, dashboard summaries, and Business Health signal helpers | Do not add PostHog for launch. If approved later, it must be internal product-usage telemetry only. |
| Paid acquisition | Google Ads plus GA4 conversion tracking when campaigns start | Track only campaign conversion actions such as lead, demo, signup, and subscription events. |
| Reliability | Existing Sentry integration | Treat Sentry as operational monitoring, not analytics replacement. |

---

## Current Launch Position

Plausible Cloud is approved for the two public marketing websites only:

1. Configure `menulist.ai` and `answerlattice.com` as Plausible sites.
2. Set the production env vars in Vercel:
   - `NEXT_PUBLIC_MENULIST_PLAUSIBLE_DOMAIN=menulist.ai`
   - `NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_DOMAIN=answerlattice.com`
   - optional script overrides only when the Plausible dashboard provides a site-specific script URL.
3. Keep MenuList-owned analytics as the only owner-facing business-truth system.
4. Do not self-host Plausible.
5. Do not add PostHog now.
6. Do not create another public analytics collector endpoint.
7. Do not send tenant ids, owner ids, user ids, customer ids, raw IPs, emails, phone numbers, or custom session identifiers to third-party website analytics events.

The code mounts Plausible only after the public website analytics consent banner is accepted and only when the relevant `NEXT_PUBLIC_*_PLAUSIBLE_DOMAIN` env var is configured.

GA4 remains optional for paid campaign attribution and existing conversion continuity. Microsoft Clarity remains MenuList-only for visual behavior observation and should be reviewed after launch; it is not the canonical analytics dashboard.

## Plausible Rule

Plausible Cloud is the preferred public marketing-site analytics layer. It is not product analytics.

- Use Plausible Growth as the default paid plan for `menulist.ai` plus `answerlattice.com` because the immediate need is two public marketing sites and basic custom events.
- Use Plausible Business only when a concrete day-one need exists for Business-only features such as custom properties, funnels, journeys, revenue goals, Stats API, Looker Studio, ecommerce attribution, or consolidated views.
- Keep Plausible custom events property-free on Growth. Event names are enough for launch monitoring.
- Do not self-host Plausible; it adds maintenance, uptime, backup, security, capacity, and upgrade ownership that does not fit the current launch cost posture.
- Plausible event counts contribute to billable monthly pageviews, so avoid noisy scroll, hover, heartbeat, replay, or per-keystroke events.
- Configure Plausible goals for each custom event that should appear in the dashboard.

Launch event names:

| Site | Event | Source |
| --- | --- | --- |
| MenuList | `create_customer_link_clicked` | Global marketing CTA tracker and resource CTA tracker |
| MenuList | `pricing_clicked` | Global marketing CTA tracker and resource CTA tracker |
| MenuList | `whatsapp_cta_clicked` | Global marketing CTA tracker |
| MenuList | `login_clicked` | Global marketing CTA tracker |
| MenuList | `ai_summary_link_clicked` | Global marketing CTA tracker |
| MenuList | `resource_page_viewed` | Resource article/hub analytics |
| MenuList | `ai_referral_detected` | Resource referrer analytics |
| MenuList | `resource_checklist_copy` | Resource checklist copy action |
| Answerlattice | Existing `data-answerlattice-event` names | Delegated public-site conversion tracker |
| Answerlattice | `answerlattice_resource_page_viewed` | Resource article/hub analytics |
| Answerlattice | `answerlattice_ai_referral_detected` | Resource referrer analytics |
| Answerlattice | `onboarding_completed` | Public get-started completion |
| Answerlattice | `widget_key_generated` | Public get-started completion, without API key material |

References:

- Plausible pricing and plan split: https://plausible.io/
- Plausible subscription guide: https://plausible.io/docs/subscription-plans
- Plausible custom events: https://plausible.io/docs/custom-event-goals
- Plausible script setup: https://plausible.io/docs/plausible-script
- Plausible Next.js integration: https://plausible.io/docs/nextjs-integration
- Plausible custom properties privacy rules: https://plausible.io/docs/custom-props/introduction
- Plausible self-hosting tradeoffs: https://plausible.io/self-hosted-web-analytics

---

## Current Product Analytics Position

1. Keep MenuList-owned analytics as the only owner-facing business-truth system.
2. Do not create another public analytics collector endpoint.
3. Do not send product identifiers, owner identifiers, workspace identifiers, customer identifiers, or custom session identifiers to third-party website analytics events.

---

## PostHog Rule

PostHog is rejected for launch.

If a later internal product-analytics plan is approved:

1. Use Cloud EU unless legal/operations explicitly choose another region.
2. Disable autocapture.
3. Disable session replay.
4. Track manual events only through a local wrapper.
5. Keep owner dashboard, billing, auth, menu editing, and private Answerlattice workspaces out of broad capture.
6. Update privacy, consent, CSP, environment docs, and a docs-first event taxonomy before adding the dependency.

References:

- PostHog pricing/free tier: https://posthog.com/pricing
- PostHog autocapture behavior: https://posthog.com/docs/product-analytics/autocapture
- PostHog privacy controls: https://posthog.com/docs/product-analytics/privacy
- PostHog GDPR notes: https://posthog.com/docs/privacy/gdpr-compliance

---

## Product Analytics Rule

Product analytics means MenuList-owned aggregate analytics unless a separate architecture review changes that.

Allowed product signals:

- menu views
- item views and item taps
- unique search terms
- unavailable-item taps
- final menu actions
- OBP actions
- Customer App actions
- anonymous session milestones
- owner-visible source quality counters

Rejected product signals:

- raw event lake
- duplicate analytics ingestion API
- third-party canonical owner dashboard truth
- hover, scroll, per-keystroke, heartbeat, replay, or passive heatmap tracking
- tenant/user/customer identifiers in third-party website events
- custom third-party session identifiers

---

## Completed Follow-Up

On June 25, 2026, public website resource analytics were minimized:

- `src/components/website/resources/ResourceAnalytics.tsx` no longer sends a custom `session_id` parameter.
- `src/components/website/resources/ResourceTrackedLink.tsx` no longer sends a custom `session_id` parameter.
- `src/app/sites/answerlattice/components/AnswerlatticeResourceAnalytics.tsx` no longer sends a custom `session_id` parameter.

The events still keep page/referrer/UTM/entry-page context for acquisition reporting, but third-party event payloads no longer include a repo-generated website session identifier.

On June 26, 2026, Plausible website-only analytics wiring was added:

- `src/components/shared/analytics/PlausibleAnalyticsScript.tsx` owns the shared consent-gated Plausible script mount.
- `src/components/website/PlausibleAnalytics.tsx` mounts MenuList Plausible when `NEXT_PUBLIC_MENULIST_PLAUSIBLE_DOMAIN` is configured.
- `src/components/website/WebsiteMarketingClickTracker.tsx` tracks key MenuList marketing website CTA clicks.
- `src/app/sites/answerlattice/components/AnswerlatticePlausibleAnalytics.tsx` mounts Answerlattice Plausible when `NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_DOMAIN` is configured.
- `src/app/sites/answerlattice/components/AnswerlatticeAnalytics.tsx` forwards existing `data-answerlattice-event` website events to Plausible.
- `src/config/csp-allowlist.ts` allows Plausible script and event endpoints.
- `.env.staging.example` and `.env.production.example` document website-only Plausible env vars.
