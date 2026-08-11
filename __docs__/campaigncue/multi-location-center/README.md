# Multi-Location Center

Multi-Location Center turns one approved workspace campaign into separate branch packs. Each pack uses the selected branch's area and contact overrides, keeps a compact truth snapshot, and owns its trust, approval, manual delivery, hosted-page, export, and result state.

## Current Status

- Implemented behind `ENABLE_CAMPAIGNCUE_MULTI_LOCATION_VARIANTS`.
- Uses existing `locations`, `campaigns`, `trustReports`, `events`, `analyticsSummaries`, and `idempotencyKeys` data.
- Adds no location-group, child-draft, approval-state, or result-summary collection.
- Creates one to eight branch packs in one bounded request.
- Direct posting and provider-account mutation remain unavailable.

## Documents

| File | Purpose |
| --- | --- |
| [multi-location-center_spec.md](./multi-location-center_spec.md) | Product contract and invariants. |
| [multi-location-center_impl.md](./multi-location-center_impl.md) | Runtime, API, data, and authorization design. |
| [multi-location-center_firebase.md](./multi-location-center_firebase.md) | Exact Firestore and cost posture. |
| [multi-location-center_mobile-support.md](./multi-location-center_mobile-support.md) | Mobile review and branch-action contract. |
| [multi-location-center_test-cases.md](./multi-location-center_test-cases.md) | Regression and adversarial matrix. |
| [multi-location-center_validation.md](./multi-location-center_validation.md) | Current local evidence and external blockers. |
| [multi-location-center_helpdoc.md](./multi-location-center_helpdoc.md) | Owner instructions. |
| [multi-location-center_marketing.md](./multi-location-center_marketing.md) | Internal positioning. |
| [multi-location-center_website.md](./multi-location-center_website.md) | Approved public claims. |

## Primary Evidence

- `src/lib/campaigncue/locationVariants.ts`
- `src/lib/campaigncue/server.ts` (`createCampaignCueLocationVariantsServer`)
- `src/app/api/campaigncue/campaigns/variants/route.ts`
- `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx`
- `scripts/verification/test-campaigncue-multi-location-variants.ts`
