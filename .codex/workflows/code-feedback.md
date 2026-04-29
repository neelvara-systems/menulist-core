---
description: Process ChatGPT feedback on implemented code. Use after sending code to ChatGPT for review and receiving suggestions. Validates feedback against spec/impl before applying.
---

# Post-Implementation Code Feedback

This workflow maps to `IDE_PROMPTS/5. AFTER IMPLEMENTATION FEEDBACK PROMPT.md` (Step 5 of the feature pipeline).

## Prerequisites
1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
2. Feature must be implemented with `_validation.md` already passing
3. Read `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md`

## Execution Steps

1. **Load protocol**: Read `IDE_PROMPTS/5. AFTER IMPLEMENTATION FEEDBACK PROMPT.md`

2. **STAGE 1 — Feedback Audit**: Create `__docs__/[feature-name]/_archive/code-feedback-audit.md`:
   | ChatGPT Point | Status | Spec Reference | Action | Code Changes |
   - For each point, classify:
     - VALID → Aligns with spec/impl (cite spec line) → Implement
     - INVALID → Contradicts spec/impl → Reject with reasoning
     - IMPROVE → Enhances within 3-year freeze constraints → Implement
     - CLARIFY → Spec gap → Flag for human review

3. **STAGE 2 — Code Corrections**:
   - ONLY implement VALID items from audit
   - NO new features or scope creep
   - All backend changes must follow security rules (withAuth, Zod, secureLog)
   - Maintain validation.md 100% pass rate

4. **STAGE 3 — Re-validation**:
   - Update `_validation.md` with post-feedback changes table
   - Every change must show spec alignment
   - Final status: READY or NEEDS REVIEW

// turbo
5. **Type check**: Run `npx tsc --noEmit`

## Guardrails
- Spec/impl docs > ChatGPT feedback (spec sovereignty)
- 3-YEAR FREEZE: No "later" fixes — all complete now
- ZERO CREEP: No new requirements or scope
- VALIDATION: 100% checklist pass after changes
