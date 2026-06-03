# Extracted Business Profile

Menu extraction now carries a shared `extractedBusinessProfile` object for business setup suggestions discovered from owner-provided menu sources.

This feature centralizes business/profile information that was previously split across menu-intake identity, extraction output, public drafts, messaging onboarding, and owner-side defaults.

## Runtime Contract

- Shared app contract: `src/data/shared/extractedBusinessProfile.ts`
- Shared Functions mirror: `functions/src/sharedData/extractedBusinessProfile.ts`
- AI parser: `functions/src/logic/aiResponseUtils.ts`
- Extraction prompt: `functions/src/logic/parallelProcessingPrompt.ts`
- Worker routing: `functions/src/logic/processMenuImagesJob.ts`

## What It Can Suggest

- Business name, phone, address
- Business type and broad business category
- Currency code
- Default and active languages
- Project/menu name
- Brand accent color
- Image-generation background color

Suggestions are evidence-backed and confidence-scored. They are not final owner truth unless an entry point explicitly accepts or applies them under overwrite rules.

## Entry Points

- Owner dashboard upload: preflight suggestions can update store contact, classification, currency, and language fields; confirmation screens show detected details and mismatch concerns before extraction continues; first extraction can apply missing project visual defaults.
- Owner mobile upload: same store-safe preflight, detected-detail presentation, mismatch warning, and project-default behavior as dashboard.
- Public `/create-menu`: public draft stores the profile, preview shows detected details/colors, and claim uses it for new store/project defaults.
- Messaging onboarding: completed extraction stores the profile in the session; preview/publish uses it for owner-visible info and new store/project defaults.

## Brand and Location Boundary

- Extracted `businessName` is brand/tenant identity for new-account flows.
- Existing-owner uploads never rename `stores.name`; `stores.name` is the current location/outlet name.
- Owner settings expose separate Brand name and Location name fields on desktop and mobile.
- Editing Brand name updates tenant identity, mirrored tenant name on all tenant stores, store summary rows, and public menu/OBP cache.
- Editing Location name updates only the current store/outlet path.
- Public subdomain is derived from the approved business name during new-store creation. It is collision/reserved-name checked and stored on the tenant/store public URL path, but it is not an AI-extracted field.
- Existing-owner uploads never auto-change subdomain. Owners manage subdomain separately, and published stores keep subdomain locked.

## Related Docs

- [Spec](./extracted-business-profile_spec.md)
- [Implementation](./extracted-business-profile_impl.md)
- [Firebase](./extracted-business-profile_firebase.md)
- [Mobile Support](./extracted-business-profile_mobile-support.md)
- [Test Cases](./extracted-business-profile_test-cases.md)
