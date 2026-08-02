# Menu Intake Identity — Implementation

**Status:** Implemented  
**Last Updated:** June 30, 2026

---

## Architecture

```text
Upload UI
  -> existing file validation
  -> upload/prepare URLs
  -> /api/menu-intake-identity
  -> decision response
  -> continue, warn, confirm, create new project, accept identity suggestions, or stop
  -> /api/menu-extraction/jobs
  -> menuImageProcessingJobs extraction
```

## Files

| File | Role |
| --- | --- |
| `src/data/shared/menuIntakeIdentity.ts` | Shared prompt, normalized result shape, match decision. |
| `functions/src/sharedData/menuIntakeIdentity.ts` | Byte-for-byte backend mirror for Cloud Functions. |
| `src/app/api/menu-intake-identity/route.ts` | Protected preflight API for dashboard/mobile uploads. |
| `src/lib/menu-extraction/menuIntakeIdentityServer.ts` | Shared server identity analyzer used by the preflight API, central extraction job API, and public draft job metadata. |
| `src/app/api/menu-extraction/jobs/route.ts` | Protected extraction job creation; re-runs/enforces menu-intake identity before the job is created. |
| `src/lib/menu-intake-identity/client.ts` | Client helper for desktop/mobile upload flows. |
| `src/lib/menu-intake-identity/suggestionAcceptance.ts` | Builds store identity suggestions and selected-field update payloads. |
| `functions/src/messagingOnboarding/assetIntelligence.ts` | Reuses shared prompt/normalizer while preserving messaging session flow. |
| `src/components/templates/main-app/projects/index.tsx` | Desktop upload confirmation before processing job creation. |
| `src/components/mobile/sheets/MenuUploadSheet.tsx` | Mobile upload confirmation before processing job creation. |

## API Contract

`POST /api/menu-intake-identity`

Protected by `withAuth()`.

As of August 1, 2026, distributed limiter uncertainty fails closed before body
parsing, Firestore reads, Storage access, or Gemini work. A limiter-provider
outage returns retryable HTTP 503 without quota metadata; actual owner quota
exhaustion remains HTTP 429.

Desktop and mobile call this route through `runMenuIntakeIdentityPreflight()`, which sends the browser request with same-origin credentials, `no-store` cache policy, and manual redirect handling before the 32KB bounded acknowledgement parser accepts the response shape.

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

The mobile acknowledgement path binds its optimistic context settlement to
the tenant/store identity captured for the write. If the active location or
account changes before the write settles, the persisted write keeps its
original server-validated scope but the late response cannot merge old
business details into the newly active browser context.

Business-type suggestions are accepted only when the provider value exactly
matches a canonical `BUSINESS_TYPES` value or label after case and surrounding
whitespace normalization. Partial descriptions such as `shop`, `service`,
`restaurant and cafe`, or `pet grooming` are not guessed into the first
matching type; they remain unset so the owner can choose the correct business
identity explicitly.

When a strong mismatch is detected for an existing project, desktop and mobile show a direct `Create new menu` action when a separate menu is the safe next action. That action creates a fresh project using the detected business name when available, keeps the valid uploaded menu files, and creates the extraction job against the new project instead of the original project.

Mixed uploads are filtered before extraction. Files not listed as valid menu/list pages are deleted from temporary storage and are not sent into `menuImageProcessingJobs`.

The same preflight logic is also enforced server-side by `POST /api/menu-extraction/jobs` immediately before job creation. A `block` decision stops job creation. A `notice` or `confirm` decision requires the UI to pass `identityOverrideConfirmed`, which desktop and mobile set only after the owner accepts the warning.

The lower-level `analyzeMenuIntakeIdentity()` helper can also run without an authenticated project context. Public create-menu uses that path to attach identity metadata to `public_menu_draft` jobs when the uploaded or acquired source is readable by the helper. That keeps public claim prefill on the same prompt/normalizer without giving anonymous requests direct access to tenant context.

## Security

- Protected route uses `withAuth()`.
- Tenant/store access verified before reading project/store documents.
- Zod validates all input before database or AI work.
- SAFE_MODE is checked before Gemini work.
- Rate limit checked before Gemini call.
- Server-side file fetch is restricted to the configured Firebase Storage bucket.
- Logs do not include raw file contents, tokens, or full URLs.
- Browser clients no longer create `menuImageProcessingJobs` directly.
- Browser preflight requests stay same-origin, uncached, and manual-redirect before bounded response parsing.
- Public draft identity checks run server-side with platform IDs and public billing metadata; they do not read owner tenant/store/project documents.

## Cost

This adds one lightweight Gemini call before full extraction. It should analyze a bounded number of files per upload batch and return compact JSON only.

Uploaded temporary files are cleaned up when the owner cancels after a block, warning, or mismatch confirmation. Ignored non-menu files are also cleaned up when the owner continues. Valid menu files are kept when the owner chooses `Create new menu`, because those files become the input for the new project's extraction job.
