# EmailOS — Product Specification

> **Status:** Approved
> **Last Updated:** August 15, 2026
> **Decision Horizon:** Three years

## Executive Summary

EmailOS replaces fragmented Gmail/custom-SMTP delivery with one production email standard. Product code continues deciding when and why a message exists. EmailOS owns the final rendering, provider request, provider feedback and suppression boundary.

For cross-channel owner/account events, [NotificationOS](../notification-os/README.md) is the orchestration authority. It resolves business context once, plans email/WhatsApp eligibility, and passes EmailOS a complete bounded request. EmailOS must not repeat product-scope reads or decide WhatsApp fallback.

The selected stack is React Email for deterministic HTML and plain text, and Resend for delivery. The implementation is completed before provider onboarding, remains disabled by product-specific flags, and fails closed when credentials or sender authority are absent.

## Goals

1. Use one email contract across products without sharing tenant data or Firebase projects.
2. Produce HTML and plain-text content for every admitted email.
3. Prevent duplicate provider sends through durable product claims and provider idempotency keys.
4. Record sent, delivered, delayed, failed, bounced, complained and suppressed provider outcomes.
5. Stop sending to a hashed product-scoped recipient after a permanent bounce, complaint or provider suppression.
6. Preserve MenuList and Answerlattice runtime separation.
7. Keep every provider-send path disabled until Resend onboarding and QA evidence are complete.
8. Perform zero tenant/store/workspace context reads during rendering and provider delivery.

## Non-Goals

- EmailOS is not a newsletter builder, campaign composer, CRM, helpdesk or marketing automation product.
- Resend Automations, Audiences and Broadcasts do not become workflow sources of truth.
- EmailOS does not create direct sending in CampaignCue.
- EmailOS does not activate SignalDesk outreach.
- EmailOS does not add runtime infrastructure to MyCodex or Neelvara.
- EmailOS does not guarantee inbox placement or treat opens/clicks as business truth.
- EmailOS does not automatically fail over to another provider after an ambiguous outcome.

## Product Policy

| Product code | Classification admitted | Provider state | Reputation boundary |
| --- | --- | --- | --- |
| `ML` | Transactional and operational | Ready but disabled | MenuList domain, key, webhook and suppression state |
| `AL` | Transactional and operational | Ready but disabled | Answerlattice domain, key, webhook and suppression state |
| `SD` | Approved marketing/outreach only | Disabled | Must use a separate Resend team and sending reputation |
| `CC` | Export preview only | Direct send rejected | No provider credentials |
| `MC` | None | Rejected | No provider account |

## Core Requirements

### Email envelope

Every send request contains:

- internal product code;
- event type and deterministic idempotency key;
- transactional, operational or marketing classification;
- one bounded recipient;
- bounded sender, reply-to and subject;
- HTML and plain-text content;
- bounded provider tags;
- an opaque local delivery reference that contains no email address or secret.

### Rendering

- React Email rendering runs server-side only.
- Every rendered message includes preview text, semantic content, a product identity and a calm footer.
- URLs are validated before rendering.
- Existing trusted template HTML may pass through the compatibility renderer only after bounded validation; plain text is always generated.
- Rendering performs no network or Firebase operation.

### Sending

- Resend is the only admitted production provider.
- A product send flag, API key and allowed sender domain are all required.
- Suppression is checked before a paid provider request.
- A deterministic provider idempotency key is supplied on every request.
- A durable local claim is created before the provider request because provider idempotency expires after 24 hours.
- One provider tag is reserved for the local delivery identity so an early webhook can resolve a queued delivery.
- The provider message ID is bounded and persisted without storing complete message content.
- Provider timeouts remain ambiguous; EmailOS does not attempt a second provider automatically.

### Webhooks

