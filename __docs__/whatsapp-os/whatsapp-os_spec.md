# WhatsAppOS — Product Specification

> **Status:** Approved for implementation; no provider activation implied
> **Last Updated:** August 15, 2026

## Executive Summary

WhatsAppOS centralizes official Meta WhatsApp delivery for approved product use cases. It is a channel delivery plane, not the cross-channel notification brain. NotificationOS decides lifecycle routing; authentication and owner-started messaging workflows may call WhatsAppOS directly.

## Goals

1. Use one typed Meta client and version/config boundary per runtime.
2. Support authentication, transactional/operational and conversational message classes without mixing their consent or retry rules.
3. Use product-specific business accounts, phone-number IDs, access tokens, webhook secrets/tokens, templates and quality/reputation boundaries.
4. Reconcile accepted, sent, delivered, read and failed provider states through verified webhooks.
5. Preserve the owning workflow’s durable identity while keeping only a compact provider-message mapping.
6. Make every provider request deterministic, bounded and safe against duplicate replay.
7. Add zero product-scope reads inside the WhatsApp adapter.

## Non-Goals

- Email delivery or channel selection.
- Marketing broadcasts, contact-list uploads or audience building.
- Treating phone verification as notification consent.
- Copying NotificationOS events, OTP challenges or messaging sessions into another queue.
- Automatic resend after timeout or other ambiguous outcome.
- Shared credentials or sender reputation across unrelated products.

## Message Classes

| Class            | Example                                             | Invocation                          | Consent/policy                                                                                 |
| ---------------- | --------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `authentication` | Login/onboarding OTP                                | Direct from auth                    | Authentication-specific template and product policy; not notification opt-in                   |
| `transactional`  | Payment risk, publish failure                       | NotificationOS                      | Verified destination, explicit opt-in where required, approved template outside service window |
| `operational`    | Account action or support readiness                 | NotificationOS                      | Same policy boundary as registry classification                                                |
| `conversational` | Owner sends a menu and receives preview/fix replies | Messaging onboarding                | Owner-started service-window rules; approved template when outside allowed window              |
| `marketing`      | Promotions/outreach                                 | Rejected for MenuList/Answerlattice | Separate legal/provider/reputation approval required                                           |

## Provider Request Contract

Every request includes:

- product code and message class;
- deterministic local delivery reference;
- canonical E.164 destination;
- configured product sender/phone-number identity;
- either an approved template key/version/language with bounded parameters or an active service-window message;
- bounded metadata for internal routing, never tenant secrets or raw business objects.

The adapter never receives a tenant/store/workspace ID merely to fetch more data. The caller supplies the final channel payload built from its already-resolved context.

## Template Governance

- Maintain a product-scoped template registry with internal key, Meta template name, category, language, parameter schema, version and approval status.
- Reject arbitrary template names and unbounded parameter arrays.
- A semantic event may render differently for email and WhatsApp while preserving the same meaning/action.
- Template approval state is configuration, not silently inferred from a provider error.
- Session text is allowed only when a validated active customer-service window is supplied by the owning workflow.

The current adapter already refuses free-form text without either a template or active session (`src/lib/owner-notifications/channels/whatsapp.ts:64-93`); this becomes a shared invariant.

## Consent

- Store notification opt-in as explicit evidence: status, source, timestamp and policy version.
- Revocation applies immediately to later processing attempts.
- OTP requests do not create lifecycle-notification consent.
- An inbound owner message can establish a service window but does not grant unrelated marketing permission.
- NotificationOS checks event eligibility; WhatsAppOS performs a final fail-closed consent/policy assertion before a transactional/operational provider call.
- Consent status is never inferred solely from `phoneVerifiedAt`, a public business phone or an old boolean.

Meta’s policy requires appropriate recipient permissions and restricts business-initiated messages outside the customer-service window to approved templates: https://whatsappbusiness.com/policy/

## Delivery State

| State       | Meaning                                                        |
| ----------- | -------------------------------------------------------------- |
| `claimed`   | Owning workflow has reserved a deterministic attempt           |
| `accepted`  | Meta returned a bounded message ID                             |
| `ambiguous` | Request may have reached Meta but response is not safely known |
| `sent`      | Provider status says sent                                      |
| `delivered` | Provider status says delivered                                 |
| `read`      | Provider status says read; not a business-action guarantee     |
| `failed`    | Explicit provider/webhook failure with sanitized local code    |
| `skipped`   | Policy/config/contact/template prevented provider work         |

Statuses are monotonic. Duplicate/out-of-order webhooks cannot move a message backward. A read receipt must never be treated as proof that the owner completed the requested action.

## Product Boundary

| Product            | Admitted use                                           | Activation                                                      |
| ------------------ | ------------------------------------------------------ | --------------------------------------------------------------- |
| MenuList           | OTP, messaging onboarding, consented lifecycle notices | Product-specific Meta certification                             |
| Answerlattice      | Consented owner/support-readiness notices              | Separate Meta account/number/templates/consent UX certification |
| CampaignCue        | None; export-only remains                              | Direct provider calls rejected                                  |
| SignalDesk         | None by default                                        | Separate legal, template-category and reputation decision       |
| MyCodex / Neelvara | None                                                   | Rejected                                                        |

## Success Criteria

- One shared Meta client per runtime and no hardcoded Graph version in feature adapters.
- Zero product-context Firestore reads in WhatsAppOS send/render paths.
- Every business-initiated send uses an admitted template or proven service window.
- Every accepted provider ID maps to exactly one owning workflow delivery.
- Verified webhooks update outcomes idempotently and monotonically.
- Provider flags off means zero provider and WhatsAppOS Firebase operations.
- Consent withdrawal prevents future lifecycle sends without disabling unrelated auth by accident.

## Frozen Decisions

1. Official Meta integration remains the provider; no third-party WhatsApp BSP is introduced.
2. WhatsAppOS remains separate from NotificationOS.
3. Product workflows retain their own ledgers.
4. A compact provider-message mapping is permitted only for webhook routing.
5. Authentication consent and lifecycle-notification consent are separate.
6. No automatic resend of ambiguous outcomes.

## Doctrine Preservation

This is infrastructure governance. It does not change MenuList’s public-truth doctrine or Answerlattice’s governed-answer doctrine.
