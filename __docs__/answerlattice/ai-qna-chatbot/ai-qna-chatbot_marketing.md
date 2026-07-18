# AI QnA Chatbot — Marketing & Sales Collateral

> **Version:** 1.1.0
> **Last Updated:** 2026-07-18
> **Audience:** Sales and marketing
> **Status:** Internal claim boundary

---

## Product Story

**One line:** Answerlattice serves approved support truth first, uses source-backed knowledge when needed, and refuses unsupported answers.

**Short explanation:** A SaaS team can use the same governed answer pipeline in its authenticated help center and embeddable support widget. Answerlattice checks canonical answers and approved FAQs before knowledge-base retrieval. For eligible technical questions, a default-off exact evidence lane can combine resolved product entities with error codes, API paths, versions, and command options without changing source authority.

## Claims We Can Support

- Approved canonical answers and published FAQs have priority over generated knowledge-base answers.
- Knowledge-base generation is restricted to active published content in the exact Answerlattice workspace.
- A generated non-refusal answer is blocked when it does not resolve to a valid supporting article.
- Exact-only evidence does not receive an invented vector-similarity score.
- Screenshots are treated as untrusted question context, not as an authority source.
- Unknown or weakly supported questions can return a safe fallback instead of a plausible guess.
- Answer Tests can exercise the retrieval pipeline without creating customer-facing search history.

## Claims That Require Measured Proof

Do not publish accuracy, deflection, containment, cache-hit, latency, cost-saving, or resolution percentages until they are measured with representative customer questions and verified outcomes. Do not compare current competitor pricing or capabilities without a dated primary-source review.

## Commercial Differentiation

| Generic support search | Answerlattice |
|---|---|
| Retrieves likely text | Checks governed answers before generated fallback |
| Treats sources as equally authoritative | Preserves canonical and approved FAQ priority |
| Reports answer volume | Evaluates citations, unsupported claims, abstention, and resolution |
| Hides weak retrieval behind fluent output | Blocks unsupported generated answers |
| Learns opaquely from conversations | Routes interaction evidence into human-reviewed improvement |

## Proof Metrics

- priority-question canonical coverage;
- citation correctness and completeness;
- unsupported-claim rate;
- stale-answer and source-conflict rate;
- safe-abstention and escalation correctness;
- verified task or support resolution;
- recontact after an answer;
- time from a knowledge change to reviewed answer propagation.

Cache use, request volume, tokens, and answer count are operating metrics, not customer-value claims.
