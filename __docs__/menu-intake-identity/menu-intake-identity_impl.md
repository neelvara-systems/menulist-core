# Menu Intake Identity — Implementation

**Status:** Implemented  
**Last Updated:** May 3, 2026

---

## Architecture

```text
Upload UI
  -> existing file validation
  -> upload/prepare URLs
  -> /api/menu-intake-identity
  -> decision response
  -> continue, warn, confirm, create new project, accept identity suggestions, or stop
  -> existing menuImageProcessingJobs extraction
```

## Files

| File | Role |
| --- | --- |
| `src/data/shared/menuIntakeIdentity.ts` | Shared prompt, normalized result shape, match decision. |
| `functions/src/sharedData/menuIntakeIdentity.ts` | Byte-for-byte backend mirror for Cloud Functions. |
| `src/app/api/menu-intake-identity/route.ts` | Protected preflight API for dashboard/mobile uploads. |
| `src/lib/menu-intake-identity/client.ts` | Client helper for desktop/mobile upload flows. |
| `src/lib/menu-intake-identity/suggestionAcceptance.ts` | Builds store identity suggestions and selected-field update payloads. |
| `functions/src/messagingOnboarding/assetIntelligence.ts` | Reuses shared prompt/normalizer while preserving messaging session flow. |
| `src/components/templates/main-app/projects/index.tsx` | Desktop upload confirmation before processing job creation. |
| `src/components/mobile/sheets/MenuUploadSheet.tsx` | Mobile upload confirmation before processing job creation. |

## API Contract

`POST /api/menu-intake-identity`

Protected by `withAuth()`.

Input:

```ts
{
  projectId: string;
  files: Array<{
    uid: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
}
```

Server derives tenant/store/project context from the authenticated session and `projectId`. The client does not provide trusted business context.

Output:

```ts
{
  identity: MenuIntakeIdentity;
  validation: MenuIntakeValidation;
  decision: MenuIntakeDecision;
}
```

## Decision Rules

- `block`: no valid menu files or insufficient content with no usable menu pages.
- `confirm`: strong mismatch against an existing project/store.
- `notice`: partial menu or mixed non-menu files.
- `none`: continue without interruption.

Mismatch is strong only when confidence is high enough and more than one signal disagrees, or when the phone number clearly differs.

The shared result also carries owner intent, truth risk, menu structure assessment, quality issues, empty extraction risk, and suggestion-only identity fields. Identity fields are not saved as business truth by the AI result itself.

After the owner chooses to continue in the current project, desktop and mobile compare detected business name, phone, address, and business type against current store details. Medium/high-confidence differences are shown in a per-field acceptance dialog. `updateStore()` writes only selected fields, and the local store context is updated after the write succeeds. The dialog is skipped for low-confidence identity results and for the `Create new menu` branch so a different upload cannot silently alter the current store.

When a strong mismatch is detected for an existing project, desktop and mobile show a direct `Create new menu` action when a separate menu is the safe next action. That action creates a fresh project using the detected business name when available, keeps the valid uploaded menu files, and creates the extraction job against the new project instead of the original project.

Mixed uploads are filtered before extraction. Files not listed as valid menu/list pages are deleted from temporary storage and are not sent into `menuImageProcessingJobs`.

## Security

- Protected route uses `withAuth()`.
- Tenant/store access verified before reading project/store documents.
- Zod validates all input before database or AI work.
- SAFE_MODE is checked before Gemini work.
- Rate limit checked before Gemini call.
- Server-side file fetch is restricted to the configured Firebase Storage bucket.
- Logs do not include raw file contents, tokens, or full URLs.

## Cost

This adds one lightweight Gemini call before full extraction. It should analyze a bounded number of files per upload batch and return compact JSON only.

Uploaded temporary files are cleaned up when the owner cancels after a block, warning, or mismatch confirmation. Ignored non-menu files are also cleaned up when the owner continues. Valid menu files are kept when the owner chooses `Create new menu`, because those files become the input for the new project's extraction job.
