# SignalDesk AI Intelligence - Specification

**Status:** Implemented runtime specification
**Created:** June 23, 2026
**Last Updated:** July 11, 2026

## Executive Summary

AI Intelligence gives the growth team leverage by turning source/evidence context into typed scoring outputs:

- Is this target a MenuList fit?
- What current-list problem is visible?
- Which channel seems contactable?
- What is risky or blocked?
- What should a human review next?

The corrected review says AI should reduce team workload across scoring, detection, reply classification, and drafting, but should not own compliance or sending authority (`../../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:76`).

## Goals

| Goal | Success signal |
| --- | --- |
| Speed up review | Operator sees fit/gap/contactability scores and reasons. |
| Keep output structured | AI returns typed JSON, not freeform authority. |
| Prevent invented facts | AI cites evidence refs and rejected facts. |
| Reduce unsafe outreach | Risk and blocked-action outputs are explicit. |
| Control cost | AI only runs when evidence hash changes or cache expires. |
| Multiply founder capacity | One bounded run may prepare and critique multiple tasks across five targets. |
| Spend intelligence where useful | Cheap models handle routine work; approved stronger same-provider routes handle risky exceptions. |

## AI Scores

| Score | Meaning |
| --- | --- |
| Fit score | Does this target match MenuList's current-list market? |
| Current-list gap score | Is there evidence of stale/missing/scattered menu, service list, rate card, or package list? |
| Contactability score | Is there an approved contact/channel path? |
| Channel fit score | Which eligible channel is most practical? |
| Risk score | Source, compliance, claim, or reputation risk. |
| Outcome likelihood | Whether this can realistically reach upload/preview/publish/activation. |

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| SDAI-R001 | AI input must exclude blocked source fields. | P0 |
| SDAI-R002 | AI output must validate against schema. | P0 |
| SDAI-R003 | AI must include evidence refs for material claims. | P0 |
| SDAI-R004 | AI must include rejected facts and uncertainty. | P0 |
| SDAI-R005 | AI cannot produce final send approval. | P0 |
| SDAI-R006 | AI cannot infer consent or outreach eligibility. | P0 |
| SDAI-R007 | AI runs must be cached by evidence hash. | P0 |
| SDAI-R008 | AI workers need eval thresholds before automation. | P0 |
| SDAI-R009 | AI Volume Mode must be founder-triggered, feature-flagged, desktop-only, and limited to five targets and three tasks per request. | P0 |
| SDAI-R010 | Every volume child must run a generation pass and an independent critic pass. | P0 |
| SDAI-R011 | Escalation may run only when the critic holds/revises, confidence is low, or rejected facts exist, and only through an active same-provider model route. | P0 |
| SDAI-R012 | A founder-supplied maximum estimated cost must be validated before the first provider call and provider/budget controls must still pass for every child call. | P0 |
| SDAI-R013 | The parent volume run must record targets, tasks, child run IDs, completed/failed counts, model-call count, estimated cost, status, audit, and timeline without raw provider errors. | P0 |
| SDAI-R014 | Volume Mode may prepare recommendations but cannot create send approval, send, publish, spend outside its AI budget, change an opportunity, infer consent, or write MenuList truth. | P0 |
| SDAI-R015 | Rules scores, single-pass provider assists, volume batches, and reviewable provider outputs must remain distinguishable in the AI workspace. | P0 |
| SDAI-R016 | Every paid volume request must use a founder-scoped idempotency key so transport retries return the original parent batch without duplicate model calls. | P0 |
| SDAI-R017 | The batch must use batch rate limiting, preflight its aggregate daily/monthly provider budget, and prevent overlapping paid volume runs with an expiring recovery lock. | P0 |
| SDAI-R018 | A retry of an expired running parent must reconstruct bounded child evidence and transactionally finalize the parent as completed, partial, or blocked without repeating provider calls or releasing another batch's lock. | P0 |
| SDAI-R019 | Desktop must persist the bounded retry payload locally and reuse its idempotency key until terminal state, while allowing the founder to clear a retry when no parent was created. | P0 |

## Out Of Scope

- message final approval;
- legal eligibility decision;
- source-rights decision;
- WhatsApp opt-in decision;
- campaign optimizer that moves spend or channel authority;
- autonomous external next-best action;
- background or scheduled volume agents;
- OpenAI or Anthropic execution without an approved product-local adapter and credentials.

## Acceptance Criteria

- AI output cannot be stored if schema invalid.
- AI output cannot mark a blocked source as outreach-eligible.
- AI cannot draft unsupported claims.
- AI cannot approve a send.
- Operator can see why a score was produced.
- Founder can run one bounded volume batch and see complete, partial, or blocked status.
- Critic output, escalation state, call count, and estimated cost are attached to each reviewable provider run.
- Partial failure records stable failure codes and never loses successful child results.
- Mobile and non-founder attempts are blocked before provider work.
