---
description: Organize and clean up __docs__/ folder structure. Consolidate related docs, fix naming, move orphaned files. Use when documentation gets scattered or after bulk doc creation.
---

# Documentation Organization & Cleanup

This workflow maps to `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` cleanup checklist.

## Prerequisites

1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
2. Read `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` for structure rules
3. Read `__docs__/README.md` for current folder map

## Execution Steps

### Phase 1: Audit Current State

1. **Git status scan**: Run `git status --short __docs__/` to find all changed/new docs
2. **Root-level scan**: List all `.md` files at `__docs__/` root — identify orphans
3. **Folder naming check**: All folders must be kebab-case
4. **File naming check**: All files must be `[folder-name]_[type].md` (prefix matches folder)

### Phase 2: Classify & Move

5. **For each orphaned/misplaced doc**:
   - Read the first 50 lines to understand its content
   - Determine which feature folder it belongs to
   - If it's a review/audit/historical doc → move to `[feature]/_archive/`
   - If it's a spec/impl/marketing doc → move to correct feature folder
   - Use `git mv` for committed files to preserve history

6. **Duplicate folder resolution**:
   - Check for underscore vs hyphen duplicates (e.g., `system_strengthening` vs `system-strengthening`)
   - Canonical name = kebab-case (hyphen)
   - Move old files to `_archive/` in the canonical folder

7. **Consolidate related docs**:
   - Multiple docs about the same feature/functionality → single feature folder
   - Review/audit docs → `_archive/` subfolder
   - Session logs, ChatGPT reviews → `_archive/`

### Phase 3: Update Indexes

8. **Update feature README.md files** that were affected by moves
9. **Update `__docs__/README.md`** folder map if new folders were created or structure changed
10. **Verify cross-references** in moved documents still point to correct locations

### Phase 4: Verification

11. **Root-level check**: Only `README.md`, `changelog.md`, `index.md`, and `maintenance-tasks.md` should remain at root
12. **Naming convention check**: Every folder/file follows kebab-case + prefix rules
13. **Archive check**: Every feature folder with historical docs has `_archive/` subfolder
14. **No content loss**: Verify nothing was deleted — only moved/archived

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
        [feature-name]_website.md, [feature-name]_helpdoc.md, [feature-name]_firebase.md
Archive: _archive/ subfolder for historical files
README: Required in every feature folder
```

## Guardrails

- NEVER delete docs — always archive
- Use `git mv` for committed files (preserves history)
- Every move must be traceable
- Update all affected README.md files after moves
