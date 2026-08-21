# EmailOS — Firebase Cost and Data Contract

> **Last Updated:** August 15, 2026
> **Provider state:** Disabled until onboarding

## Summary

- **MenuList collections:** `emailOsDeliveries`, `emailOsWebhookReceipts`, `emailOsSuppressions`
- **Answerlattice collections:** `answerlattice_emailOsDeliveries`, `answerlattice_emailOsWebhookReceipts`, `answerlattice_emailOsSuppressions`
- **Storage:** None
- **New scheduler:** None
- **New listener:** None
- **Provider-disabled cost:** Zero EmailOS reads, writes and provider calls

## Send Operations

| Operation | Trigger | Reads | Writes | Notes |
| --- | --- | ---: | ---: | --- |
| Check suppression and claim delivery | First admitted provider send | 2 | 1 | Product-scoped recipient-hash read plus transaction read/create of deterministic delivery |
| Record accepted or explicit provider result | Provider response | 1 | 1 | Monotonic transaction read/update; no body or plaintext recipient |
| Duplicate or ambiguous claimed delivery | Repeated local delivery identity | 2 | 0 | Suppression read plus delivery-claim read; no provider request |
| Retry explicit retryable rejection | Known `429`/`5xx` rejection | 3 | 2 | Suppression read, claim reacquisition, then result transaction; ambiguous outcomes cannot reacquire |
| Rejected configuration | Missing flag/key/domain | 0 | 0 | Fails before Firebase and provider work |
| Suppressed recipient | Active local suppression | 1 | 0 | No paid provider request |

## Webhook Operations

| Operation | Trigger | Reads | Writes | Notes |
| --- | --- | ---: | ---: | --- |
| Duplicate receipt | Replayed `svix-id` | 1 | 0 | Transaction exits without repeat mutation |
| Delivery status event with internal tag | New verified event | 2 | 2 | Receipt read/create plus direct delivery read/update |
| Untagged legacy delivery status | New verified event | Up to 3 | 2 | Receipt read, optional direct lookup and provider-ID-hash fallback query |
| Bounce or complaint | New verified terminal event | 2 | 3 | Receipt and delivery reads; receipt, delivery and suppression writes |
| Suppression removal | Verified product-bound provider removal | Up to 3 | 2 | Receipt read, delivery identity lookup, receipt create and suppression update |
| Wrong-product or unbound signed event | Valid team webhook event without local product proof | Up to 3 | 0 | Returns `200 ignored`; no receipt, delivery or suppression write |
| Invalid signature | Unverified request | 0 | 0 | No Firestore operation |

The exact transaction may perform fewer operations when no matching delivery or suppression record exists.

## Retention

| Record | Retention |
| --- | --- |
| Delivery mapping | 90 days through `expiresAt` TTL |
| Webhook receipt | 90 days through `expiresAt` TTL |
| Active suppression | No TTL |
| Removed suppression audit state | Retained as inactive until explicit retention policy permits cleanup |

## Cost Estimate

Example for 10,000 accepted emails with two provider events each and a 1% terminal suppression rate:

| Resource | Approximate operations |
| --- | ---: |
| Send-path reads | About 30,000 (suppression, claim and provider-result transactions) |
| Delivery writes | About 20,000 (queued attempt plus accepted-provider result) |
| Webhook transaction reads | About 40,000 for tagged events; higher only for untagged legacy fallback |
| Webhook writes | 40,000–40,300 |
| Suppression writes | About 100 |

Provider subscription and overage costs dominate Firestore cost at this scale. Email bodies are not persisted, preventing document growth and unnecessary storage.

## Security Rules

Browser access is not added. Both product rulesets contain explicit deny rules for EmailOS delivery, webhook-receipt and suppression collections; writes use only product-scoped Admin SDK runtimes. No query index is required. TTL field overrides are declared for each product’s delivery, webhook-receipt and suppression collections; active suppressions omit `expiresAt`, while inactive suppression audit records can expire.

## Cost Controls

- Product send flags default off.
- No status polling.
- Webhooks replace delivery polling.
- Hashed recipient documents and bounded single-field provider-ID-hash queries avoid plaintext recipient lookup and composite indexes.
- TTL limits receipts and delivery mappings.
- Full HTML and raw webhook bodies are not persisted.
- CampaignCue and disabled products generate no EmailOS Firebase cost.
- NotificationOS supplies the complete bounded email request. EmailOS never re-reads tenant, store, workspace, locale, preference or WhatsApp-consent data, so combined email/WhatsApp delivery does not duplicate product-context reads.
