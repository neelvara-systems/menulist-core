---
description: Document an existing feature that has no docs. Reverse-engineers from codebase to create spec/impl/marketing/website/helpdoc docs. Use when a feature exists in code but lacks documentation.
---

# Retro Documentation (Existing Feature)

This workflow maps to `IDE_PROMPTS/0. FEATURE RETRO DOCUMENTATION PROMPT.md` — used when a feature exists in code but has no documentation.

## Prerequisites

1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
2. Read `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` for doc structure rules
3. Read `IDE_PROMPTS/10. CONTENT LAYERS PROMPT.md` for website, helpdoc, changelog templates
4. Codebase is PRIMARY source of truth — not existing scattered docs

## Execution Steps

1. **STAGE 0 — Codebase Truth Extraction** (PRIMARY):
   - Search codebase for ALL feature traces: components, hooks, APIs, DB calls, flags
   - Map current flows, edge cases, behaviors
   - Create a truth extract table:
     | File | LOC | Purpose | Current Behavior |
   - Go through EVERY imported file end-to-end
   - Trace the full cycle: Frontend trigger → Backend route → Database → Response → UI display

2. **STAGE 1 — Comprehensive Discovery**:
   - Code (`@codebase` search for feature keywords)
   - Existing docs (`__docs__/` scan for related content)
   - Memories and rules
   - DB collections and APIs
   - Feature flags (`src/config/features.ts`)

3. **STAGE 2 — Spec from Code**:
   - Create `__docs__/[feature-name]/[feature-name]_spec.md` (non-tech)
   - Executive Summary: what CODE delivers now
   - User Flows: EXACT current paths (no ideals)
   - Requirements: what EXISTS (code-verified)
   - Every claim links to code evidence

4. **STAGE 3 — Impl from Code**:
   - Create `__docs__/[feature-name]/[feature-name]_impl.md` (technical)
   - Architecture: current code structure
   - DB Schema: actual collections/fields
   - File Inventory: exact files/LOC
   - APIs: current endpoints with security audit
   - Include a "Suggestions/Improvements" section for things found during analysis

5. **STAGE 4 — Marketing from Reality**:
   - Create `__docs__/[feature-name]/[feature-name]_marketing.md`
   - Pitch proven capabilities only
   - Follow Language Governance (no forbidden phrases)

6. **STAGE 5 — Website Content from Reality**:
   - Create `__docs__/[feature-name]/[feature-name]_website.md` (PUBLIC)
   - Hero section: outcome-focused headline based on what the feature ACTUALLY does
   - Problem/solution: real customer pain this feature solves
   - Feature benefits: proven capabilities only (3-5 blocks)
   - How it works: actual user flow (3 steps max)
   - Social proof slots, FAQ based on real usage patterns
   - SEO meta: title, description, OG tags, keywords
   - MUST follow Language Governance — no "AI-powered", "Smart", "Dynamic"

7. **STAGE 6 — Firebase Cost Tracking from Reality** (CRITICAL):
   - Create `__docs__/[feature-name]/[feature-name]_firebase.md`
   - Trace EVERY DAL function in `src/database/` for this feature
   - Document ALL Firestore reads: collection, trigger, frequency, docs read
   - Document ALL Firestore writes: collection, trigger, frequency, merge/set
   - Document ALL deletes: soft (deleted: true) vs hard, frequency
   - Trace API routes to their Firebase operations
   - List Storage operations with path patterns
   - List Cloud Functions if applicable
   - Calculate cost estimate per 1000 active users/month
   - Flag expensive patterns (loops, unbounded queries, large docs)
   - Link every operation to exact DAL function (file:line)

8. **STAGE 7 — Help Documentation from Reality**:
   - Create `__docs__/[feature-name]/[feature-name]_helpdoc.md` (PUBLIC)
   - Quick summary of what the feature does
   - Getting started: actual prerequisites and setup steps
   - How-to guides: real tasks users perform (step-by-step, numbered)
   - Troubleshooting: known issues, common mistakes, fixes
   - Tips from codebase analysis (edge cases, best practices)
   - Written for non-tech Indian SMB owners — zero jargon
   - Mark screenshot slots for each major step

9. **STAGE 8 — Alignment Verification**:
   - Every doc claim must link to code evidence
   - 100% match required or STOP and flag
   - Create README.md for the feature folder
   - Verify website and helpdoc language follows constitution

10. **STAGE 8B — Mobile Support Doc from Reality** (MANDATORY — Law 11):
    - Create `__docs__/[feature-name]/[feature-name]_mobile-support.md`
    - Run Feature Admission Test (4 gates) based on what the feature ACTUALLY does
    - If mobile-relevant: document which mobile screens exist, which DAL functions they use
    - If no mobile component exists but gates pass: flag as MISSING — build in this session
    - Verify mobile data formats match desktop (field names, value formats, DAL return shapes)

## Guardrails

- CODE SUPREMACY: Codebase = truth, docs serve code
- ZERO INVENTION: Every claim traceably verified
- REALITY ONLY: Document what EXISTS, not ideals
- 3-YEAR FREEZE: Current = production complete
- FULL DOC SET: spec + impl + marketing + website + helpdoc + firebase + mobile-support (all from code reality)
- FIREBASE TRACKING: Every read/write/delete MUST be documented — directly impacts revenue
- LANGUAGE GOVERNANCE: Website and helpdoc MUST follow constitution language rules
- MOBILE IS CORE: Every feature gets a \_mobile-support.md — mobile UI is mandatory if gates pass (Law 11)
- Include nested/imported files in analysis
