---
description: Rebuild cluttered feature docs from codebase truth. Use after many Cascade sessions, ChatGPT reviews, and audit phases leave a feature's documentation scattered, redundant, or chaotic. Goes back to code as single source of truth and rewrites docs clean.
---

# Feature Documentation Rebuild (Post-Development Cleanup)

This workflow is for features where docs exist but have become **cluttered after many development sessions, ChatGPT feedback rounds, and audit/validation phases**. It goes back to the codebase as the single source of truth and produces clean, consolidated documentation.

**Key difference from other doc workflows:**
- `/retro-doc` → Feature has NO docs. Creates from scratch.
- `/doc-organize` → Folder-level cleanup (naming, moves, orphans). Surface-level.
- `/refactor-feature` → Code refactoring + docs. Changes code.
- **`/doc-rebuild`** → Feature has MANY docs (too many). Consolidates into clean canonical set. **Docs only — no code changes** (unless bugs found during review).

Maps to: `IDE_PROMPTS/0. FEATURE RETRO DOCUMENTATION PROMPT.md` (codebase truth extraction) + `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` (structure rules) + `IDE_PROMPTS/10. CONTENT LAYERS PROMPT.md` (website, helpdoc, firebase, changelog templates)

## Prerequisites

1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
2. Read `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` for structure rules + naming convention
3. Read `IDE_PROMPTS/10. CONTENT LAYERS PROMPT.md` for website, helpdoc, firebase templates
4. Read `__docs__/README.md` for current folder map
5. Read `__docs__/index.md` for master index
6. Read the target feature's `README.md` to understand current doc state

## Execution Steps

### Phase 1: Full Inventory & Codebase Truth Extraction

1. **List ALL files** in `__docs__/[feature-name]/` recursively (including `_archive/`).
   Create an inventory table:
   ```
   | # | File | Size | Doc Type | Last Updated | Status |
   ```

2. **Read EVERY doc file** (first 30-50 lines minimum) to understand its content and purpose.
   Classify each file into one of:
   - **CANONICAL** → Core doc (`_spec`, `_impl`, `_marketing`, `_firebase`, `_website`, `_helpdoc`, `_test-cases`, `_verification`)
   - **SUB-FEATURE** → Belongs to a sub-feature that warrants its own subfolder
   - **ONE-TIME** → Audit, review, ChatGPT session, validation report → archive candidate
   - **REDUNDANT** → Content already covered in a canonical doc → archive candidate
   - **MISPLACED** → Content belongs in another feature folder (e.g., permissions, billing)

3. **Codebase truth extraction** — scan the actual code for this feature:
   - Search for ALL related files: components, hooks, APIs, DAL functions, types, feature flags
   - Trace key flows: Frontend → API → Database → Response → UI
   - Note any discrepancies between docs and code
   - Check `src/config/features.ts` for all feature flags related to this feature
   - Check related permission constants, types, and enforcement points

4. **Identify sub-features** that are large enough (3+ docs or 50KB+) to warrant their own subfolder.
   Sub-feature folder naming: `[sub-feature-name]/` inside the parent feature folder.

### Phase 2: Classification Decision Matrix

5. **Present the classification** to the user (or proceed if user said "just do it"):

   ```
   | File | Size | Classification | Action |
   |------|------|---------------|--------|
   | multi-outlet-consistency_spec.md | 28KB | CANONICAL | KEEP |
   | store-onboarding-flow_impl.md | 83KB | SUB-FEATURE | MOVE to subfolder |
   | architecture-audit.md | 35KB | ONE-TIME | ARCHIVE |
   | master-updates-verification.md | 30KB | REDUNDANT | ARCHIVE (merge key info) |
   ```

   Rules for classification:
   - `_spec.md` and `_impl.md` are ALWAYS canonical — they stay and get updated
   - ChatGPT review files → ALWAYS archive
   - Architecture audits → ALWAYS archive (findings should be in canonical docs)
   - Standalone verification reports for sub-features → archive (merge into main `_verification.md`)
   - Session logs → ALWAYS archive
   - Feedback audits → ALWAYS archive

