# AI Image Generation — Documentation Hub

> **Feature:** Menu Image Generation & Editing
> **Status:** Source-gate verified; target deployment, provider smoke, and authenticated owner QA remain release evidence
> **Last Updated:** August 31, 2026
> **Version:** 3.3

---

## Quick Navigation

| Audience       | Document                                                   | Purpose                                     |
| -------------- | ---------------------------------------------------------- | ------------------------------------------- |
| **CEO / PM**   | [\_spec.md](./ai-image-generation_spec.md)                 | Business requirements, user flows           |
| **Developers** | [\_impl.md](./ai-image-generation_impl.md)                 | Technical blueprint, APIs, database schema  |
| **Sales**      | [\_marketing.md](./ai-image-generation_marketing.md)       | Pitch deck, messaging, sales talking points |
| **Website**    | [\_website.md](./ai-image-generation_website.md)           | Governed public-copy boundary               |
| **Support**    | [\_helpdoc.md](./ai-image-generation_helpdoc.md)           | Owner instructions and recovery             |
| **Firebase**   | [\_firebase.md](./ai-image-generation_firebase.md)         | Reads, writes, Storage, and retention costs |
| **Mobile**     | [\_mobile-support.md](./ai-image-generation_mobile-support.md) | Mobile shell behavior and parity         |
| **QA**         | [\_verification.md](./ai-image-generation_verification.md) | Verification report, findings, improvements |
| **QA Cases**   | [\_test-cases.md](./ai-image-generation_test-cases.md)     | Saved-person acceptance and abuse cases      |

---

## What Is This Feature?

**One-liner:** A review-first image preparation system for menu items and covers, with optional private saved-person identity references for consistent business catalog drafts.

**Problem Solved:** Owners may have missing, outdated, or inconsistent images and need a bounded way to prepare replacement drafts without publishing unchecked output.

**Solution:** MenuList provides these code-backed paths:

1. **Single item generation** — synchronous preview generation with optional reference image and visual settings.
2. **Batch item generation** — asynchronous processing for 1–50 selected items using Cloud Tasks.
3. **Image editing** — owner-invoked edits of an existing item image, returned as drafts.
4. **Menu and business covers** — manual draft generation for project/Official Business Page covers; a missing project cover may also be prepared after an accepted extraction result.
5. **Saved person profiles** — an owner can privately save 2–4 authorized photos of one adult, then reuse that person across single or batch drafts while keeping the separate one-off visual reference control.

Generated item previews are not added to project truth until the owner accepts them. Cover generation uses the same guarded route/accounting path; generated public cover writes use the existing media preparation, authority, and cache-invalidation contracts.

The owner flow is business-aware: Saved Person is recommended and visible for person-led catalogs, while restaurant, retail, and other product-led businesses see it as a collapsed optional input. Single and batch actions show the maximum content credits before generation and state that only completed photos are charged.

---

## Architecture Overview (60-Second Summary)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI IMAGE GENERATION SYSTEM                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SINGLE MODE (Synchronous)                                       │
│  User → AiImageGenerator → /api/image-generation → Gemini AI    │
│       → Base64 Preview → Select → Upload to Storage              │
│                                                                  │
│  BATCH MODE (Asynchronous)                                       │
│  User → BatchSetupView → Firestore Job → Cloud Tasks Queue       │
│       → Worker API → Gemini AI → Upload → Real-time Listener     │
│       → BatchResultView → Review & Upload                        │
│                                                                  │
│  EDITING MODE                                                    │
│  User → EditImageModal → /api/image-editing → Gemini AI          │
│       → Preview Edits → Select → Upload                          │
│                                                                  │
│  SAVED PERSON (Optional input to single or batch)                 │
│  Owner → Private profile API → Admin-only Storage references     │
│       → Exact profile version → Gemini identity references       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Files in Codebase

| Purpose                   | File Path                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Main Generation UI**    | `src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx`                                               |
| **Batch Setup UI**        | `src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/index.tsx`                          |
| **Batch Results UI**      | `src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView.tsx` |
| **Image Editing UI**      | `src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx`                                      |
| **Single Generation API** | `src/app/api/image-generation/route.ts`                                                                                          |
| **Batch Trigger API**     | `src/app/api/image-generation/batch-trigger/route.ts`                                                                            |
| **Batch Worker API**      | `src/app/api/image-generation/batch-generation/route.ts`                                                                         |
| **Image Editing API**     | `src/app/api/image-editing/route.ts`                                                                                             |
| **Saved Person API**      | `src/app/api/image-subject-profiles/route.ts`                                                                                    |
| **Saved Person Store**    | `src/lib/ai/imageSubjectProfiles.ts`                                                                                              |
| **Saved Person UI**       | `src/components/templates/main-app/projects/editorView/AiImageGenerator/SubjectProfileSelector.tsx`                              |
| **Prompt Construction**   | `src/app/api/image-generation/prompt.ts`                                                                                         |
| **Cloud Task Client**     | `src/lib/google/cloudTask/index.ts`                                                                                              |
| **Batch Job Listener**    | `src/hooks/useImageBatchJobListener.ts`                                                                                          |
| **Batch Job DAL**         | `src/database/imageBatchProcessing/index.tsx`                                                                                    |
| **Project/Business Covers** | `src/lib/image/projectImageGeneration.ts`                                                                                       |
| **Mobile Owner Surface**  | `src/components/mobile/screens/MobileMenuScreen.tsx`                                                                             |
| **Retention Cleanup**     | `functions/src/schedulers/imageBatchRetentionBoundary.ts`, `functions/src/schedulers/menulistMaintenanceScheduler.ts`            |
| **Preference Persistence** | `src/lib/imageGenPreferences.ts`                                                                                                 |
| **Types**                 | `src/components/templates/main-app/projects/types/imageGeneration.types.ts`                                                      |
| **Batch Job Types**       | `src/components/templates/main-app/projects/types/batchJob.types.ts`                                                             |
| **AI Constants**          | `src/constants/AI/index.tsx`                                                                                                     |

