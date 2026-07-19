# Weekly Digest Specification

## Customer Job

Show a solo founder or support lead what repeated support friction appeared in the latest settled week, while clearly separating recorded evidence from incomplete comparisons and from authoritative support truth.

## Inputs

The weekly summary may use only strict, exact-scope daily Answerlattice chat-analytics documents for:

- total conversations;
- total messages;
- recorded positive and total feedback;
- bounded repeated questions;
- bounded knowledge gaps;
- explicit daily source-completeness evidence.

Raw ticket, conversation, customer, billing, and private knowledge bodies are not browser inputs.

## Output

One workspace-scoped weekly document contains:

- exact `weekStart` and `weekEnd`, seven inclusive UTC days;
- deterministic narrative;
- bounded highlights and recommendations;
- conversation-volume comparison;
- recorded-feedback comparison;
- top repeated question;
- current and previous source-day counts;
- current-week and comparison completeness;
- deterministic generation mode;
- generated timestamp and source hash.

## Admission Rules

1. Product identity is `AL`.
2. Tenant and store match the active Answerlattice session.
3. The week contains exactly seven dates.
4. `generationMode` is exactly `deterministic`.
5. Text, arrays, metrics, and timestamp pass the shared strict parser.
6. Legacy deterministic rows without completeness evidence may render only as incomplete.
7. A timestamp more than five minutes in the future is invalid.
8. A digest older than the current completed-week allowance is stale.

## Permissions

- View route and Firestore document: `canViewReadiness`.
- Manually prepare the latest settled week: `canManageSupport`.
- Suggested routes: each route's own current permission.
- Export: only the already-admitted browser projection; it grants no extra data access.

## Required States

- loading;
- current and complete;
- current but partial;
- stale;
- invalid future timestamp;
- missing;
- malformed;
- prepare in progress;
- no source data;
- permission-limited actions;
- fixed local load/prepare/export failure.

## Acceptance Criteria

- No comparison value is shown or exported unless both weeks are complete.
- Recorded feedback is never labelled customer satisfaction.
- A long repeated question wraps without shifting the card grid.
- Manual preparation is deterministic, rate-limited, exact-scope, and hash-idempotent.
- The scheduled writer rejects malformed daily source rows.
- An incomplete current source day blocks scheduled weekly publication.
- The digest remains advisory and never changes approved truth.

