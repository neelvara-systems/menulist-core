---
description: Refactor an existing feature - deep codebase analysis, documentation refresh, and code cleanup. Use when revisiting a feature for improvements or when doing a comprehensive feature review.
---

# Existing Feature Refactoring

This workflow maps to `IDE_PROMPTS/8. EXISTING-FEATURE-REFACTORING.md` and `IDE_PROMPTS/7. CODE REFACTORING PATTERNS.md`.

## Prerequisites

1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
2. Read `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` for doc structure
3. Read `IDE_PROMPTS/7. CODE REFACTORING PATTERNS.md` for refactoring patterns

## Execution Steps

### Phase 1: Deep Codebase Exploration

1. **Systematic codebase scan** — explore ALL related files:
   - Frontend components (every nested/imported file)
   - Backend API routes
   - Types and interfaces
   - Services and utilities
   - Database layer (DAL functions)
   - Cloud functions (if applicable)

2. **End-to-end flow tracing** — trace the FULL cycle:
   - Frontend trigger → Backend route → Database operation → Response handling → UI display
   - Document every step with exact file:line references

3. **Check existing docs** at `__docs__/[feature-name]/`:
   - What exists? What's missing? What's outdated?
   - Codebase is PRIMARY source of truth, not existing docs

### Phase 2: Fresh Documentation (from scratch)

4. **Remove outdated docs** (archive to `_archive/`, never delete)
5. **Create fresh docs** following `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md`:
   - `[feature-name]_spec.md` — business requirements from code reality
   - `[feature-name]_impl.md` — technical blueprint from actual implementation
   - `[feature-name]_marketing.md` — sales materials from proven capabilities
   - `README.md` — navigation hub

### Phase 3: Code Refactoring (per Pattern Guide)

6. **Redundancy check** (Pattern 1):
   - Same entity described in multiple files? → Consolidate
   - Adding new item requires 2+ file updates? → Single source of truth

7. **Type extension** (Pattern 2):
   - Lookup tables that map to existing types? → Extend the type instead
   - Separate "info" objects? → Add fields to primary type

8. **Icon string mapping** (Pattern 3):
   - React elements in data layer? → String names + ICON_MAP in component

9. **Constants consolidation** (Pattern 4):
   - Small files (1-3 exports) → Merge with related files
   - Feature-scoped constants → Co-locate with their types

### Phase 4: Mobile Verification (MANDATORY — Law 11)

10. **Check `_mobile-support.md` exists** — if missing, create it with Feature Admission Test results
11. **If feature is mobile-relevant**: verify mobile component uses same DAL functions as desktop
12. **Mobile data format audit**: compare mobile screen logic line-by-line against desktop counterpart
    - Field names must match Firestore schema exactly
    - DAL return shapes (e.g., `result.items` not `result.feedbacks`) must match
    - Status values, date formats, day keys must be identical to desktop
13. **If mobile component is outdated or missing**: build/update it in this same session

### Phase 5: Improvements & Web Research

14. **Suggestions section** in `_impl.md`:
    - What's broken or needs improvement?
    - What would make this more usable/scalable?
    - Web search for context-specific improvements (must align with doctrine)
    - Performance improvement opportunities

// turbo 15. **Type check**: Run `npx tsc --noEmit`

16. **Cross-check**: Every doc claim links to code evidence. 100% match required.

## Guardrails

- Codebase = primary source of truth
- Do not rush — line by line, word by word, end to end
- Include ALL imported/nested files in analysis
- Follow doc naming convention (kebab-case folder, prefix must match)
- 3-YEAR FREEZE: Document current state as production-complete
- MOBILE IS CORE: If feature passes 4-gate test, mobile UI is mandatory (Law 11)
- MOBILE DATA FORMAT: Mobile screens MUST write identical field names/formats as desktop
