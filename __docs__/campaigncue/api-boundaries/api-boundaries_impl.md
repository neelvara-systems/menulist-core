# API Boundaries - Implementation

## Runtime Contract

CampaignCue API code should live under CampaignCue-scoped modules and route groups. Shared repo utilities can be reused, but product constants, collection paths, flags, webhook secrets, and provider adapters must remain product-scoped.

## API Families

| Family | Purpose |
| --- | --- |
| Internal app APIs | Campaign, generation, trust, export, schedule, analytics actions. |
| Provider adapters | Google, Meta, WhatsApp, generation, video, billing, and email/webhook providers. |
| Webhooks | Provider callbacks for publish status, replies, metrics, billing, and opt-out events. |
| Export APIs | Download/copy/share package creation. |
| Partner APIs | Future agency/client integrations, disabled unless explicitly enabled. |

Current runtime exposes only the internal app APIs listed below. Provider adapter routes, webhook endpoints, export file generation APIs, partner APIs, and billing/provider callbacks are architecture contracts and remain inactive until explicit provider setup exists.

## Required Patterns

- Zod validation at request boundaries.
- `withAuth` or product-equivalent auth wrapper for protected routes.
- Workspace membership and role checks before data access.
- Idempotency keys for mutations and provider callbacks.
- Secure logging with no tokens, secrets, or raw sensitive contact lists.
- SAFE_MODE and feature flags for expensive or provider-dependent operations.

## Endpoint Shape

Use product-scoped paths such as:

- `/api/campaigncue/campaigns/...`
- `/api/campaigncue/providers/...`
- `/api/campaigncue/webhooks/...`
- `/api/campaigncue/exports/...`

## Current Runtime Endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/campaigncue/workspace` | `GET` | Bootstrap/load workspace, Business Brain, cues, campaigns, assets, schedules, provider posture, and analytics summary. |
| `/api/campaigncue/workspace` | `PATCH` | Update CampaignCue Business Brain fields. |
| `/api/campaigncue/campaigns` | `GET` | Bounded campaign list through a direct workspace-only collection read. |
| `/api/campaigncue/campaigns` | `POST` | Create deterministic manual/export-first campaign pack with trust report and atomic idempotency key support. |
| `/api/campaigncue/campaigns/[campaignId]/actions` | `POST` | Record copy, download, export, schedule, approval, or manual-use action with atomic idempotency. Direct publish/send actions return manual fallback. |
| `/api/campaigncue/assets` | `GET` | Bounded asset metadata list through a direct workspace-only collection read. |
| `/api/campaigncue/assets` | `POST` | Register asset metadata, rights status, and usage refs. |
| `/api/campaigncue/analytics` | `GET` | Read one workspace doc, one dashboard summary doc, provider posture, and cost model. |
| `/api/campaigncue/sources` | `GET` | Bounded owner source input list through a direct workspace-only collection read. |
| `/api/campaigncue/sources` | `POST` | Save owner source input and refresh source snapshot. |
| `/api/campaigncue/integrations` | `GET` | Provider posture and setup request records through a direct workspace-only collection read. |
| `/api/campaigncue/integrations` | `POST` | Record provider setup request or manual-mode confirmation. |
| `/api/campaigncue/locations` | `GET` | Bounded location list through a direct workspace-only collection read. |
| `/api/campaigncue/locations` | `POST` | Add active/draft location record. |

All current runtime endpoints use `withAuth`, CampaignCue tenant/store scope guards, Zod validation on writes, rate limiting, and the dedicated `campaigncueFirestoreAdmin` boundary. Standalone list/analytics endpoints do not call the full workspace overview loader.

## Runtime Error Contract

Protected endpoints return safe owner/operator codes:

| Code | HTTP status | Meaning |
| --- | --- | --- |
| `Unauthorized` response from auth middleware | `401` | The user is not signed in. |
| `CampaignCue workspace requires an onboarded account` | `400` | The signed-in session does not carry tenant, store, or user scope. |
| `Forbidden` | `403` | The signed-in user failed tenant/store isolation checks. |
| `CAMPAIGNCUE_FIREBASE_UNAVAILABLE` | `503` | The dedicated CampaignCue Firebase project is missing, unreachable, or denied for the current environment. |
| `CAMPAIGNCUE_IDEMPOTENCY_CONFLICT` | `409` | A duplicate request is still running or the idempotency key was reused for another action/campaign. |
| `CAMPAIGNCUE_RUNTIME_ERROR` | `500` | Unexpected server failure after auth/scope validation. |

The workspace app must map `CAMPAIGNCUE_FIREBASE_UNAVAILABLE` to a setup-blocked state. Do not expose service-account details, private keys, raw provider tokens, or full Firebase error metadata to the browser.

## Acceptance

- Provider failure does not erase draft or approved campaign output.
- Provider and webhook paths remain disabled until signature validation and idempotency are implemented for that provider.
- API actions cannot read or write MenuList or Answerlattice product data.
