# GitHub Change Intake - Implementation

> **Status:** Local source complete; hosted QA pending
> **Last Updated:** 2026-08-11

## Runtime Boundaries

The implementation is provider-specific. It does not add a generic connector abstraction.

### Server contracts

- `src/lib/answerlattice/githubChangeIntakeContracts.ts`
  - setup-state signing and verification;
  - strict connection, repository, event, and webhook schemas;
  - deterministic job/source identity;
  - event admission and bounded evidence rendering.
- `src/lib/answerlattice/githubChangeIntakeServer.ts`
  - GitHub App JWT and temporary installation token calls;
  - installation ownership verification;
  - integration-config and repository-binding writes;
  - webhook claim, replay, daily-cap, source import, and disconnect lifecycle.
- `src/app/api/answerlattice/knowledge-intake/github/*`
  - authenticated connect, setup, callback, and connection management.
- `src/app/api/answerlattice/webhooks/github/route.ts`
  - public signed-webhook boundary.

### Owner surface

- `GitHubChangeIntakeCard` is mounted in Teach Answerlattice.
- It shows connection status, pending repository selection, event policy, last accepted change, reconnect, and disconnect.
- Existing intake jobs, source governance, analysis, drafts, and publication controls are reused.

## Setup Sequence

```text
Connect GitHub
-> signed install state
-> GitHub App installation
-> setup callback verifies state and session
-> GitHub user authorization
-> callback verifies installation ownership
-> temporary installation token lists repositories
-> pending installation and repository selection saved without replacing an active connection
-> owner confirms selected repositories and event policy
-> repository bindings become active
```

The setup callback must never accept `installation_id` as proof of ownership.

## GitHub App Registration Contract

- Setup URL: `<Answerlattice origin>/api/answerlattice/knowledge-intake/github/setup`
- User authorization callback: `<Answerlattice origin>/api/answerlattice/knowledge-intake/github/callback`
- Webhook URL: `<Answerlattice origin>/api/answerlattice/webhooks/github`
- Repository permissions: Metadata read, Contents read, Pull requests read.
- Event subscriptions: Release, Pull request, Installation, Installation repositories.
- No account or write permission.

The origin must be the canonical deployment target for the active stage. The state and webhook secrets must be distinct and at least 32 characters. Every provider JSON response is byte-bounded before parsing. Pull-request paths come from a GraphQL query that selects only `path`; do not replace it with the REST files endpoint because that response includes patch text.

## Webhook Sequence

```text
bounded raw body
-> HMAC verification
-> event/header schema validation
-> signed-provider rate limit
-> repository binding lookup
-> active subscription check
-> workspace policy and replay claim
-> optional bounded PR-file metadata fetch
-> deterministic Knowledge Intake job/source
-> connection status update
```

If provider or database work fails after a claim, the delivery is marked failed and may be retried after the bounded processing lease expires. Ignored, duplicate, unselected, and capped events return a successful acknowledgement so GitHub does not create a retry storm.

## Existing-System Wiring

- `createKnowledgeIntakeJob` / deterministic ensure helper owns job creation and compact summary counters.
- One compact month/slot pointer starts intake at the current rolling job, avoiding an increasing scan of earlier full jobs.
- `addKnowledgeSource` owns redaction, source identity, source limits, job counters, and summary counters.
- `analyzeKnowledgeIntakeJob` remains the only model-backed interpretation step.
- Source Governance decides whether GitHub evidence can support an approved answer.
- Release-to-Truth and Answer Tests determine affected truth and verification work.
- Daily Brief consumes the existing compact Knowledge Intake summary; no new owner queue is created.
- The outbound GitHub issue adapter is unchanged.

## Failure States

- `not_configured`: required server credentials are missing.
- `disconnected`: no active installation.
- `pending_repository_selection`: ownership verified; owner confirmation required.
- `connected`: selected repository bindings are active.
- `needs_reconnect`: installation access changed or verification failed.
- `suspended`: GitHub suspended the installation.

`needs_reconnect` and `suspended` are fail-closed. Saving old policy settings cannot reactivate routing; the owner must complete a fresh signed setup and confirm the newly verified repository list. Pending setup remains disconnectable.

No failure automatically deletes historical sources or approved truth.
