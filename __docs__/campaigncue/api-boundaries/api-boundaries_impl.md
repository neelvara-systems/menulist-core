# API Boundaries - Implementation

## Runtime Contract

CampaignCue API code should live under CampaignCue-scoped modules and route groups. Shared repo utilities can be reused, but product constants, collection paths, flags, webhook secrets, and provider adapters must remain product-scoped.

## API Families

| Family | Purpose |
| --- | --- |
| Internal app APIs | Campaign, generation, trust, export/download, schedule, analytics actions. |
| Provider adapters | Separate future layer for Google, Meta, WhatsApp, generation, video, billing, and email/webhook providers. Meta Ads MCP is recorded as a disabled read-first adapter candidate; no MCP client or provider call is active. |
| Webhooks | Provider callbacks for publish status, replies, metrics, billing, and opt-out events. |
| Export APIs | Download/export package creation. |
| Partner APIs | Future agency/client integrations, disabled unless explicitly enabled. |

Current runtime exposes only the internal app APIs listed below. Provider adapter routes, webhook endpoints, partner APIs, social account connection, and billing/provider callbacks are architecture contracts and remain inactive until a separate provider-posting layer is explicitly built.

## Required Patterns

- Zod validation at request boundaries.
- Malformed JSON body handling before Zod validation for every body-reading route.
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
| `/api/campaigncue/workspace` | `GET` | Bootstrap/load workspace, Business Brain, source facts, cues, campaigns, assets, schedules, launch readiness, provider posture, and analytics summary. |
| `/api/campaigncue/workspace` | `PATCH` | Update CampaignCue Business Brain fields. |
| `/api/campaigncue/campaigns` | `GET` | Bounded campaign list through a direct workspace-only collection read. |
| `/api/campaigncue/campaigns` | `POST` | Create deterministic structured export/download-first campaign pack with trust report, cue evidence, bounded source context, and atomic idempotency key support. |
| `/api/campaigncue/campaigns/[campaignId]/actions` | `POST` | Record download, pack export, schedule, approval, manual-use, or owner-reported outcome action with atomic idempotency. Direct publish/send actions are not part of the accepted schema. |
| `/api/campaigncue/assets` | `GET` | Bounded asset metadata list through a direct workspace-only collection read. |
| `/api/campaigncue/assets` | `POST` | Strictly register asset metadata, rights, deduplicated tags, optional workspace Storage identity, and server-verified campaign usage refs; external/download URLs are not accepted. |
| `/api/campaigncue/analytics` | `GET` | Read one workspace doc, one dashboard summary doc, provider posture, and cost model. |
| `/api/campaigncue/sources` | `GET` | Bounded owner source input list through a direct workspace-only collection read. |
| `/api/campaigncue/sources` | `POST` | Save owner source input with optional expiry, derive source facts, and refresh source snapshot. |
| `/api/campaigncue/integrations` | `GET` | Read-only future provider posture. The active runtime does not read provider connection records, call Meta Ads MCP, import provider metrics, or write setup requests. |
| `/api/campaigncue/locations` | `GET` | Bounded location list through a direct workspace-only collection read. |
| `/api/campaigncue/locations` | `POST` | Add active/draft location record. |
| `/api/campaigncue/video-projects` | `GET` | Read one bounded list of admitted source-linked video projects. |
| `/api/campaigncue/video-projects` | `POST` | Create, version-save, approve/reject, or record one local render receipt with strict action validation and idempotency. No media bytes or provider payload are accepted. |

All current runtime endpoints use the CampaignCue `withAuth` wrapper, exact agreeing numeric session aliases, current shared-store tenant/active-state verification, exact CampaignCue product/workspace membership, Zod validation on writes, fail-closed shared rate limiting, and the dedicated `campaigncueFirestoreAdmin` boundary. The wrapper applies private/no-store/nosniff response policy to auth, CORS, scope, validation, rate, success, and failure branches; limiter infrastructure outage returns 503 without quota metadata, while actual exhaustion returns 429. Every campaign, campaign-action, Video Studio, and CueLayers upload/autosave/repair/export mutation requires a bounded idempotency key. Standalone list/analytics endpoints do not call the full workspace overview loader, but they still revalidate shared-store and CampaignCue membership before product data access. Persisted campaign, source-input, source-snapshot, location, schedule, analytics-summary, asset, trust-report, video-project, workspace, Business Brain and CueLayers records are runtime-admitted before owner or mutation use.

## Runtime Error Contract

Protected endpoints return safe owner/operator codes:

| Code | HTTP status | Meaning |
| --- | --- | --- |
| `Unauthorized` response from auth middleware | `401` | The user is not signed in. |
| `CampaignCue workspace requires an onboarded account` | `400` | The signed-in session does not carry tenant, store, or user scope. |
| `Forbidden` | `403` | The signed-in user failed tenant/store isolation checks. |
| `Invalid JSON` | `400` | The request body could not be parsed as JSON. Body-reading routes return this before schema validation and before any Firestore write path. |
| `CAMPAIGNCUE_FIREBASE_UNAVAILABLE` | `503` | The dedicated CampaignCue Firebase project is missing, unreachable, or denied for the current environment. |
| `CAMPAIGNCUE_IDEMPOTENCY_CONFLICT` | `409` | A duplicate request is still running or the idempotency key was reused for another action/campaign. |
| `CAMPAIGNCUE_RUNTIME_ERROR` | `500` | Unexpected server failure after auth/scope validation. |

The workspace app must map `CAMPAIGNCUE_FIREBASE_UNAVAILABLE` to a setup-blocked state. Do not expose service-account details, private keys, raw provider tokens, or full Firebase error metadata to the browser. Runtime setup-blocker detection uses structured Firebase/Admin error indicators such as code, status, reason, domain, and service; it must not parse raw provider exception text. API route diagnostics use `logCampaignCueServerError()` so caught exceptions are recorded as fixed failure-code errors with source name/code/status metadata and bounded identifier presence/length context instead of raw exception capture.

Security events from the shared CampaignCue API guard use bounded route/session metadata. Tenant violations, rate-limit rejections, malformed JSON, and Design Cue validation failures log endpoint/method/scope/error presence-length fields instead of raw `buildSecurityContext()` output or raw validation messages.

Browser callers must not treat HTTP success or a parsed object as acknowledgement by itself. The CampaignCue workspace app parses route responses through a 4 MB bounded reader and requires the documented `{ data }` envelope for workspace load, CueLayers boot/save/upload/repair/export, campaign create/action, business details, source input, location, asset registration, asset download, and editor-export flows before mutating local state. Parse, rejection, and invalid-shape failures log fixed CampaignCue workspace diagnostics and keep fixed product copy.

For campaign create/action and CueLayers mutations, the browser binds one idempotency key to the exact request fingerprint and retires it only after an authoritative bounded response. A lost, truncated, or unparseable response therefore retries the same server claim rather than creating a second effect. Campaign creation also rereads the exact bounded workspace, Business Brain, source, asset, location, schedule, campaign-memory and analytics authority inside its final transaction; any concurrent change completes the retry record with a safe `409` and commits no campaign/trust/event/summary effect.

## Acceptance

- Export/download actions do not depend on provider availability.
- Provider and webhook paths remain disabled until signature validation, idempotency, credentials, consent, quota, and fallback controls are implemented for that provider.
- API actions cannot read or write MenuList or Answerlattice product data.
