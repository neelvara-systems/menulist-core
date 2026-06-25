# QR WhatsApp Experiments Spec

**Status:** Docs-ready
**Last Updated:** June 25, 2026

## Problem

SMB owners can print QR assets, but they do not know which physical creative actually drives customer intent. A QR that gets more scans may still produce fewer useful WhatsApp chats, fewer opt-ins, fewer bookings, or lower revenue.

MenuList should not solve this by adding scan counters to every QR code. Normal menu QR scans should stay direct, quiet, and fast. The experiment layer should be explicit, campaign-based, and consent-aware.

## Goal

Create a governed feature that lets an owner test two or more physical QR campaign variants and decide a winner from downstream WhatsApp outcomes.

## Primary Owner Outcomes

| Outcome | Meaning |
| --- | --- |
| More useful WhatsApp starts | Customers scan and actually send the pre-filled message. |
| Better opt-in quality | Customers clearly agree to future updates when requested. |
| Better local campaign decisions | Owner can compare placement/creative/copy without guessing. |
| Safer printed campaigns | QR and consent copy are checked before printing. |

## Route Decision

No runtime route is implemented in this docs pass.

Recommended future routes:

| Route | Purpose |
| --- | --- |
| `/assets/experiments` | Owner experiment list and creation flow. |
| `/assets/experiments/[campaignId]` | Variant results, asset downloads, and winner state. |
| `/q/[token]` | Public tracked landing/redirect entry. Must be rate-limited and privacy reviewed before implementation. |

## Feature Flag

Runtime work must be guarded by:

```ts
FEATURE_FLAGS.ENABLE_QR_WHATSAPP_EXPERIMENTS
```

Default: `false`.

## Accepted Journey

The recommended default is tracked landing page first:

```text
QR code
-> MenuList tracked campaign URL
-> landing page with benefit and consent context
-> Continue on WhatsApp
-> wa.me link with campaign token in pre-filled text
-> customer sends message
-> inbound message/webhook or manual result ties back to campaign token
```

Direct QR-to-WhatsApp is allowed only for quick, low-measurement campaigns. Dynamic redirect-to-WhatsApp is allowed only when the owner does not need consent-copy exposure before WhatsApp.

## Metrics

| Funnel Stage | Event | Decision Use |
| --- | --- | --- |
| Exposure | Owner-entered estimate, print count, or placement count | Denominator for practical SMB comparison. |
| Scan | Token URL opened | Useful but not sufficient. |
| Landing view | Campaign page loaded | Checks redirect and page health. |
| WhatsApp click | User tapped the WhatsApp CTA | Measures intent before app handoff. |
| WhatsApp start | User sent the pre-filled message | Primary conversation start metric when webhook/manual import is available. |
| Consent | User opted in through clear action | Required for future outbound messaging. |
| Qualified lead | User selected a useful intent or gave needed context | Better decision signal than scan count. |
| Conversion | Booking, order, coupon redemption, visit, or purchase | Best winner signal when available. |
| Guardrail | STOP, opt-out, report, invalid scan, failed QR | Prevents choosing a harmful winner. |

## Winner Rule

Choose the variant with the strongest qualified outcome per exposure or per scan, as long as opt-out/report/failure guardrails do not materially worsen.

Raw scan count must never be the only winner rule.

## Experiment Types

| Experiment | Allowed Change | Keep Constant |
| --- | --- | --- |
| QR visual | Plain QR vs branded QR | CTA, offer, placement, size, destination, and timing. |
| CTA copy | Two CTA lines around the same QR visual | QR visual, offer, placement, and destination. |
| Placement | Counter vs table vs package insert | Creative, CTA, offer, and destination. |
| Destination | Landing-page-first vs direct WhatsApp | Creative, CTA, offer, and placement. |
| Opening message | Pre-filled message A vs B | Creative, placement, and offer. |

Do not test multiple variables at once unless the experiment is clearly marked as a broad campaign comparison.

## QR Safety Requirements

- Preserve a four-module quiet zone on all QR codes.
- Keep logo/brand marks outside the QR pattern unless a dedicated scan-regression suite proves the specific overlay safe.
- Use [Branded QR Action Templates](../branded-qr-action-templates/README.md) for the creative shell: brand frame, CTA, short link, and business identity around the QR.
- Test final printed output on iPhone and Android.
- Test poor light, glossy material, distance, folds, and curved surfaces where relevant.
- Do not choose a creative winner if one variant has worse QR reliability.

## Consent Requirements

- Do not treat scan, landing view, or WhatsApp click as consent.
- Consent requires clear copy and a clear action, such as checking a consent box or replying `YES`.
- Consent copy must name the business and message purpose.
- The flow must support opt-out language, including STOP-style withdrawal where WhatsApp automation is used.
- Store only the minimum personal data needed to prove consent and attribute the campaign.

## Out Of Scope

- Bulk WhatsApp sending.
- Cold WhatsApp outreach.
- WhatsApp provider send automation.
- Revenue or conversion-lift claims without real proof.
- Per-scan Firestore documents by default.
- Adding interstitials to ordinary MenuList page QR assets.
- Calling the feature a print shop, QR maker, or WhatsApp automation suite.
- Using artistic QR scenes as a production variant without scan-regression coverage.

## Acceptance Criteria

- The owner can create or select an experiment from explicit campaign intent, not accidentally from normal asset download.
- Every variant gets a unique token and printable asset.
- Variant copy, offer, placement, destination, and consent state are visible before printing.
- The dashboard separates scans, WhatsApp clicks, WhatsApp starts, consent, qualified leads, conversions, and guardrails.
- The feature defaults to aggregate-first analytics storage.
- A campaign can be stopped without breaking existing normal MenuList QR assets.
- Mobile users can view status and download/share variants where admitted.
