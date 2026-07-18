# Extracted Business Profile Implementation

## Shared Contract

The canonical contract lives in `src/data/shared/extractedBusinessProfile.ts` and is mirrored byte-for-byte in `functions/src/sharedData/extractedBusinessProfile.ts`.

The helper normalizes:

- currencies and common currency symbols
- language codes
- business category values
- usable hex colors
- suggestion confidence and evidence

`src/lib/menu-intake-identity/ownerPresentation.ts` is the owner-facing presentation helper for detected upload details, mismatch concerns, and extracted profile highlights. Dashboard, mobile, and public create-menu preview use this shape instead of formatting detected fields separately.

## Extraction Prompt and Parser

`functions/src/logic/parallelProcessingPrompt.ts` asks the model to return optional `extractedBusinessProfile` suggestions with visible evidence only.

`functions/src/logic/aiResponseUtils.ts` normalizes the raw model output and drops invalid profile values before the worker can store or apply them.

## Batch Merge

`functions/src/logic/processMenuImages.ts` merges profile suggestions across extraction batches and adjusts `sourceFileIndex` for later batches. Higher-confidence suggestions win.

## Worker Flow

`functions/src/logic/processMenuImagesJob.ts` merges two sources into one profile:

- `result.data.data.extractedBusinessProfile` from the main extraction.
- `sourceMetadata.identityCheck.identity` from the menu-intake preflight.

The merged profile is available before cancellation, first extraction, preview, public draft, and messaging branches.

## Owner Dashboard and Mobile

`src/lib/menu-intake-identity/suggestionAcceptance.ts` now exposes store suggestions for:

- phone
- address
- business type
- business category
- currency
- active languages
- default language

Desktop owner upload and mobile owner upload already use this shared helper.

Extracted `businessName` is not offered as an existing-store rename. In this codebase, `businessName` maps to tenant/brand identity for new-account creation, while `stores.name` is the location/outlet name. Existing owners can still correct brand/store names in business settings, where the brand path updates tenant identity and the store path updates the current location.

Desktop and mobile upload confirmations show detected business details and owner-safe mismatch labels before extraction continues. Extraction success views show profile highlights such as menu name, brand color, and image background when those suggestions were found.

Business settings expose separate Brand name and Location name fields. Saving Brand name calls `updateTenant()`, which updates tenant identity, mirrors `tenantName` on all tenant stores, merges `tenantName` into `platformSummary/storesSummary`, and revalidates public client cache for affected stores. Saving Location name stays on the current store update path.

First extraction applies missing project visual defaults inside `saveFilesToProject()` in the existing project transaction. Re-extraction uses one shared minimal patch after owner approval on desktop and mobile; standalone and linked-outlet transactions recheck the exact current accent/background fields, so concurrent owner choices win and unrelated project design/preferences are never replayed from a stale review snapshot.

## Public Create Menu

`src/app/api/public/create-menu/route.ts` initializes and returns profile fields on public drafts.

`functions/src/logic/processMenuImagesJob.ts` writes extracted profile data to the draft when extraction completes.

`src/app/api/public/create-menu/claim/route.ts` uses the draft profile during claim:

- new stores can receive extracted currency
- new stores write confirmed phone to `phoneNumber` for public call/WhatsApp rendering
- new stores get a permanent subdomain from the owner-approved business name through `preCheckSubdomain()`
- projects can receive suggested project name
- projects can receive extracted brand accent and image background defaults

`src/app/(website)/create-menu/PreviewClient.tsx` shows detected profile details and color swatches before claim, and prefills business name from the profile when the draft-level detected name is missing.

Existing-account claims do not overwrite the existing store.

## Messaging Onboarding

`functions/src/messagingOnboarding/extractionWatcher.ts` writes the profile to the session after extraction completes.

`src/app/api/msg-preview/[sessionId]/route.ts` can show profile-derived business name, type, category, and address in the approval preview.

`src/lib/messaging-onboarding/publish.ts` uses the profile during publish:

- printed menu currency wins over phone-country fallback
- confirmed business phone is stored on the store; messaging sender phone remains the account/provider phone
- approved business name seeds the permanent public subdomain through the shared onboarding helper
- project name can come from the menu
- project brand accent and image background can come from the menu
- new stores can receive menu-derived business attributes from high-confidence suggestions and deterministic item dietary tags

Existing-owner desktop/mobile upload, standalone re-extraction review, and first-extraction Functions paths apply those attributes as defaults only. Every browser producer routes through `applyStoreBusinessAttributeDefaults()` and both runtime layers use the byte-mirrored `businessAttributeDefaults.ts` merge contract inside a transaction-current `stores/{storeId}` read/write. Existing explicit `true` or `false` values and unrelated attributes win; only an allowed missing key can be filled. Re-extraction performs its existing derivation read plus the authoritative transaction read, then invalidates public cache only when that transaction adds a default. Browser UI callers replace local context with the acknowledged merged map rather than their stale pre-transaction proposal.

## Subdomain Derivation

Subdomain is derived, not extracted. `src/lib/onboarding/createTenantStore.ts` normalizes approved business names into DNS-safe candidates, enforces the 63-character label limit, checks reserved names, checks active-store collisions before transaction, and writes the final value into tenant/store public URL fields plus `storesSummary`.

Existing-owner uploads never call this path for subdomain changes. Subdomain edits stay in the owner domain settings flow, where published-store mutation is blocked.

## Safety Boundaries

- The feature does not create new owner toggles.
- The feature does not add new AI calls.
- The feature does not overwrite existing owner-set project visual defaults.
- The feature does not overwrite transaction-current owner-set business attributes.
- The feature does not overwrite existing-account store identity from public claims.
- The feature does not treat subdomain as AI truth.