### Phase 3: Create Sub-Feature Folders (if applicable)

6. **For each identified sub-feature:**
   - Create subfolder: `__docs__/[feature-name]/[sub-feature-name]/`
   - Move related files into subfolder with correct naming:
     - `[sub-feature-name]_spec.md`
     - `[sub-feature-name]_impl.md`
     - Additional companion docs (e.g., `[sub-feature-name]-billing_impl.md`)
   - Create `README.md` in subfolder with:
     - Quick Navigation table
     - One-liner + purpose
     - Key codebase files table
     - Feature flags table
     - Link back to parent: `**Parent Documentation:** [Feature Name](../README.md)`
   - Use `git mv` for committed files (preserves history), `mv` for untracked

### Phase 4: Archive Historical Files

7. **Move classified archive candidates** to `_archive/` subfolder:
   - Use `git mv` or `mv` as appropriate
   - NEVER delete — always archive
   - Before archiving, check if the file contains unique information not in canonical docs
   - If unique info exists → extract and merge into the appropriate canonical doc FIRST, then archive

### Phase 5: Update Canonical Docs from Codebase Truth

8. **Update each canonical doc** against the codebase truth extracted in Phase 1:

   **For `_spec.md`:**
   - Verify all user stories match actual implemented behavior
   - Update scope (in-scope/out-of-scope) based on what code actually does
   - Add any sub-features discovered during codebase scan
   - Ensure feature flag references are current

   **For `_impl.md`:**
   - Verify all file paths still exist and are correct
   - Update DB schema if Firestore structure changed
   - Update API contracts if routes were modified
   - Add new functions/hooks discovered during scan
   - Update security checklist with current enforcement points

   **For `_firebase.md`:**
   - Verify all read/write/delete operations match current DAL code
   - Add any new operations from sub-features
   - Update cost estimates if new collections/operations were added

   **For `_marketing.md`, `_website.md`, `_helpdoc.md`:**
   - Verify claims match current code behavior
   - Update if new capabilities were added
   - Ensure Language Governance compliance (no forbidden phrases)

   **For `_verification.md` (if exists):**
   - Merge key findings from archived sub-feature verifications
   - Update bug table with any bugs found/fixed
   - Update version history

### Phase 6: Update Feature README.md

9. **Rewrite the feature `README.md`** to reflect new structure:
   - Quick Navigation table with ALL doc types (including new sub-features)
   - Sub-Features table linking to subfolders
   - Related Docs table (cross-references to other feature folders)
   - Key Files in Codebase (organized by sub-feature if applicable)
   - Feature Flags table (ALL flags, not just the main one)
   - Archive table (updated with newly archived files)
   - Quick Reference: Core Functions table
   - Version History (add new entry for this rebuild)
   - Update dates and version number

### Phase 7: Cross-Reference Related Feature Docs

10. **Update docs in OTHER feature folders** that are affected:
    - If permissions were added → update `roles-permissions/roles-permissions_impl.md`
    - If chain permissions changed → update `multi-chain-permissions/multi-chain-permissions_impl.md`
    - If store management changed → update `stores-management/stores-management_impl.md`
    - If billing changed → update `razorpay/` docs
    - Add cross-reference links in the Related Documentation section of affected docs

### Phase 8: Update Master Indexes

11. **Update `__docs__/index.md`:**
    - Add/update entries for sub-features (use `↳` prefix for sub-entries)
    - Update doc type availability columns (✅/➖/❌)
    - Update last updated date

12. **Update `__docs__/README.md`:**
    - Update folder map entry for this feature
    - Update Key Docs column to show subfolders
    - Update dates and version

13. **Update `__docs__/changelog.md`** if docs reveal any unreported changes:
    - New features/capabilities not yet in changelog → add
    - Bug fixes not yet documented → add

