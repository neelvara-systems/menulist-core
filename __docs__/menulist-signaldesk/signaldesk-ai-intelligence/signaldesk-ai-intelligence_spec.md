# SignalDesk AI Intelligence - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026

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

## Out Of Scope

- message final approval;
- legal eligibility decision;
- source-rights decision;
- WhatsApp opt-in decision;
- campaign optimizer;
- autonomous next-best action.

## Acceptance Criteria

- AI output cannot be stored if schema invalid.
- AI output cannot mark a blocked source as outreach-eligible.
- AI cannot draft unsupported claims.
- AI cannot approve a send.
- Operator can see why a score was produced.
