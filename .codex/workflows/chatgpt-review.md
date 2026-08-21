---
description: Cross-check a ChatGPT conversation against our codebase. Use when you have a ChatGPT conversation with feature ideas or suggestions to validate.
---

# ChatGPT Conversation Critical Review

This workflow maps to `IDE_PROMPTS/1. CHATGPT-CONVERSATION-REVIEW.md` (Step 1 of the feature pipeline).

## Prerequisites

1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` — these rules OVERRIDE everything
2. Read `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md`

## Execution Steps

1. **Load context**: Read `IDE_PROMPTS/1. CHATGPT-CONVERSATION-REVIEW.md` for the full review protocol

2. **STAGE 1 — Conversation Analysis**: Create a breakdown table:
   - For each ChatGPT suggestion: topic, their idea, confidence level, MenuListAI existing reality
   - Identify key themes with expert assessment vs codebase

3. **STAGE 2 — Grounded Cross-Reference**: Line-by-line reality check
   - For each point: find the actual code implementation (`@codebase` search)
   - Check against existing `__docs__/` specs
   - Verdict per point: AGREE / DISAGREE / PARTIAL with technical justification
   - Check `.windsurfrules` compliance
   - Check 3-year architecture freeze compliance

4. **STAGE 3 — Market Validation**: If business/market claims are made, do web research to validate

5. **STAGE 4 — Decision Matrix**: Create architect decisions table:
   | ChatGPT Idea | Status | Decision | Justification | Action |
   - Every rejection MUST have explicit reasoning with code evidence
   - Every acceptance MUST link to existing codebase pattern
   - For every proposed feature or transferred product mechanic, apply the
     behavior-to-permanence filter before assigning an action:
     1. What exact owner, staff, customer, or operator behavior should change?
     2. What causal mechanic is proposed, separate from the visible feature or metaphor?
     3. What repo evidence shows the behavior is currently important and insufficiently served?
     4. What is the smallest reversible test, with a measurable success threshold and kill condition?
     5. What permanent surface area would remain: UI, state, permissions, data model, jobs, analytics, docs, support, and cost?
     6. What proprietary state or compounding asset would a successful test create?
   - Allowed outcomes are `ADOPT`, `TEST`, `WATCH`, `IGNORE`, and `DO NOT BUILD`.
     A report that prevents an unnecessary feature is a successful review.
   - Cross-product semantics may be compared after the same mechanic is proven
     independently in at least two products, but shared implementation still
     requires an explicit product-boundary and tenancy decision. Do not infer
     permission to build a shared workflow, collection, service, or UI from a
     metaphor such as pull requests, stories, feeds, marketplaces, or graphs.

6. **STAGE 5 — Single Output Document**:
   - Create ONE doc: `__docs__/[feature-name]/_archive/[topic]-chatgpt-review-YYYY-MM-DD.md`
   - Include: Executive Summary, Detailed Analysis, Behavior/Mechanic/Complexity Assessment, Architectural Concerns, Validated Recommendations, Rejected Suggestions, Prioritized Action Items
   - Follow single document rule — NO multi-doc chaos

7. **STAGE 6 — Doctrine Preservation Check** (MANDATORY):
   - After completing the review, ask: **"Does this conversation contain any guidance, philosophy, principles, mental models, or decision frameworks that should govern future MenuList development, growth, marketing, or communication?"**
   - A useful idea is not automatically doctrine. Before creating a doctrine,
     prove that the principle is new, durable, cross-feature or cross-product,
     not already enforced by existing constitutions/rules/workflows, and specific
     enough to change future accept/reject decisions.
   - If the idea improves only the external-review method, update this workflow
     and its canonical IDE prompt instead of creating a new constitution document.
   - If the strict admission test passes → Create a proper **constitution-level doctrine document** (`__docs__/constitution/XX-[topic]-doctrine.md`) — NOT just a review note. Format it like `01-core-doctrine.md`: locked, authoritative, with clear rules/principles.
   - Wire the new doctrine into: constitution `README.md` index, `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` reference table, and inline quick-reference if applicable.
   - Update `__docs__/changelog.md` with the new doctrine entry.
   - If NO doctrine-worthy content → explicitly state "No new doctrine required"
     and identify the existing rule/workflow that already governs the idea.

## Guardrails

- 3-YEAR FREEZE = ABSOLUTE LAW
- Codebase > ChatGPT (our code is truth)
- Cost analysis REQUIRED for architecture suggestions
- ONE comprehensive review doc only
- External mechanics are hypotheses, not implementation authority
- No generic data model, shared platform, or permanent product surface without
  repo evidence, a bounded test, and an explicit complexity budget