### Phase 9: Verification

14. **Content loss check:**
    - Compare file count: before vs after (archived files still exist, just moved)
    - Verify no unique information was lost during archiving
    - Spot-check 2-3 archived files to confirm key info exists in canonical docs

15. **Naming convention check:**
    - All folders: kebab-case
    - All files: `[feature-name]_[doc-type].md` pattern
    - Feature prefix matches folder name
    - README.md is only uppercase exception
    - All lowercase (no UPPERCASE files)

16. **Structure check:**
    - Every feature folder has README.md
    - Every subfolder has README.md
    - `_archive/` subfolder exists for folders with historical files
    - Root `__docs__/` has only: README.md, changelog.md, index.md, maintenance-tasks.md

// turbo
17. **Type check:** Run `npx tsc --noEmit` to ensure no code issues

18. **Findings report:** Present to user:
    - Summary of what was done (files moved/archived/created/updated)
    - Final folder structure tree
    - Any bugs or issues discovered during codebase scan
    - Suggestions for improvement (stale docs in other folders, missing content, future work)

## Naming Convention Reference (MANDATORY — 3-YEAR FREEZE RULE)

```
ALL file names MUST follow these rules with ZERO exceptions:

1. ALL LOWERCASE — no uppercase letters ever
2. WORDS SEPARATED BY HYPHENS (-) — no spaces, no underscores in names
3. SINGLE UNDERSCORE (_) separates feature-name from doc-type ONLY
4. Feature prefix MUST match folder name exactly
5. Standalone files (no doc-type): all-lowercase-kebab-case.md
6. README.md is the ONLY exception (universal convention)

Pattern: {feature-name}_{doc-type}.md

Folder: __docs__/[feature-name]/ (kebab-case)
Files:  [feature-name]_spec.md, [feature-name]_impl.md, [feature-name]_marketing.md,
        [feature-name]_website.md, [feature-name]_helpdoc.md, [feature-name]_firebase.md,
        [feature-name]_test-cases.md, [feature-name]_verification.md
Sub-feature: [feature-name]/[sub-feature-name]/ with own README + docs
Archive: _archive/ subfolder for historical files
README: Required in every feature folder AND subfolder
```

## Canonical Doc Types (7 + README)

| Doc Type | Audience | Purpose | Required? |
|----------|----------|---------|-----------|
| `_spec.md` | CEO / PM | Business requirements, user flows, scope | YES |
| `_impl.md` | Developers | Technical blueprint, DB schema, API contracts, file paths | YES |
| `_marketing.md` | Sales / Marketing | Pitch deck, messaging, approved language | YES |
| `_firebase.md` | DevOps / Cost control | Every Firestore read/write/delete, cost estimates | YES |
| `_website.md` | Public | Landing page content, SEO, hero section | YES |
| `_helpdoc.md` | Customers | Self-service help article, zero jargon | YES |
| `_test-cases.md` | QA | Test scenarios, edge cases, QA matrix | If applicable |
| `_verification.md` | Internal | Implementation verification, bugs found/fixed | If applicable |

## Guardrails

- **CODEBASE = PRIMARY SOURCE OF TRUTH** — docs serve code, not the other way around
- **NEVER delete docs** — always archive to `_archive/`
- **Use `git mv`** for committed files (preserves history)
- **ZERO content loss** — extract unique info before archiving
- **Every claim must link to code evidence** — no invented capabilities
- **3-YEAR FREEZE** — document current state as production-complete
- **Language Governance** — website and helpdoc MUST follow constitution rules
- **Firebase tracking** — every read/write/delete MUST be documented
- **Update ALL affected indexes** — feature README, __docs__/README.md, __docs__/index.md
- **Cross-reference related folders** — permissions, billing, stores docs must be updated if affected
- **Report findings** — bugs, suggestions, stale content discovered during the process
