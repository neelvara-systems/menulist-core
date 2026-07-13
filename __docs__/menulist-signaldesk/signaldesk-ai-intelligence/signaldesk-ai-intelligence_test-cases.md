# SignalDesk AI Intelligence - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026
**Last Updated:** July 11, 2026

## Output Validation Tests

| Test | Expected |
| --- | --- |
| AI returns invalid schema | Blocked and review item created. |
| AI omits evidence refs | Blocked or low-confidence review. |
| AI uses blocked source field | Blocked. |
| AI recommends send approval | Blocked. |
| AI marks consent as present without proof | Blocked. |
| AI run is accepted unchanged | Review evidence and cumulative acceptance rate update once. |
| AI run is marked edited without a reason | Blocked. |
| AI run is re-reviewed | Previous decision count and minute contribution are reversed before replacement. |
| Rules-only score is submitted for shadow review | Blocked. |
| Non-founder submits shadow review | Blocked. |
| Volume child critic passes | Child completes with two calls and no escalation. |
| Volume child critic revises or holds | Approved Gemini escalation runs and child records three calls. |
| Escalation provider is not executable | Child remains review-required and records escalation blocked without calling another provider. |
| Batch exceeds five targets, three tasks, or founder cost cap | Blocked before provider calls. |
| Direct server caller supplies a short idempotency key or invalid bound | Blocked before provider calls. |
| Another non-expired volume run holds the global lock | Overlapping batch is blocked before provider calls; an expired lock can be recovered. |
| Expired running parent has some completed children | Retry reconstructs child IDs/calls/cost, records one recovery audit/timeline, and finalizes as partial without provider calls. |
| Expired running parent has no completed children | Retry finalizes as blocked with `ai_volume_run_interrupted`. |
| Recovered parent is retried again | Existing terminal parent returns without another recovery write. |
| Old parent recovery sees a lock owned by a newer batch | Parent is recovered but the newer lock is not released or changed. |
| Desktop request fails or returns running | Bounded payload and key remain locally available for `Retry Batch`; scope controls remain locked. |
| Desktop receives terminal batch result | Local retry payload clears automatically. |
| Founder clears a retry after a pre-parent validation/configuration block | Local retry payload clears without server mutation. |
| One child provider call fails | Successful children remain; parent becomes partial with stable failure code. |
| All children fail | Parent becomes blocked. |
| Non-founder or mobile starts volume mode | Blocked before provider work. |
| AI-worker kill switch is active | Volume batch blocked. |
| Final output retains any rejected fact | Confidence is forced low and founder review remains required. |
| Volume result attempts send/publish/opportunity/MenuList mutation | No corresponding record or truth write exists. |

## Scoring Tests

| Test | Expected |
| --- | --- |
| Strong restaurant menu gap | High current-list gap score with evidence. |
| Salon service-list target | Fit accepted, not restaurant-only. |
| No evidence of list problem | Low current-list gap or hold. |
| Source policy blocked | Risk high and action held. |
| Suppressed contact | Contactability blocked. |

## Cost Tests

| Test | Expected |
| --- | --- |
| Same evidence hash reruns immediately | Cache hit. |
| List page triggers AI for every row | Fails. |
| Worker runs without budget cap | Blocked. |
| Prompt includes full conversation history unnecessarily | Fails. |
| Volume projected cost exceeds founder maximum | Blocked before the first call. |
| Volume projected cost exceeds remaining provider daily/monthly budget | Blocked before the parent or first call. |
| Critic/escalation calls complete | Every call contributes to provider/budget and daily AI estimates. |

## Compliance Tests

| Test | Expected |
| --- | --- |
| AI invents discount | Blocked. |
| AI claims official WhatsApp partnership | Blocked. |
| AI recommends Google Maps scraping as truth | Blocked. |
| AI recommends cold WhatsApp from public phone | Blocked. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile runs AI scoring | Not available. |
| Mobile approves AI output | Not available. |
| Mobile records AI shadow review | Not available and server-blocked. |
| Mobile pauses AI worker | Allowed with audit. |
