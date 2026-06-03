# Extracted Business Profile Spec

## Goal

When an owner provides a menu image, document, public menu link, or messaging upload, MenuList should reuse visible business information from that source instead of asking the owner to re-enter it.

## Non-Goals

- Do not infer owner-sensitive facts without visible evidence.
- Do not overwrite existing owner-set store identity, currency, design, or AI image preferences silently.
- Do not create a new AI call for this profile.
- Do not store allergens, nutrition, warranties, materials, or other verification-sensitive item metadata through this feature.

## Fields

`extractedBusinessProfile.identity`:

- `businessName`
- `phoneNumber`
- `addressLine`
- `businessType`
- `businessCategory`
- `currencyCode`
- `defaultLanguage`
- `activeLanguages`

`extractedBusinessProfile.visualBrand`:

- `brandAccentColor`
- `imageBackgroundColor`

`extractedBusinessProfile.project`:

- `projectName`

Every suggestion has:

- `field`
- `value`
- `confidence`: `high`, `medium`, or `low`
- `evidence`
- `source`: `menu_intake_identity`, `menu_extraction`, or `system`
- `sourceFileIndex`

## Rules

- Main extraction prompt returns `extractedBusinessProfile` only when visibly supported.
- Menu-intake identity results are merged into the same profile object in the worker.
- Higher-confidence suggestions win. Equal confidence keeps the extraction profile value.
- `businessName` is brand/tenant identity for new-account flows. Existing-store uploads do not write it into `stores.name`, because `stores.name` is the location/outlet name.
- Existing-owner upload confirmation shows detected business/contact/classification details and mismatch concerns before extraction continues. The owner can accept store-safe fields, but not `businessName`.
- Owner settings split Brand name (`tenants.name` plus mirrored `stores.tenantName`) from Location name (`stores.name`).
- New-store flows derive public subdomain from the approved business name, not as an extracted profile field. The shared onboarding helper normalizes the slug, blocks reserved names, checks active-store collisions before the transaction, and falls back to a store-id suffix when needed.
- Existing-store uploads and re-extractions never auto-write `stores.subdomain`.
- `phoneNumber` and `addressLine` are store/outlet contact fields. Account/login phone numbers remain separate.
- `brandAccentColor` rejects unusable near-white, near-black, and neutral gray values.
- `imageBackgroundColor` accepts usable visible brand/background colors for image generation.
- Owner first extraction applies project visual defaults only when the current project value is empty.
- Re-extraction applies project visual defaults only after the owner approves the extraction.
- Public and messaging new-account flows can use extracted currency and project defaults because they create new store/project records.

## Stored Locations

- `menuImageProcessingJobs/{jobId}.result.extractedBusinessProfile`
- `menuImageProcessingJobs/{jobId}.result.combinedData.extractedBusinessProfile`
- `publicMenuDrafts/{draftId}.extractedBusinessProfile`
- `messagingOnboardingSessions/{sessionId}.extractedBusinessProfile`
- `projects/{tId}/{sId}/{projectId}.config.design.brand.accentColor` when safely applied
- `projects/{tId}/{sId}/{projectId}.aiPreferences.image.backgroundColor` when safely applied
- `tenants/{tenantId}.name` when the owner manually edits Brand name in settings
- `stores/{storeId}.tenantName` and `platformSummary/storesSummary.stores.{storeId}.tenantName` when Brand name changes
- `stores/{storeId}.subdomain`, `tenants/{tenantId}.subDomain`, tenant `storesList[].subdomain`, and `platformSummary/storesSummary.stores.{storeId}.subdomain` when a new store is created with a public subdomain

## Acceptance Criteria

- All extraction entry points use the shared profile contract.
- Public and messaging onboarding can create new store/project records with extracted currency, project name, and visual defaults.
- Owner dashboard and owner mobile behave consistently.
- Owner-facing upload and preview screens show the useful detected details without silently changing identity.
- Brand rename propagation keeps store docs, store summaries, and public cache aligned.
- New public/messaging stores get a normalized permanent subdomain derived from the approved business name.
- Existing stores do not get extraction-driven subdomain changes.
- The feature adds no new AI operation by itself.
- The feature adds no new Firestore collection or index.
