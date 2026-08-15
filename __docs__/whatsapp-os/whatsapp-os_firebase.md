# WhatsAppOS — Firebase Cost And Data Plan

> **Status:** Implemented cost contract; provider activation pending
> **Last Updated:** August 15, 2026

## Cost Principle

WhatsAppOS does not fetch store, workspace, user profile, locale, preferences or notification content. Its caller passes a complete bounded request. This guarantees that NotificationOS combined delivery does not duplicate Firebase business reads.

## Data Ownership

| Data                                  | Owner                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Notification event/channel outcome    | Existing NotificationOS/Owner Notifications collections                     |
| OTP challenge and result              | Existing phone OTP records                                                  |
| Messaging onboarding session/delivery | Existing messaging onboarding collections                                   |
| Provider message-to-owner mapping     | `whatsappOsMessageRefs`                                                     |
| Deduplicated provider webhook receipt | `whatsappOsWebhookReceipts`                                                 |
| Consent audit changes                 | `whatsappOsConsentEvents` plus current projection in authoritative settings |

No generic `whatsappOsDeliveries` business ledger is added.

## Send Operations

| Outcome                                    | Reads | Writes | Provider calls | Notes                                                 |
| ------------------------------------------ | ----: | -----: | -------------: | ----------------------------------------------------- |
| Flag/config/template/consent rejected      |     0 |      0 |              0 | Fail before provider work                             |
| Explicit Meta rejection without message ID |     0 |      0 |              1 | Caller records failure in owning ledger               |
| Meta accepts with message ID               |     0 |      1 |              1 | Create compact `whatsappOsMessageRefs/{hash}` mapping |
| Duplicate owning claim                     |     0 |      0 |              0 | Caller prevents entry to provider adapter             |
| Ambiguous timeout                          |     0 |      0 |    1 uncertain | No automatic replay or fabricated mapping             |

The owning workflow’s existing claim/result operations are additional but not duplicated by WhatsAppOS.

## Webhook Operations

| Outcome                   | Reads | Writes | Notes                                                                                          |
| ------------------------- | ----: | -----: | ---------------------------------------------------------------------------------------------- |
| Invalid signature/body    |     0 |      0 | Reject before Firestore                                                                        |
| New status receipt        |     2 |    2-3 | Receipt create check + message mapping read; receipt + monotonic mapping and owning-row update |
| Exact duplicate           |     1 |      0 | Receipt already exists                                                                         |
| Out-of-order lower status |     2 |      1 | Record receipt; do not regress message/owner state                                             |
| Unknown/early message ID  |     2 |      2 | Record receipt plus direct-ID placeholder; accepted send later resolves it without a query      |

Implementation may combine valid receipt/mapping/owning updates in one transaction when all documents are in the same Firebase project. Cross-project consumers must use product-local endpoints so cross-project transactions are never attempted.

## Consent Operations

| Action                        |        Reads | Writes | Notes                                                                                     |
| ----------------------------- | -----------: | -----: | ----------------------------------------------------------------------------------------- |
| Grant/revoke                  |            2 |      2 | Fetch store+verified user together, update projection and consent event atomically         |
| Preference-only change       |            2 |      1 | Reuse fetched identity; no consent event when consent did not change                        |
| Normal notification planning  | 0 additional |      0 | Consent projection already came from NotificationOS’s one scope read                      |

## Retention

| Record                     | Retention                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Provider message reference | 30 days minimum; 90 days when support/certification requires it                                     |
| Webhook receipt            | Same as message reference                                                                           |
| Consent event              | Retain according to legal/policy evidence requirement; do not TTL active current consent projection |
| Raw webhook/body           | Never stored                                                                                        |

Finalize the exact retention with current legal/provider requirements before activation; do not silently shorten consent evidence.

## Indexes And Queries

- Use hashed provider message ID as a direct document ID.
- Use deterministic receipt IDs for direct reads.
- Consent audit is append-only and not part of the send hot path.
- No provider polling, realtime listener, provider-ID collection scan or cross-product query.
- No new scheduled Function; use webhooks and existing maintenance scheduler registration for expired rows if TTL deployment is unavailable.

## Example Cost

For 10,000 accepted messages with two unique status webhooks each:

| Resource                                |                                              Approximate operations |
| --------------------------------------- | ------------------------------------------------------------------: |
| Provider mapping writes                 |                                                              10,000 |
| Webhook reads                           |                                                              40,000 |
| Receipt writes                          |                                                              20,000 |
| Mapping/owning-state writes             | Up to 40,000 combined, fewer when terminal/duplicate rules converge |
| Product-context reads inside WhatsAppOS |                                                                   0 |

Meta conversation/template charges and provider policy dominate this Firebase envelope. Cost must be recalculated from the current Meta pricing model during onboarding.

## Acceptance Gates

- Emulator proves zero product DAL reads in send and webhook modules.
- Combined NotificationOS test proves one scope fetch total.
- Duplicate webhook performs one receipt read and zero writes after the early duplicate return.
- No plaintext recipient or body in documents/indexes.
- Product flags off produce zero WhatsAppOS Firebase/provider operations.
