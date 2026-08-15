# EmailOS — Documentation Hub

> **Feature:** Cross-product production email infrastructure
> **Status:** Approved for implementation; provider activation remains disabled
> **Last Updated:** August 15, 2026
> **Version:** 1.0.0

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| Founder / Product | [Specification](./email-os_spec.md) | Long-term product and provider decisions |
| Developers | [Implementation](./email-os_impl.md) | Runtime contracts, files, security and rollout |
| Sales / Product Marketing | [Marketing](./email-os_marketing.md) | Approved internal positioning |
| Public Content Owners | [Website](./email-os_website.md) | Public-claim boundary |
| Operators | [Help](./email-os_helpdoc.md) | Setup, activation and incident handling |
| Cost Review | [Firebase](./email-os_firebase.md) | Reads, writes, retention and provider cost |
| Mobile Review | [Mobile](./email-os_mobile-support.md) | Mobile admission decision |
| QA | [Test Cases](./email-os_test-cases.md) | Source, emulator and provider certification matrix |
| Final Review | [Validation](./email-os_validation.md) | Workflow parity, fixes, evidence and external blockers |

## What Is EmailOS?

EmailOS is the shared internal contract for rendering, sending and observing product email. It standardizes React Email templates, Resend delivery, provider idempotency, signed webhooks and suppression handling without merging product data or credentials.

EmailOS is the email delivery plane beneath [NotificationOS](../notification-os/README.md). NotificationOS resolves product context once and decides whether email, WhatsApp, or both are eligible; EmailOS receives a complete bounded email request and must not re-fetch tenant, store, workspace, recipient-preference, or WhatsApp-consent data.

## Current Implementation State

- Shared contracts, React Email rendering, Resend adapters, signed webhook processors, suppression state, TTL declarations, migration branches and focused verification are implemented.
- Every provider-send flag remains off, no Resend account or credential has been created, and no live email has been sent.
- Existing SMTP delivery remains only as the controlled pre-onboarding migration path. It is removed after product-by-product QA cutover certification.
- QA TTL deployment is pending: MenuList’s Firebase deploy preflight returned two Rules API `503` responses; the current operator lacks Answerlattice QA index permission; and the direct `gcloud` TTL command is unavailable on this machine.

## Product Boundary

| Product | Contract | Rendering | Provider send | Activation rule |
| --- | --- | --- | --- | --- |
| MenuList | Included | Included | Implemented behind an off flag | Activate after Resend QA certification |
| Answerlattice | Included | Included | Implemented behind an independent off flag | Activate after separate Resend QA certification |
| SignalDesk | Included as policy | Approved-template use only | Existing provider-send flag stays off | Separate legal, reputation and provider approval |
| CampaignCue | Included as policy | Export preview only | Prohibited | Preserve `export_download_only` |
| MyCodex | Disabled | None | Prohibited | Static product boundary |
| Neelvara | Disabled | None | Prohibited | Static parent-site boundary |

## Architecture Overview

```text
Product-owned event and delivery claim
  -> EmailOS contract validation
  -> product-scoped suppression check
  -> durable local provider claim
  -> React Email HTML and plain-text rendering
  -> product-scoped Resend adapter with deterministic idempotency
  -> provider message ID and delivery record
  -> signed product-scoped webhook with local-delivery tag lookup
  -> idempotent receipt and monotonic delivery status
  -> hashed product-scoped suppression state
```

The product queue remains the source of workflow truth. Resend does not own business events, retries, consent, quiet hours, entitlement or recipient selection.

For owner/account lifecycle events, the product queue is the existing Owner Notifications substrate governed by NotificationOS. EmailOS provider delivery and webhook collections remain separate because they record email-provider truth, while NotificationOS records only cross-channel orchestration truth.

## Feature Flags

All provider-send flags default to `false`. Rendering and contract verification are safe to test without a provider account. No live send is admitted until the product-specific key, webhook secret, verified domain, DNS evidence and QA certification exist.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0.0 | 2026-08-15 | Frozen cross-product contract, product boundaries and Resend onboarding gate |