- Each active product has its own endpoint and webhook secret.
- Verification uses the untouched raw request body and the `svix-id`, `svix-timestamp` and `svix-signature` headers.
- Receipt identity is hashed and created once.
- Duplicate deliveries return success without repeating state changes.
- Out-of-order events cannot move a terminal delivery state backwards.
- Raw email HTML, API keys and webhook secrets are never logged or stored.

### Suppression

- Recipient identity is stored as `SHA-256(productCode:canonicalRecipient)`, not a plaintext address.
- Local permanent bounce, complaint and provider suppression state stops future sends for that product.
- A provider suppression removal can clear the provider-derived block, with an audit receipt.
- Resend's provider suppression list, reputation and quotas are team-wide. MenuList and Answerlattice accept that provider-level coupling while they share one team; their application suppression records remain product-scoped.
- SignalDesk never shares suppression or reputation with transactional products.

## Success Metrics

- 100% of admitted templates produce non-empty HTML and plain text.
- 100% of provider requests have a deterministic idempotency key.
- 100% of webhooks are signature verified and receipt deduplicated.
- Zero provider calls while a product send flag is off.
- Zero direct send capability in CampaignCue, MyCodex and Neelvara.
- Permanent bounces and complaints stop subsequent product sends.

## Industry Validation

- React Email supports server-side HTML rendering and plain-text conversion: https://react.email/docs/utilities/render
- Resend supports provider idempotency for API and SMTP: https://resend.com/docs/dashboard/emails/idempotency-keys
- Resend webhooks are at-least-once and may arrive out of order: https://resend.com/docs/webhooks/introduction
- Resend suppressions protect sender reputation after bounces and complaints: https://resend.com/docs/dashboard/emails/email-suppressions
- Resend recommends sending subdomains for reputation isolation: https://resend.com/docs/dashboard/domains/introduction

## Risks and Controls

| Risk | Control |
| --- | --- |
| Provider outage or timeout | Durable product claim; ambiguous state; no automatic cross-provider retry |
| Vendor lock-in | Provider-neutral envelope and React Email templates; Resend isolated behind an adapter |
| Duplicate webhook | Hashed `svix-id` receipt create-once boundary |
| Duplicate send after provider idempotency expiry | Durable deterministic local claim checked before every provider call |
| Webhook before provider response persistence | Reserved local-delivery provider tag plus provider-ID-hash fallback |
| Shared-team webhook fan-out | Reserved product tag plus a matching local delivery; wrong-product or unbound signed events return `200 ignored` with zero product writes |
| Out-of-order webhook | Monotonic state precedence and provider timestamp comparison |
| Domain reputation damage | Separate sending domains and keys; monitor the accepted MenuList/Answerlattice team-wide reputation boundary and split teams if volume, SLA or reputation risk requires it |
| Secret leakage | Secret Manager, server-only access and bounded metadata logs |
| Cross-product data leakage | Separate Firebase deployments, keys, webhook secrets and collections plus product-bound event reconciliation |
| Provider cost | Send-off defaults, per-product quotas and documented provider activation |

## Decisions Frozen

1. Resend is the production provider standard.
2. React Email is the rendering standard.
3. Product events and delivery claims remain product-owned.
4. CampaignCue remains export-only.
5. SignalDesk uses a separate reputation boundary if approved.
6. No automatic fallback provider is implemented.
7. Provider onboarding is a certification step after source implementation.
8. MenuList and Answerlattice share one Resend team at the current operating scale, but use separate domains, domain-scoped keys, webhook registrations/secrets, Firebase secrets and local state.
9. A separate MenuList or Answerlattice team becomes mandatory if measured volume, reputation, quota or SLA risk makes the accepted team-wide provider coupling unsafe.

## Doctrine Preservation Check

This decision creates a reusable cross-product rule: a shared provider account does not imply shared credentials, data or activation. MenuList and Answerlattice deliberately share provider-level reputation, suppression and quota behavior for now, while application state and credentials remain isolated. The rule is contained in this EmailOS specification and does not modify MenuList or Answerlattice core product doctrine.
