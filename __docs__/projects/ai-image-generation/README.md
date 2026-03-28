# AI Image Generation — Documentation Hub

> **Feature:** AI-Powered Image Generation & Editing  
> **Status:** ✅ Production Ready (Verified)  
> **Last Updated:** January 30, 2026  
> **Version:** 2.2

---

## Quick Navigation

| Audience       | Document                                                   | Purpose                                     |
| -------------- | ---------------------------------------------------------- | ------------------------------------------- |
| **CEO / PM**   | [\_spec.md](./ai-image-generation_spec.md)                 | Business requirements, user flows           |
| **Developers** | [\_impl.md](./ai-image-generation_impl.md)                 | Technical blueprint, APIs, database schema  |
| **Sales**      | [\_marketing.md](./ai-image-generation_marketing.md)       | Pitch deck, messaging, sales talking points |
| **QA**         | [\_verification.md](./ai-image-generation_verification.md) | Verification report, findings, improvements |

---

## What Is This Feature?

**One-liner:** AI-powered image generation and editing system that creates professional menu item images using Gemini 2.5 Flash and Imagen 3 models.

**Problem Solved:** Restaurant and business owners often lack professional photography for their menu items. Hiring photographers is expensive, time-consuming, and creates consistency issues across menu updates. Many businesses end up with no images or low-quality photos that hurt customer perception.

**Solution:** MenuList AI Image Generation provides two modes:

1. **Single Image Generation** — Real-time AI generation for individual items with style customization
2. **Bulk Image Generation** — Asynchronous batch processing for multiple items using Google Cloud Tasks

Plus **AI Image Editing** to enhance, modify backgrounds, and apply professional effects to existing images.

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
| **Prompt Construction**   | `src/app/api/image-generation/prompt.ts`                                                                                         |
| **Cloud Task Client**     | `src/lib/google/cloudTask/index.ts`                                                                                              |
| **Batch Job Listener**    | `src/hooks/useImageBatchJobListener.ts`                                                                                          |
| **Batch Job DAL**         | `src/database/imageBatchProcessing/index.tsx`                                                                                    |
| **Types**                 | `src/components/templates/main-app/projects/types/imageGeneration.types.ts`                                                      |
| **Batch Job Types**       | `src/components/templates/main-app/projects/types/batchJob.types.ts`                                                             |
| **AI Constants**          | `src/constants/AI/index.tsx`                                                                                                     |

---

## Feature Flag

```typescript
// src/config/features.ts:526
ENABLE_AI_IMAGE_GENERATION: true; // Implementation complete - enabled
```

Toggle to disable AI image generation without code changes.

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
