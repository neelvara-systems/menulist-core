> **⚠️ DEPRECATED — February 21, 2026**
> All unique content from this file has been merged into `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md`:
>
> - Review tasks → STEP 7 (Session Lifecycle, Phases 1-8)
> - Refactoring steps → STEP 7 Phase 6 (UI Audit) + IDE_PROMPTS/7. CODE REFACTORING PATTERNS.md
> - UI best practices → STEP 6 Perspective 2 (UI Design Rules)
> - Knowledge preservation → STEP 7 Phase 7
>
> **Use the Master Prompt instead.** This file is kept for historical reference only.

---

## Comprehensive Review Tasks

1. Deep codebase review line by line.

2. Cross check cascade chat messages with codebase - check if everything is covered.

3. Cross check codebase with docs - is everything implemented documented?, treating codebase as primary source.

4. Cross check docs with codebase - is everything documented implemented?, treating docs as primary source.

5. Cross check against IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md.

6. Check consistency with the overall project.

7. Log everything to verification.md.

8. Add scope for improvement section (Log any scope for improvement).

9. Report anything that needs discussion at the end.

10. Fix any bugs/issues found.

11. Update the documentation accordingly if needed or which is present in codebase but not in docs.

12. Go through each UI component file and provide honest feedback on what works and what needs improvement.

13. Cross check once again for user-friendliness and ease of use.

14. Search the web for improvements in the context of our project.

15. Check for performance improvements considering the doctrine.

16. Reviewing all related files including frontend, backend, cloud functions.

17. Document everything including decision rationale (why certain decisions were made).

18. Gather generic reusable instructions from this session and: a. Add to IDE_PROMPTS folder b. Update the master rules file with missing instructions.

19. Okay lets do and update docs accordingly and make sure new changes does not break existing anything workflows so cross check everything after changes done.

## Refactoring and Cleanup Steps

1. Check for redundant constants/types - is the same data in multiple files?.

2. Check if adding a new item requires updating 2+ places - if yes, consolidate.

3. Look for lookup tables that could be fields on existing types - extend types instead.

4. Look for separate files with only 1-3 small exports - consolidate with related files.

5. Identify the PRIMARY data structure (usually the type/interface) as single source of truth.

6. Extend types to include ALL related fields (display info, icons, descriptions).

7. Store icons as STRING names in data, create ICON_MAP in component layer.

8. Update consumers to use extended type directly instead of lookups.

9. Delete redundant files after moving their contents.

10. Update imports in all dependent files.

11. Run type check: `npx tsc --noEmit` to verify nothing broke.

12. Update verification.md with what was changed.

13. Update README.md version history.

14. Add visual previews where helpful (emoji icons, thumbnails).

15. Make important buttons more prominent (danger style for destructive actions).

16. Add "Quick Action" buttons for zero-config operations where applicable.

17. Improve toggle clarity with descriptive labels and explanations.

18. Collapse advanced options by default to reduce cognitive load.

19. Use free tier AI models for development testing when available.

20. Document all changes including decision rationale (why this approach).
