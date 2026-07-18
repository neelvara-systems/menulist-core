# Extracted Business Profile Mobile Support

## Scope

Owner mobile upload uses the same menu-intake identity preflight helper and the same extraction job contract as desktop.

## Owner Mobile Flow

`src/components/mobile/sheets/MenuUploadSheet.tsx` uses `buildBusinessIdentitySuggestions()` and `buildBusinessIdentityUpdatePayload()` from `src/lib/menu-intake-identity/suggestionAcceptance.ts`.

Detected store suggestions can include:

- phone
- address
- business type
- business category
- currency
- active languages
- default language

The mobile confirmation dialog also shows detected upload details and owner-safe mismatch concerns before extraction continues. It uses `src/lib/menu-intake-identity/ownerPresentation.ts`, the same helper used by desktop.

## Mobile Job Completion

`src/components/mobile/screens/MobileMenuScreen.tsx` reads `activeJob.result.extractedBusinessProfile` or `activeJob.result.combinedData.extractedBusinessProfile`.

The mobile screen uses this profile for:

- immediate project image generation background color
- missing project brand accent/background defaults after approved re-extraction
- success-screen profile highlights such as detected business name, menu name, brand color, and image background

## Mobile Business Settings

Mobile basic settings keep the same identity boundary as desktop:

- Brand name is required and writes tenant identity.
- Location name writes the current store/outlet name.
- Brand changes update the local tenant/store state after the shared tenant/store write path completes.
- Customer-facing address and postal data use canonical `addressLine` and `postalCode`, with legacy keys used only to hydrate old records.
- Latitude and longitude use the shared paired/range validator; a valid empty pair clears geo, zero remains valid, and partial or invalid coordinates stop before persistence.

## PWA Shell

No new mobile route is introduced. The upload and review behavior stays inside the existing `MobileShell` / mobile menu screen flow.

## Parity

Desktop and mobile share:

- the same preflight suggestion builder
- the same job result profile contract
- the same no-overwrite rule for owner-set visual defaults
- the same menu-derived business-attribute default behavior
- the same transaction-current merge for business-attribute defaults, with explicit owner `true` or `false` values preserved and acknowledged merged truth installed locally
- the same brand-versus-location identity boundary
