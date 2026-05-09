# ChatGPT Conversation Critical Review: Media Image System

## Executive Summary

ChatGPT was directionally correct that MenuList needs image infrastructure, not scattered upload helpers. The accepted direction is to create a central media profile layer and wire existing upload surfaces into it.

The answer was incomplete for this repo because it assumed a new server-side Sharp/CDN pipeline. Current code already uses Firebase Storage, client-side canvas optimization, public cache invalidation, and direct project/store DAL write paths. Adding a new server image processor or dependency would violate the smallest safe scope for this request and the current 3-year freeze discipline.

## Conversation Breakdown

| Topic | ChatGPT suggestion | Verdict | MenuList reality |
| --- | --- | --- | --- |
| Central image infrastructure | Build shared media system | Agree | Existing logic is scattered across `src/lib/image/optimizeImage.ts`, item upload, project image upload, menu background upload, and logo upload. |
| Fixed image types | Use controlled image categories | Agree | Needed to prevent layout drift and owner-created bad output. |
| Per-type sizes and ratios | Restrict by use case | Agree | Menu background already has stricter budget and quality gates in `src/lib/performanceBudget.ts` and `src/lib/imageQualityGuard.ts`. |
| Server-side Sharp pipeline | Always compress server-side | Partial | Correct long-term contract, but current repo has no Sharp dependency and upload paths are client DAL/Firebase Storage based. Immediate implementation uses shared client preparation and leaves server processor as a documented migration point. |
| CDN variants | Generate thumb/small/medium/large | Partial | Contract is documented now. Existing persisted fields mostly store single URLs, so adding variant writes everywhere would be a schema migration. |
| Background image strictness | Restrict and protect readability | Agree | Digital menu constitution requires visual stability and readability. |
| Focal point | Support for covers/backgrounds | Partial | Stored metadata contract includes focal point. UI write path does not yet persist a separate media asset document. |
| Photo shape options | Use contextual aspect options | Agree | We expose only the ratios valid for the current image purpose. |

## Grounded Code Evidence

- Current shared optimizer: `src/lib/image/optimizeImage.ts`
- Public menu image resolver: `src/lib/menu/publicMenuImages.ts`
- Item upload modal: `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx`
- Desktop project image upload: `src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx`
- Mobile project image upload: `src/components/mobile/components/MobileProjectSelectorSheet.tsx`
- Menu background upload: `src/components/templates/main-app/projects/b2cView/menuPage/backgroundSettings.tsx`
- Mobile menu background upload: `src/components/mobile/screens/MobileDesignEditorScreen.tsx`
- Logo save path: `src/database/stores/index.tsx`
- Public cache invalidation on publish/summary sync: `src/database/projects/index.ts`

## Accepted Decisions

| Decision | Reason |
| --- | --- |
| Create central media image profiles | Prevents each upload surface from inventing size, ratio, and compression behavior. |
| Keep Firebase Storage and current DAL paths | Avoids a parallel upload architecture and preserves current cache invalidation behavior. |
| Reject SVG/GIF/HEIC for managed presentation assets | SVG/GIF create security/performance problems; HEIC is not supported consistently in current browser flow. |
| Use purpose-specific ratios | Owners should not pick social-media ratios for menu cards or backgrounds. |
| Compress before save | Public surfaces must stay fast and stable. |
| Keep logo compression gentler | Logo clarity affects trust more than minor storage savings. |

## Rejected Or Deferred

| ChatGPT idea | Decision | Reason |
| --- | --- | --- |
| Immediate Sharp/ImageMagick processing | Deferred | Requires dependency/runtime changes and a new server processing route. |
| Immediate CDN vendor layer | Deferred | Current public URL contract is Firebase Storage; vendor migration belongs behind the media contract later. |
| Store original uploads publicly | Rejected | Public surfaces should render prepared assets, not raw uploads. |
| Show every ratio everywhere | Rejected | Adds owner cognitive load and creates bad public output. |

## Doctrine Preservation Check

No new constitution-level doctrine is needed. The durable rule belongs in this feature: images must be purpose-bound presentation assets, not generic uploads.

