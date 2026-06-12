# Analytics Learning - Spec

## Summary

Analytics Learning captures campaign outcomes from exports, publish events, replies, clicks, post insights, ad metrics, manual owner entries, and channel callbacks. It turns results into practical next-campaign cues.

## Current Runtime

The active runtime captures observed CampaignCue actions and reads a dashboard summary. Provider publish events, replies, clicks, post insights, ad metrics, and channel callbacks are not active until a separate future provider layer is configured; explicit owner outcome entry is active.

## Goals

- Show what happened after a campaign without pretending attribution is perfect.
- Compare channels, offers, services, locations, and creative variants.
- Feed the Opportunity Engine with observed results.
- Keep reports clear for owners and useful for agencies.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Outcome capture | Export, publish, click, reply, manual result, and provider metric events can be recorded. |
| Attribution posture | Reports distinguish observed, imported, estimated, and manually entered outcomes. |
| Next cue | Results can create campaign improvement cues. |
| Channel views | WhatsApp, Google, ads, organic social, and manual outputs have separate metric contracts. |
| Agency report | Agencies can prepare client-readable reports. |
| No overclaim | UI must not claim direct revenue attribution unless source supports it. |

## Success Metric Families

CampaignCue success is measured by trust-safe campaign usage, not raw asset generation.

| Metric family | Examples | Guardrail |
| --- | --- | --- |
| North Star | Trust-safe campaign packs used after generation. | Count used packs, not drafts created. |
| Activation | Source added, first cue accepted, first pack generated, first export/manual task completed. | Do not count setup-only users as activated. |
| Restaurant | Menu-item campaigns, top-item campaigns, public menu link usage, WhatsApp order packs, Google menu posts, price/source trust pass rate. | Do not claim orders unless source data proves them. |
| Salon | Service campaigns, booking campaigns, before/after consent confirmations, WhatsApp booking messages, claim-warning resolution. | Do not claim transformations or results without evidence. |
| WhatsApp | Packs generated, messages copied/shared/exported, status images/videos downloaded, opt-out/consent blocks. | Copied message is not a confirmed booking or order. |
| Google/local | Google packs generated, posts copied/exported, and future local-post insights only where a future provider layer is authorized. | No ranking or SEO improvement claims. |
| Ads | Ad packs generated/exported, click-to-WhatsApp variants, policy warnings, spend approvals, and future provider metrics only where authorized. | No lead, ROI, or lower-cost claim without measured source. |
| Agency | Client setup, weekly pack delivery, approval completion, revision count, report shares, trust issues resolved, credits by client. | Never mix metrics across clients. |
| Multi-location | Location variants generated, local trust pass rate, approval/export by location, partial success, local source mapping. | Do not double-count master campaign plus location variants. |
| Billing/credits | Estimate accuracy, credits per used campaign, failed-generation refunds, credits by client/location/module. | Failed provider attempts need visible reconciliation. |
| Trust | Trust checks run, blockers created/fixed, warning acknowledgements, override requests, latency, source-conflict rate. | Trust status must be version-specific. |
| Manual export | Export/download shown, manual task completed, approval requested, and owner outcome recorded. | Manual export is the active delivery path, not a failure. |
| Source/data quality | Missing WhatsApp number, Google profile mismatch, stale source, low-confidence extraction, asset gaps. | Source confidence must remain visible. |

## Non-Goals

- It is not a full business intelligence platform.
- It does not replace ad platform reporting.
- It does not claim perfect offline attribution.

## Risks

- Imported metrics can be delayed, sampled, or unavailable.
- Manual owner entries can be inconsistent.
- Too many metrics can confuse non-technical owners.
