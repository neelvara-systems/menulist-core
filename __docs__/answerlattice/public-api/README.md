# Answerlattice Public API v1

> **Status:** Implemented, locally audited, and disabled by default
> **Version:** 1.1.0
> **Last Updated:** 2026-07-20
> **Feature Flag:** `ENABLE_ANSWERLATTICE_PUBLIC_API` (`false`)
> **Owner Permission:** `MANAGE_INTEGRATIONS`

## Purpose

The Public API is a secondary, server-to-server distribution surface for governed Answerlattice truth. It lets an approved external service:

- retrieve an applicable approved canonical answer;
- read stable public entity identifiers; and
- submit bounded support-friction signals for human-governed review.

It does not expose draft knowledge, raw evidence, tickets, audit records, private sources, arbitrary search, account actions, or canonical-answer mutation.

## Product Boundary

The API distributes governed answers; it is not Answerlattice's primary product or acquisition wedge. The widget, Help Center, support-agent workflow, and future external agents may consume the same approved truth, but the canonical-answer lifecycle remains upstream.

The Public API is:

- canonical-first and RAG-free;
- tenant/workspace scoped from the credential, never request-supplied IDs;
- server-side only;
- explicit about abstention and clarification;
- disabled until a named customer workflow passes rollout gates.

## Endpoints

| Endpoint | Method | Required scope | Behavior |
| --- | --- | --- | --- |
| `/api/answerlattice/public/v1/answers` | `POST` | `public:read` | Returns an approved applicable canonical answer, citations, clarification, or deterministic fallback reason. |
| `/api/answerlattice/public/v1/entities` | `GET` | `public:read` | Returns active/beta public entity records from a compiled bundle or bounded Firestore fallback. |
| `/api/answerlattice/public/v1/signals` | `POST` | `signals:write` | Accepts allowlisted support signals as evidence; never changes approved truth directly. |

## Credential Lifecycle

Authorized owners manage one active `al_*` key from `/answerlattice/public-api` when the feature flag is enabled.

1. Select `public:read`, `signals:write`, or the rollout-gated `mcp:read` scope needed by the MCP session exchange.
2. Create or rotate the key.
3. Store the raw key immediately; it is returned once.
4. Answerlattice persists only the SHA-256 hash, bounded prefix, creation time, exact product/purpose, and scopes.
5. Rotation replaces the previous key immediately; revocation removes it immediately.
6. Rotation and revocation append credential-summary audit records without raw keys or hashes.

Public API authentication deliberately disables positive credential caching so rotation and revocation do not have a stale acceptance window.
Dedicated and shared Firestore rules also prevent browser clients from creating, changing, or deleting Public API and widget credentials.
`mcp:read` does not broaden `public:read`: it is a separate explicit scope because MCP tools can return private compiled approved context. MCP remains disabled by default and its five-minute session tokens have their own activation and revocation-window contract.

## Safety Contract

All endpoints:

- require an `al_*` credential with `productId: "AL"`, `purpose: "answerlattice_public_api"`, and explicit valid scopes;
- reject widget, MenuList, malformed, legacy-unscoped, inactive-workspace, and revoked credentials;
- apply fail-closed IP admission before key lookup and per-key/endpoint rate limiting before retrieval or writes;
- reject browser-origin requests and return private/no-store or bounded private-cache headers;
- return fixed public errors without raw stack traces;
- expose no tenant/store identifiers in normal response bodies.

## Answer Contract

The answers route validates bounded query, version, plan, role, state, and optional safe context. It calls canonical retrieval only. A miss returns `canonical: false`, a bounded `fallbackReason`, normalized citations, and optional clarification. It does not silently generate a plausible answer.

Internal evidence IDs, drift reasons, audit history, knowledge-graph expansion and interaction rules, and production debug traces are excluded. Citations show support, but do not by themselves prove correctness; approval, applicability, freshness, and evaluation remain separate controls.

The entity registry includes `truncated`. When it is `true`, the bounded bundle or Firestore fallback did not prove the filtered registry is complete. Public API v1 does not provide cursor pagination; consumers must narrow the query or treat the result as partial.

## Signal Contract

Public signal types are limited to `ticket`, `chat_negative`, `escalation`, `feedback`, and `guided_resolution`. Widget-owned predictive interaction events are excluded.

Each request requires a valid idempotency key through `externalId` or `Idempotency-Key`. Exact retries are deduplicated. Reusing a key with different content returns `409 IDEMPOTENCY_REPLAY_CONFLICT`. Reserved metadata such as source, user, request, actor, and idempotency fields is replaced by server-owned values.

## Rollout Gate

Keep the feature flag off until one target tenant has:

- sufficient approved canonical coverage for the intended questions;
- a reviewed evaluation set and no critical deployment blockers;
- a named server-side consumer and credential owner;
- configured fail-closed rate limiting;
- a rotation/revocation drill;
- reviewed data handling and signal metadata;
- monitored usefulness, abstention, correction, and cost metrics.

## Documents

| Document | Purpose |
| --- | --- |
| [public-api_spec.md](./public-api_spec.md) | Product and acceptance contract |
| [public-api_impl.md](./public-api_impl.md) | Runtime architecture and file map |
| [public-api_firebase.md](./public-api_firebase.md) | Data, cost, retention, and failure behavior |
| [public-api_helpdoc.md](./public-api_helpdoc.md) | Owner setup and troubleshooting |
| [public-api_marketing.md](./public-api_marketing.md) | Accurate sales/positioning boundaries |
| [public-api_website.md](./public-api_website.md) | Public-site claim rules |
| [public-api_mobile-support.md](./public-api_mobile-support.md) | Mobile/responsive assessment |
| [public-api_test-cases.md](./public-api_test-cases.md) | Source, emulator, hosted, and customer evidence matrix |

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-07-20 | 1.1.0 | Added exact credential contracts, owner key lifecycle, audit-safe rotation/revocation, server-only admission, immediate invalidation, public entity/signal restrictions, stable ETags, replay-conflict handling, strict UI responses, full docs, and focused tests. |
| 2026-06-16 | 1.0.1 | Suppressed internal production debug traces and added explicit signal idempotency. |
| 2026-05-16 | 1.0.0 | Added rollout-gated answers, entities, and signal ingestion routes. |
