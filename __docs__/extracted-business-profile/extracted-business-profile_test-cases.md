# Extracted Business Profile Test Cases

## Shared Contract

- Verify `src/data/shared/extractedBusinessProfile.ts` and `functions/src/sharedData/extractedBusinessProfile.ts` are byte-identical.
- Verify invalid colors, invalid categories, invalid language codes, and invalid currency strings are dropped.
- Verify valid currency symbols normalize to ISO codes.

## Owner Dashboard Upload

- Upload a first menu with visible brand color and no existing project visual defaults.
- Confirm the confirmation modal shows detected menu/contact/classification details and mismatch concerns when present.
- Confirm `businessName` is shown for context but is not offered as a checkbox-backed store rename.
- Confirm menu data saves as before.
- Confirm project `config.design.brand.accentColor` is set only if missing.
- Confirm project `aiPreferences.image.backgroundColor` is set only if missing.
- Confirm generated project image uses the extracted background color.
- Confirm the success modal shows detected profile highlights and color swatches when available.

## Owner Mobile Upload

- Repeat first extraction through the mobile upload sheet.
- Confirm the same store suggestion fields appear.
- Confirm the same detected-detail and mismatch-warning presentation appears in the mobile confirmation dialog.
- Confirm generated project image uses the extracted background color.
- Confirm the mobile success popup shows detected profile highlights when available.

## Owner Business Settings

- Edit Brand name on desktop.
- Confirm `tenants/{tenantId}.name`, all tenant `stores/{storeId}.tenantName`, `platformSummary/storesSummary.stores.{storeId}.tenantName`, and public cache revalidation are triggered.
- Edit Location name on desktop.
- Confirm only the current `stores/{storeId}.name` path changes.
- Repeat Brand name and Location name edits on mobile.
- Confirm empty Brand name is rejected.

## Re-Extraction

- Run extraction on a project with existing menu data.
- Confirm job goes to `preview_ready`.
- Approve changes.
- Confirm missing project visual defaults can be applied.
- Confirm existing owner-set visual defaults are not overwritten.

## Public Create Menu

- Create a public draft from an image with business name, currency, and brand color.
- Confirm draft stores `extractedBusinessProfile`.
- Confirm preview shows detected profile details and color swatches before claim.
- Claim the draft as a new account.
- Confirm the new store gets a normalized subdomain derived from the approved business name.
- Confirm long business names are trimmed to a DNS-safe subdomain candidate or fall back to `store-{storeId}` / suffixed candidate.
- Confirm new store currency comes from the menu when available.
- Confirm project name/color/background defaults come from the profile.
- Confirm existing-account claim does not overwrite existing store currency or identity.
- Confirm existing-account claim does not overwrite existing store subdomain.

## Messaging Onboarding

- Upload menu images through messaging onboarding.
- Confirm completed extraction stores `extractedBusinessProfile` on the session.
- Confirm preview can show profile-derived name/type/address.
- Approve publish.
- Confirm the published store gets a normalized subdomain derived from the approved business name.
- Confirm printed menu currency wins over phone-country currency when available.
- Confirm project name/color/background defaults are set on the published project.

## Operational

- Confirm no new Firestore collection or index is required.
- Confirm Functions build passes.
- Confirm root TypeScript passes.
