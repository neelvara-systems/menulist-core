# API Boundaries - Spec

## Summary

API Boundaries defines where CampaignCue exposes or consumes APIs: provider adapters, channel publishing, webhooks, imports, exports, agency/client integrations, analytics ingestion, and internal product APIs.

## Goals

- Keep CampaignCue integrations explicit and versioned.
- Prevent provider-specific code from leaking into product workflows.
- Support manual export as a first-class fallback.
- Make webhooks, retries, idempotency, and rate limits non-optional.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Adapter boundary | Google, Meta, WhatsApp, generation, video, and billing providers sit behind adapters. |
| Versioning | Public or partner-facing API contracts include versioned paths or schema versions. |
| Auth | API calls require workspace-scoped auth and role checks. |
| Webhooks | Webhooks validate signatures, map to known workspace/provider records, and write idempotently. |
| Rate limits | Expensive, public, and provider-facing operations are rate-limited. |
| Manual fallback | API failure or unsupported action preserves download/export workflow. |

## Provider Posture Matrix

| Provider/channel | Default CampaignCue mode | Direct mode requirement |
| --- | --- | --- |
| WhatsApp | Draft, download/export, template planning, consent record. | Opt-in, template, pricing, preference webhook, quality/rate posture, provider credentials, role approval. |
| Google Business Profile | Google-ready post/offer/event/media pack with manual steps. | Approved GBP API access, location eligibility, OAuth, quota, post type support, trust clear. |
| Instagram/Facebook organic | Export and owner/agency scheduling handoff. | Eligible business/creator account, app review/scopes, publishing limits, media constraints, trust clear. |
| Meta/Google ads | Ad pack export and agency/platform handoff. | Ad account connection, policy status, spend approval, budget confirmation, mutate idempotency. |
| TikTok/YouTube video | Export-ready video/brief package. | App/API approval, domain/media rules, quota/cost posture, creator/account authorization. |
| Email/SMS | Out of default scope. | Separate consent, opt-out, sender identity, jurisdiction, suppression-list, and compliance architecture. |
| MenuList | Read-only source snapshot. | Any write-back requires explicit MenuList-owned API and owner-approved audit trail. |

## Non-Goals

- It is not an open public API by default.
- It does not expose MenuList or Answerlattice data contracts.
- It does not promise every third-party tool will have a direct integration.

## Risks

- Provider APIs change and can invalidate assumptions.
- Webhook replay or spoofing can corrupt campaign status.
- Partner APIs can create support burden if versioning is weak.
