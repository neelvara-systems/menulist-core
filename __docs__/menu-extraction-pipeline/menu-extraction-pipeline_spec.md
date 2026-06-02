# Menu Extraction Pipeline — Spec

**Status:** Implemented
**Last Updated:** June 2, 2026

## Goals

- Centralize all menu extraction entry points into one durable job queue.
- Preserve the existing owner review lifecycle for re-extraction and menu-link import.
- Make public create-menu extraction durable instead of request-lifecycle dependent.
- Enforce project existence and tenant/store isolation before owner extraction jobs exist.
- Reuse menu-intake identity checks immediately before owner extraction job creation.

## Non-Goals

- No new public menu renderer.
- No new extraction model path for public create-menu.
- No owner setting for extraction routing.
- No separate messaging extraction provider.

## Entry Points

| Entry point | Job creator | Destination |
| --- | --- | --- |
| Dashboard upload | `POST /api/menu-extraction/jobs` | `project` |
| Mobile upload | `POST /api/menu-extraction/jobs` | `project` |
| Authenticated menu link import | `POST /api/menu-link-imports` | `project`, forced review |
| Public `/create-menu` image/link | `POST /api/public/create-menu` | `public_menu_draft` |
| Messaging onboarding upload set | `functions/src/messagingOnboarding/intakeProcessor.ts` | `messaging_onboarding` |

## Owner Upload Rules

- Project ID must match the authenticated tenant/store.
- Project document must already exist.
- Files must be in `projects/files/{tId}/{sId}/`.
- Supported owner file types are JPEG, PNG, WebP, and PDF.
- Existing active jobs are reused.
- `block` menu-intake identity decisions stop job creation.
- `notice` and `confirm` identity decisions require `identityOverrideConfirmed`.

## Worker Rules

- Validate file count, MIME type, size, bucket, and Storage path before AI work.
- Enforce outlet extraction policy before provider calls.
- Reject empty extracted menu shapes before project save or public draft completion.
- `project` destinations use the existing auto-save/review decision.
- `public_menu_draft` destinations update draft completion or failure.
- `messaging_onboarding` destinations skip project save and keep the existing watcher flow.

