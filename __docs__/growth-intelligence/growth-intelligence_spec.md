# Growth Intelligence Specification

**Status:** Approved  
**Last Updated:** July 10, 2026

## Outcomes

- Every public-surface acquisition link uses a fixed, non-tenant UTM contract.
- `/create-menu` preserves supported acquisition values through sign-in, draft creation, and claim.
- Founder Monitor shows bounded draft/claim counts by source.
- Desktop and mobile cancellation flows use the same stable reason codes.
- Founder Monitor shows cancellation counts by reason without exposing free text.

## Acquisition Contract

Allowed public-loop values:

| Field | Value |
| --- | --- |
| source | `menulist_public_surface` |
| medium | `powered_by` |
| campaign | `product_loop` |

Only allowlisted values are persisted. Store, tenant, menu, customer, referrer, and owner identifiers are not placed in acquisition URLs.

## Cancellation Reasons

- `no_longer_needed`
- `missing_functionality`
- `too_expensive`
- `switched_provider`
- `purchased_accidentally`
- `other`

`other` requires a bounded detail at the user interface. The detail may be stored on the subscription audit record, but it must not be copied into aggregate summaries, movement descriptions, diagnostics, or lifecycle messages.

## Non-Goals

- Cross-device identity or fingerprinting
- Automatic Google, Apple, Bing, Instagram, or WhatsApp verification
- Lead scoring
- Automated retention offers
- Bulk partner or owner outreach
