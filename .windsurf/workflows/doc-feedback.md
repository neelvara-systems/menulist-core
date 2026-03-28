---
description: Process ChatGPT feedback on documentation. Use after sending docs to ChatGPT for review and receiving feedback. Docs-only mode - no code changes.
---

# Documentation Feedback Processing

This workflow maps to `IDE_PROMPTS/3. VALIDATION FEEDBACK PROMPT.md` (Step 3 of the feature pipeline).

## Prerequisites
1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
2. Feature docs must already exist in `__docs__/[feature-name]/`

## Execution Steps

1. **Load protocol**: Read `IDE_PROMPTS/3. VALIDATION FEEDBACK PROMPT.md`

2. **STAGE 1 — Feedback Audit**: Create `__docs__/[feature-name]/_archive/doc-feedback-audit.md`:
   | # | ChatGPT Comment | Valid? | Code/Doc Evidence | Action | Target Doc |
   - For each point: check against actual codebase (`@codebase` search)
   - Valid = matches code reality → Update doc
   - Invalid = contradicts code/docs → Reject
   - Vague = spec gap → Flag for human review

3. **STAGE 2 — Doc Updates (TEXT ONLY)**:
   - ONLY update `_spec.md`, `_impl.md`, `_marketing.md` for VALID items
   - NEVER add unimplemented features
   - NEVER promise future behavior
   - NEVER change code files
   - NEVER add "Phase 2" language

4. **STAGE 3 — Alignment Verification**:
   - Append to `_validation.md`: Doc ↔ Code alignment table post-feedback
   - Every updated section must link to code evidence
   - Confirm 100% alignment or flag gaps

## Guardrails
- DOCS ONLY MODE — zero code file changes
- Codebase = truth — docs must match implementation
- ChatGPT feedback = suggestion, NOT authority
- `git diff` should show ONLY doc changes
