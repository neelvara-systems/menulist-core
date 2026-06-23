# SignalDesk Target Registry - Compliance Policy

**Status:** Initial planning doc
**Created:** June 23, 2026

## Core Rule

A target record is an internal candidate, not permission to contact.

## PII Rules

- Mask email and phone in list views.
- Reveal raw contact only after role check and audit.
- Store identity hashes for dedupe and suppression lookup.
- Do not export contact values from the registry directly.
- Do not put raw contact values into AI prompts by default.

## Source Provenance Rules

Every target must link to:

- source type;
- source owner;
- import/run ID;
- allowed fields;
- retention class;
- outreach eligibility;
- expiry/review date.

## Blocked Transitions

| Condition | Block |
| --- | --- |
| No source candidate | Cannot move to `ready`. |
| Suppression exists | Cannot draft, export, send, or follow up. |
| Source policy unclear | Target stays `held`. |
| Duplicate unresolved | Target stays `held`. |
| Raw restricted provider content | Cannot use in public artifact or outbound message. |

## Operator Rules

- Never copy raw contact values into notes unless required.
- Never mark target ready because a public phone exists.
- Never infer consent from source availability.
- Always mark wrong-contact and DNC immediately.

## Open Questions

| Question | Owner |
| --- | --- |
| Exact contact retention period | Founder + compliance review |
| Contractor contact reveal policy | Founder |
| First approved import source | Founder |
