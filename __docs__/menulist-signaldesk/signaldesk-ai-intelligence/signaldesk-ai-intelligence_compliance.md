# SignalDesk AI Intelligence - Compliance Policy

**Status:** Implemented code contract; provider terms and live data-use certification pending
**Last Updated:** July 21, 2026

## Authority Rule

AI produces internal recommendations. Deterministic code and explicit human authority control source rights, retention, consent, suppression, channel eligibility, approval, send, publish, spend outside inference, and MenuList truth.

## Admission Controls

Before provider work, SignalDesk requires:

- authenticated SignalDesk access and action permission;
- desktop context for volume and founder review;
- active feature flag and no AI-worker kill switch;
- active, unsuppressed target with retained source lineage;
- active source policy permitting the task's evidence or draft use;
- exact evidence identity when evidence exists;
- active Gemini model route;
- configured, approved provider account and available per-run/daily/monthly budget;
- actor-bound idempotency and owned spend reservation.

## Prompt Controls

- Only the strict target projection and compact evidence summary are supplied.
- Raw contacts, source payloads, secrets, and unrelated histories are excluded.
- Target, evidence, operator instruction, prior output, and critic candidate are declared untrusted data.
- Embedded instructions cannot override the system contract.
- Generation and critic responses are JSON-only and capped at 4,096 output tokens.
- Safety filters cover dangerous content, harassment, hate speech, and sexual content.

## Output Controls

The provider response must parse and satisfy a strict Zod schema. Extra keys, oversized strings/arrays, invalid actions, malformed JSON, or missing required fields fail closed. Raw response text is not persisted. Runtime failure logs use bounded diagnostic context.

Any rejected fact forces low confidence. Critic `hold`/`revise`, low confidence, or rejected facts may trigger only a configured same-provider escalation; otherwise escalation is recorded as blocked and remains review work.

## Prohibited AI Authority

AI cannot:

- infer source ownership, consent, opt-in, or legal eligibility;
- treat a public contact value as permission;
- bypass suppression or retained-source expiry;
- invent menus, prices, hours, owner names, reviews, traffic, partnerships, outcomes, or commercial terms;
- approve or send outreach;
- publish content or alter MenuList business truth;
- activate a provider, route, budget, campaign, opportunity, or market pod;
- silently recover an ambiguous paid call by executing it again.

## Human Review

Provider-backed runs remain reviewable by a desktop founder-admin. Non-accepted decisions require a bounded reason. Review metrics are cumulative evidence, not automatic authority. No model route graduates or gains external-action permissions from acceptance rate alone.

## Retention and Data Use

Source-derived AI detail is scrubbed at 90 days by the consolidated SignalDesk maintenance scheduler. Provider terms, geographic processing, retention, training/data-use controls, credentials, and billing must be reviewed against the current Gemini service terms before live QA or production use. That external certification is not implied by source tests.

## Incident Behavior

- Changed source authority after provider latency: settle as unresolved/review-required; do not expose output.
- Provider or critic failure after reservation: mark the exact claim unresolved with stable evidence.
- Lost final acknowledgement after commit: replay the completed claim and deterministic run.
- Kill switch or budget failure: block before a provider call.
- Invalid model output: fail closed and do not create a usable result.
