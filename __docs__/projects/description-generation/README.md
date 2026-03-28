# Description Generation — Documentation Hub

> **Feature:** AI-Powered Menu Item Description Generation  
> **Status:** ✅ Production Ready  
> **Last Updated:** March 13, 2026  
> **Version:** 2.3

---

## Quick Navigation

| Audience       | Document                                                           | Purpose                            |
| -------------- | ------------------------------------------------------------------ | ---------------------------------- |
| **CEO / PM**   | [description-generation_spec.md](./description-generation_spec.md) | Business requirements, user flows  |
| **Developers** | [description-generation_impl.md](./description-generation_impl.md) | Technical blueprint, API contracts |

---

## What Is This Feature?

**One-liner:** AI generates professional, neutral descriptions for menu items in multiple languages with configurable length.

**Problem Solved:** Restaurant owners and business operators often lack copywriting skills to create compelling menu descriptions. Writing descriptions for 50+ items across multiple languages is time-consuming and expensive.

**Solution:** One-click AI description generation using Gemini 2.5 Flash with:

- **2 Length Options:** Standard (one clear sentence), Detailed (rich, expressive)
- **Multi-Language:** Generates in all project languages simultaneously
- **Two Actions:** Generate empty descriptions OR refresh existing AI-generated ones
- **Manual Edit Protection:** User-written descriptions are never overwritten

---

## Architecture Overview (60-Second Summary)

```
┌─────────────────────────────────────────────────────────────────────┐
│ User clicks "Generate Descriptions" in Editor                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ DESCRIPTION GENERATION MODAL (DescriptionGenerationModal.tsx)        │
│   • Select description length (Standard/Detailed)                    │
│   • Tone locked to Professional internally                           │
│   • Shows "{X} items • {Y} need descriptions"                        │
│   • Actions: Generate descriptions / Refresh descriptions            │
│   • Silence state: "Your menu descriptions are ready."               │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SERVICE LAYER (descriptionUtils.ts)                                  │
│   • prepareDescriptionPayload() - Filter items, extract data         │
│   • addDescription() - Process files sequentially                    │
│   • mergeDescription() - Merge generated data back to items          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ API CLIENT (generateDescriptionViaAPI.ts)                            │
│   POST /api/descriptions                                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND API (/api/descriptions/route.ts)                             │
│   • withAuth() middleware                                            │
│   • Rate limiting (20 req/min via checkAIOperationLimit)             │
│   • Input validation (Zod DescriptionRequestSchema)                  │
│   • Tenant isolation (verifyTenantAccess)                            │
│   • Gemini 2.5 Flash API call with safety filters                    │
│   • Fixed deterministic temperature/topP settings                     │
│   • Safe JSON parse + response ID validation                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ GEMINI AI (gemini-2.5-flash)                                         │
│   • System instruction with safety rules                             │
│   • Prompt with sanitized user input                                 │
│   • JSON response format                                             │
│   • Safety filters: BLOCK_MEDIUM_AND_ABOVE                           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ RESULT                                                               │
│   • Descriptions merged into item.description[langCode]              │
│   • Auto-saved to Firestore                                          │
│   • Success message shown to user                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Files in Codebase

| Purpose                | File Path                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Frontend Modal**     | `src/components/templates/main-app/projects/editorView/DescriptionGenerationModal.tsx` |
| **Service Utils**      | `src/services/ai/description/descriptionUtils.ts`                                      |
| **API Client**         | `src/services/ai/description/generateDescriptionViaAPI.ts`                             |
| **Backend Route**      | `src/app/api/descriptions/route.ts`                                                    |
| **Prompt Template**    | `src/app/api/descriptions/prompt.ts`                                                   |
| **Validation Schema**  | `src/lib/validation/apiSchemas.ts` (DescriptionRequestSchema)                          |
| **Rate Limit Config**  | `src/lib/rateLimit/configs.ts` (AI_OPERATION: 20 req/min)                              |
| **Types**              | `src/components/templates/main-app/projects/types/api.types.ts` (DescriptionAPIParams) |
| **Action Constants**   | `src/constants/common.ts` (AI_ACTIONS_TYPES.ADD_DESCRIPTION, REWRITE_DESCRIPTION)      |
| **Editor Integration** | `src/components/templates/main-app/projects/editorView/Editor.tsx`                     |
| **Actions Popover**    | `src/components/templates/main-app/projects/editorView/EditorActionsPopover.tsx`       |

---

## Feature Flags

This feature does not have a dedicated feature flag as it's a core part of the Projects module. The modal is accessible via:

- **More Actions** popover → "Generate Descriptions"
- **Keyboard shortcut** (via useEditorKeyboardShortcuts hook)
- **Per-file retry** button in file preview

---

## Security Summary

| Security Measure     | Implementation                                          |
| -------------------- | ------------------------------------------------------- |
| **Authentication**   | `withAuth()` middleware on API route                    |
| **Tenant Isolation** | `verifyTenantAccess()` validates projectId ownership    |
| **Input Validation** | Zod schema with max lengths on all fields               |
| **Prompt Injection** | `sanitizeDescriptionInput()` removes dangerous patterns |
| **Rate Limiting**    | 20 requests/minute per user via `checkAIOperationLimit` |
| **Content Safety**   | Gemini safety filters (BLOCK_MEDIUM_AND_ABOVE)          |
| **Legal Compliance** | System prompt blocks allergen info and health claims    |

---

## Version History

| Version | Date         | Changes                                                                                                                                                                                                                                            |
| ------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.3     | Mar 13, 2026 | Prompt hardening: anti-hallucination rules, cross-SMB neutral language, removed "marketing purposes" framing. Dead tone code cleanup (fixed deterministic temperature). Response ID validation + safe JSON parse. Added missing injection pattern. |
| 2.2     | Jan 31, 2026 | Naming consistency: replaced Medium/Large with Standard/Detailed throughout codebase. Fixed route.ts fallback. Updated all documentation.                                                                                                          |
| 2.1     | Jan 31, 2026 | P1 UX improvements: simplified options (2 lengths), tone locked internally, "Refresh" with confirmation, silence as outcome, manual edit protection via `descriptionSource` field. ChatGPT doctrine review applied.                                |
| 2.0     | Jan 31, 2026 | Fresh documentation from codebase (single source of truth)                                                                                                                                                                                         |
| 1.1     | Nov 27, 2025 | Added tone selection, item count preview, progress indicator                                                                                                                                                                                       |
| 1.0     | Nov 20, 2025 | Initial production release with security hardening                                                                                                                                                                                                 |

---

## Related Features

| Feature              | Relationship                                |
| -------------------- | ------------------------------------------- |
| **Data Editor**      | Where descriptions are added/displayed      |
| **Multi-Language**   | Descriptions generated in all project langs |
| **Image Generation** | Separate AI feature for item images         |
| **Translation**      | Translates existing text (not descriptions) |

---

## Archived Documentation

| File                         | Description                                |
| ---------------------------- | ------------------------------------------ |
| `_archive/README_old.md`     | Previous README (consolidated Jan 2026)    |
| `_archive/_spec_old.md`      | Previous spec (consolidated Jan 2026)      |
| `_archive/_impl_old.md`      | Previous impl (consolidated Jan 2026)      |
| `_archive/_marketing_old.md` | Previous marketing (consolidated Jan 2026) |

---

_Document follows `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` standards._
