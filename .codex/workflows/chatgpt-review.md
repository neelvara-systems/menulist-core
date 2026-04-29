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

6. **STAGE 5 — Single Output Document**:
   - Create ONE doc: `__docs__/[feature-name]/_archive/chatgpt-review.md`
   - Include: Executive Summary, Detailed Analysis, Architectural Concerns, Validated Recommendations, Rejected Suggestions, Prioritized Action Items
   - Follow single document rule — NO multi-doc chaos

7. **STAGE 6 — Doctrine Preservation Check** (MANDATORY):
   - After completing the review, ask: **"Does this conversation contain any guidance, philosophy, principles, mental models, or decision frameworks that should govern future MenuList development, growth, marketing, or communication?"**
   - If YES → Create a proper **constitution-level doctrine document** (`__docs__/constitution/XX-[topic]-doctrine.md`) — NOT just a review note. Format it like `01-core-doctrine.md`: locked, authoritative, with clear rules/principles.
   - Wire the new doctrine into: constitution `README.md` index, `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` reference table, and inline quick-reference if applicable.
   - Update `__docs__/changelog.md` with the new doctrine entry.
   - If NO doctrine-worthy content → explicitly state "No doctrine content found" in the review doc.

## Guardrails

- 3-YEAR FREEZE = ABSOLUTE LAW
- Codebase > ChatGPT (our code is truth)
- Cost analysis REQUIRED for architecture suggestions
- ONE comprehensive review doc only