---

## Feature Flag

```typescript
// src/config/features.ts
ENABLE_AI_IMAGE_GENERATION: true; // Implementation complete - enabled
ENABLE_AI_SUBJECT_PROFILES: true; // Private saved-person profiles enabled
```

The master flag is enforced by the single, edit, batch-trigger, and authenticated batch-worker routes; item, project-cover, business-cover, desktop, and mobile owner entry points; and AI Menu Manager image actions/suggestions. The saved-person flag independently gates its selector/API and single/batch admission; an already-enqueued saved-person worker remains retryable while that flag is off. Changing either source flag requires the normal app deployment.

---

## Related Documentation

| Document                                  | Purpose                  |
| ----------------------------------------- | ------------------------ |
| [Projects Overview](../00-overview.md)    | Projects feature context |
| [Database Layer](../11-database-layer.md) | Firestore patterns       |
| [API Routes](../12-api-routes.md)         | API conventions          |

---

## Version History

| Version | Date         | Changes                                                                                                                                                       |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.2     | Aug 31, 2026 | Added a lazy, five-minute, tenant/store/visibility-scoped saved-person summary cache to the existing global data provider; mutations update it in memory and session/store changes clear it without moving private truth into the Store document |
| 3.1     | Aug 31, 2026 | Cross-checked the saved-person lifecycle: mobile keeps fast selection while desktop owns setup/governance, withdrawn metadata/previews are management-only/blocked, validation failures are security-logged, and concurrent creates cannot exceed the profile cap |
| 3.0     | Aug 31, 2026 | Added consent-gated, store-scoped saved-person profiles with private reference storage, exact-version single/batch generation, withdrawal/deletion, mobile selection, desktop lifecycle controls, project/local preference persistence, prompt-cache exclusion, tests, and docs |
| 2.9     | Aug 25, 2026 | Moved batch-worker project/secret admission before SAFE_MODE so unauthorized traffic returns 403 with zero Firebase reads while admitted worker behavior remains unchanged |
| 2.8     | Jul 15, 2026 | Rotated the daily retention scan across every active store, distributed prompt-cache cleanup hourly with bounded backlog evidence, and capped Cloud Task creation at eight concurrent requests without changing batch results or accounting |
| 2.7     | Jul 14, 2026 | Enforced the master flag across every provider/UI entry, capped batch selection at 50 before request admission, corrected mobile generation routing, added project-reference-protected orphan cleanup, refreshed mobile/docs/verification truth |
| 2.6     | Jul 9, 2026  | Removed the deprecated Imagen branch from active generation code, route accounting, verifier expectations, and model documentation                             |
| 2.5     | Jul 5, 2026  | Removed redundant single-image and edit-image normal-path debug breadcrumbs while preserving bounded local summaries and failure diagnostics                   |
| 2.4     | Jul 5, 2026  | Added bounded local request, response, and transaction summaries plus validation, batch-trigger, and AI accounting input summaries for image generation/editing paths instead of full transaction objects, raw IDs, raw item/config payloads, or redundant batch-worker debug breadcrumbs |
| 2.3     | Jul 5, 2026  | Added bounded browser-local diagnostics for image-generation preference save/load/clear failures                                                               |
| 2.2     | Jan 30, 2026 | **Model upgrade to Gemini 2.5 Flash!** Consolidated `FEATURE_FRIENDLY_INFO` into type, added Quick Generate, improved multi-mode toggle, added style previews |
| 2.1     | Jan 30, 2026 | **Verification complete!** Added feature flag, removed debugger, fixed console.log, created verification.md                                                   |
| 2.0     | Jan 29, 2026 | **All P2 complete!** UX-13, UX-18, UX-19, UX-26 (inline upload, simplified confirmations)                                                                     |
| 1.9     | Jan 29, 2026 | P2 batch: UX-04, UX-07, UX-14, UX-31 (reference label, auto-style, previews, quick tags)                                                                      |
| 1.8     | Jan 29, 2026 | P2 improvements: UX-11 (rotating prompts), StyleSelector & EditModal UX fixes                                                                                 |
| 1.7     | Jan 29, 2026 | **All 12 P1 items complete!** Added UX-05, UX-06, UX-17 (style previews, recommendations, edit previews)                                                      |
| 1.6     | Jan 29, 2026 | Implemented 9 UX improvements (UX-01, UX-08, UX-10, UX-16, UX-20, UX-21, UX-22, UX-24, UX-27)                                                                 |
| 1.5     | Jan 29, 2026 | Implemented 6 Quick Wins + simplified labels                                                                                                                  |
| 1.4     | Jan 29, 2026 | Added UX Audit from SMB owner perspective - 32 improvement opportunities identified                                                                           |
| 1.3     | Jan 29, 2026 | Added "Default Confidence & Designing for Inaction" section, founder decision framework                                                                       |
| 1.2     | Jan 29, 2026 | Added development checklist, feature guardrails, USP definition, ChatGPT feedback audit                                                                       |
| 1.1     | Jan 28, 2026 | Added cross-check findings, web research improvements, doctrine alignment                                                                                     |
| 1.0     | Jan 28, 2026 | Initial documentation (restructured per IDE_PROMPTS)                                                                                                          |

---

_This documentation follows the structure defined in `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md`_
