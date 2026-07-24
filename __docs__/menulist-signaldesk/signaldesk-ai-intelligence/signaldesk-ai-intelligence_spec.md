# SignalDesk AI Intelligence - Specification

**Status:** Local source complete
**Last Updated:** July 21, 2026

## Scope

AI Intelligence provides internal target scoring and bounded review assistance. It does not execute external action.

### Rules Score

`score-target` derives fit, current-list gap, contactability, risk, segment, reasons, confidence, and next action from the strict target projection and active evidence-use policy. Its deterministic document identity includes the relevant target/source facts and rules version. An unchanged request returns the same score without a provider call.

### AI Assist

`run-ai-assist` accepts one active target, one executable task, an optional instruction of at most 500 characters, and an idempotency key. Supported user tasks are `score`, `evidence`, `draft`, `reply-classification`, `approval-packet`, `weekly-strategist`, and `vendor-audit`. Only active Gemini routes execute.

### AI Volume Mode

`run-ai-volume-batch` accepts one to five unique eligible targets, one to three unique tasks from `score`, `evidence`, `draft`, and `reply-classification`, a founder cost ceiling from USD 0.01 to USD 5, an optional bounded instruction, and one idempotency key. Every child runs generation plus critic; bounded same-provider escalation is optional.

## Requirements

| ID | Requirement |
| --- | --- |
| SDAI-R001 | Source policy, retained target lineage, suppression, target state, evidence identity, model route, provider account, and provider budget must fail closed before paid work. |
| SDAI-R002 | Paid work must reserve budget and claim actor-bound idempotency before provider execution. |
| SDAI-R003 | Exact concurrent or transport retries must converge without duplicate provider calls or spend. Changed-input key reuse must conflict. |
| SDAI-R004 | Provider text must parse as JSON and pass a strict bounded schema before persistence. |
| SDAI-R005 | Prompt data must be minimized, bounded, treated as untrusted, and unable to override system instructions. |
| SDAI-R006 | Generation and critic output must be capped at 4,096 tokens. |
| SDAI-R007 | Rejected facts force low confidence. Missing or changed source authority prevents a usable result. |
| SDAI-R008 | Provider/critic failure and ambiguous settlement must become a durable unresolved outcome; exact retry must not repeat paid work. |
| SDAI-R009 | Source authority and claim ownership must be revalidated in the final transaction. |
| SDAI-R010 | AI Volume Mode must be founder-admin, desktop-only, feature-flagged, batch-rate-limited, cost-bounded, and protected by one expiring global volume lock. |
| SDAI-R011 | Volume recovery must reconstruct existing children and finalize interrupted parents without provider calls or releasing another parent's lock. |
| SDAI-R012 | Founder shadow review may replace a prior review without double counting. An exact replay must be write-free. |
| SDAI-R013 | Rules scores, provider assists, and volume parents must have separate bounded workspace lists. |
| SDAI-R014 | AI detail must expire after 90 days through the existing SignalDesk maintenance lifecycle. |
| SDAI-R015 | AI must never infer source rights, consent, or channel permission; approve/send messages; publish content; alter commercial authority; or write MenuList truth. |
| SDAI-R016 | Mobile may view projected summaries only. Every AI mutation remains blocked on mobile. |

## Eligibility

A provider-backed target is ineligible when it is held or rejected, has `nextAction: hold`, or has any non-clear suppression state. The server remains authoritative; desktop filtering only prevents predictable failed attempts.

## Output Contracts

Provider generation stores only schema-valid fields:

- `confidence`: `high | medium | low`;
- `nextAction`: `review | hold | evidence | draft`;
- up to eight reasons of 240 characters;
- up to eight rejected facts of 240 characters;
- optional suggested copy of 4,000 characters.

The critic stores a bounded verdict, confidence, reasons, rejected facts, and optional full revised output. No raw provider response or secret is stored.

## Out Of Scope

- autonomous outreach, approval, send, publish, or budget movement beyond the AI reservation;
- scheduled/background volume agents;
- OpenAI or Anthropic execution without a separately approved adapter;
- public SignalDesk AI surfaces;
- mobile AI mutation;
- a second AI cache or job collection;
- automatic graduation from shadow review.

## Acceptance

The feature is codebase-complete when source verifiers, the AI Firestore emulator, typecheck, focused lint, accounting/lineage tests, retention tests, docs links, and index validation pass. Hosted completion additionally requires QA index deployment and controlled Gemini/provider evidence.
