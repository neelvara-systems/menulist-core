# MenuList SignalDesk - Apify Source Broker

**Status:** Implemented behind source policy, provider approval, env readiness, and budget caps
**Created:** June 23, 2026
**Scope:** Internal Apify discovery/evidence connector for SignalDesk target sourcing.

## Decision

Apify is useful for early lead discovery because many solo-founder workflows use Apify Actors to collect local-business candidates before AI scoring and manual review. SignalDesk should support that pattern, but only as a controlled source broker.

Apify must not become:

- a scrape-and-send path;
- a raw provider payload store;
- a cold WhatsApp/public-phone source;
- an arbitrary Actor runner from the browser;
- a replacement for source policy, evidence review, suppression, or owner approval.

## Official API Basis

The implementation uses the current Apify API pattern:

- Run an Actor synchronously and receive dataset items from `POST /v2/actors/:actorId/run-sync-get-dataset-items`.
- Authenticate with the `Authorization` header instead of a token in the URL.
- Use run limits such as `maxItems`, `limit`, and `maxTotalChargeUsd` for spend and returned-row control.
- Keep webhooks idempotent and authenticated with a secret token/header.

Sources:

- [Apify run Actor synchronously and get dataset items](https://docs.apify.com/api/v2/act-run-sync-get-dataset-items-post)
- [Apify API basic usage](https://docs.apify.com/api/v2)
- [Apify webhook actions](https://docs.apify.com/platform/integrations/webhooks/actions)

## Runtime Shape

| Area | Implementation |
| --- | --- |
| Provider ID | `apify` |
| Feature flag | `ENABLE_MENULIST_SIGNALDESK_APIFY_SOURCE_BROKER` |
| Env keys | `MENULIST_SIGNALDESK_APIFY_API_TOKEN`, `MENULIST_SIGNALDESK_APIFY_SOURCE_ACTOR_ID`, `MENULIST_SIGNALDESK_APIFY_WEBHOOK_SECRET` |
| Source action | Existing `run-source-provider` action with provider `apify` |
| Connector setting | `apify` connector kind in `/signaldesk/settings` |
| Provider account | `signaldeskProviderAccounts` row for provider `apify`, use `discovery` |
| Budget policy | `signaldeskBudgetPolicies` provider cap for `apify` |
| Webhook | `/api/signaldesk/webhooks/apify`, normalized event/status only |
| Dataset storage | No raw Apify payload stored in Firestore |

The configured source Actor must accept the compact local-business input shape SignalDesk sends: `searchStringsArray`, `locationQuery`, and `maxCrawledPlacesPerSearch`. Use either an Apify Actor ID or the `owner~actor-name` API form in `MENULIST_SIGNALDESK_APIFY_SOURCE_ACTOR_ID`; if an operator copies an Apify store-style `owner/actor-name` value, the server normalizes it to `owner~actor-name` before calling Apify. If a different Actor schema is chosen, add a server-side adapter before using it; do not expose arbitrary Actor input fields in the browser.

## Guardrails

1. The browser cannot provide an arbitrary Actor ID.
2. The Actor ID must come from `MENULIST_SIGNALDESK_APIFY_SOURCE_ACTOR_ID`.
3. Runs require an active provider source policy.
4. Runs require evidence use to be allowed by that policy.
5. Contact fields returned by Apify are stripped unless the source policy explicitly allows contact use.
6. Each run is capped at 1-30 rows.
7. Each run is checked against provider account and budget policies before the external call.
8. Spend is recorded only after a successful provider run/import.
9. Webhooks store event type, run ID, payload hash, source health, and status only.
10. Provider send remains disabled unless the separate sender/channel gates are satisfied.

## Normalized Fields

Apify dataset rows are normalized into the same target import row shape used by manual and Google Places imports:

| SignalDesk field | Possible Apify input fields |
| --- | --- |
| `displayName` | `title`, `name`, `businessName`, `companyName`, `placeName` |
| `category` | `category`, `categoryName`, `mainCategory`, `categories` |
| `city` | `city`, `cityName`, `address.city` |
| `country` | `country`, `countryCode`, `address.country` |
| `website` | `website`, `websiteUrl`, `site`, `homepage` |
| `currentListUrl` | `googleMapsUrl`, `googleMapsUri`, `googleUrl`, `placeUrl`, `url` |
| `phone` | `phone`, `phoneNumber`, `phoneUnformatted`, `contactPhone`, `phones[0]` |
| `email` | `email`, `contactEmail`, `emails[0]` |
| `instagram` | `instagram`, `instagramUrl`, `socials.instagram` |

Phone, email, and Instagram values still pass through source-policy contact-use enforcement before SignalDesk stores identity docs.

## Owner Workflow

1. Configure Apify secrets and the approved source Actor in env or Secret Manager.
2. Save an Apify connector record in `/signaldesk/settings` to check readiness.
3. Create or select a `provider` source policy with evidence use enabled.
4. Approve the Apify discovery provider account only after the policy and budget are acceptable.
5. Run a small capped source query from `/signaldesk/sources`.
6. Review imported targets, score, create evidence, draft, and approve through normal SignalDesk flow.

## Boundaries

- No public SignalDesk surface.
- No MenuList owner/customer route.
- No MenuList `stores`, `projects`, billing, publish, menu, or public output write.
- No raw Apify dataset payload in Firestore.
- No paid campaign automation.
- No provider send enablement.
- No Firebase deploy in this implementation slice.
