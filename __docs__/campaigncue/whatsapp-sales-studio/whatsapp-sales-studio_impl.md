# WhatsApp Sales Studio - Implementation

## Runtime Contract

WhatsApp Sales Studio must separate `draft`, `manual_export`, `template_submission`, and `approved_send` modes. Direct send must remain disabled until provider credentials, opt-in handling, template approval, and policy gating are configured.

## Current Runtime

Current CampaignCue output generates WhatsApp-ready copy inside the campaign pack and exposes copy/download/export actions. There is no contact import, audience send, template submission, webhook processing, delivery/reply capture, opt-out processing, or direct-send action in the active runtime.

## Flow

1. Load campaign facts, CTA, audience segment, and consent posture.
2. Generate WhatsApp message variants.
3. Run Creative Trust Center checks.
4. Estimate provider and message usage cost if direct send is enabled.
5. Route to manual export, template submission, or approved send.
6. Store send/export result and opt-out/reply events when available.

## Data Objects

| Object | Purpose |
| --- | --- |
| `whatsappCampaigns` | Message campaign metadata and mode. |
| `whatsappMessageVariants` | Draft text, CTA, language, and template mapping. |
| `whatsappConsentStates` | Segment-level consent posture and exclusions. |
| `whatsappEvents` | Export, send, reply, delivery, and opt-out events. |

## API Boundary

- Provider adapters must validate webhook signatures.
- Message sends must be idempotent by `campaignId + recipientRef + variantId`.
- Direct send requires rate limits, retry limits, and stop-list checks.
- Manual export must mark the result as owner-controlled, not system-sent.

## Acceptance

- A workspace can use WhatsApp Sales Studio without direct WhatsApp credentials.
- Direct send is blocked when consent posture is missing.
- Opt-out events do not update future campaign eligibility until the WhatsApp provider integration, webhook verification, and suppression-list model are configured.
