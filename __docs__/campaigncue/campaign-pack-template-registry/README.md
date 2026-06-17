# Campaign Pack Template Registry

**Status:** Implemented in repo.
**Product:** CampaignCue
**Core decision:** Platform templates are stored by canonical business category, not as one global marketplace catalog.

Campaign Pack Template Registry gives CampaignCue a small, curated library of reusable campaign pack starting points. It uses the shared business category source in `src/data/shared/businessTypes.ts` so every onboarded business sees templates for its resolved category, while searches, grouped campaign output choices, event tags, and channel tags are handled in memory after one platform catalog read.

This is not a generic template marketplace. The registry exists to help a local business reuse proven campaign pack structures with current facts, trust checks, manual delivery fields, and result memory.

## Documents

| Document | Purpose |
| --- | --- |
| [campaign-pack-template-registry_spec.md](./campaign-pack-template-registry_spec.md) | Product contract, owner workflow, business-category decision, and non-goals. |
| [campaign-pack-template-registry_impl.md](./campaign-pack-template-registry_impl.md) | Implementation blueprint, file paths, schema, adapters, and verification plan. |
| [campaign-pack-template-registry_firebase.md](./campaign-pack-template-registry_firebase.md) | Firestore/Storage shape, read/write ledger, overflow rule, and cost guardrails. |
| [campaign-pack-template-registry_mobile-support.md](./campaign-pack-template-registry_mobile-support.md) | Mobile admission decision and phone-safe owner actions. |
| [campaign-pack-template-registry_helpdoc.md](./campaign-pack-template-registry_helpdoc.md) | Owner-facing help article draft. |
| [campaign-pack-template-registry_marketing.md](./campaign-pack-template-registry_marketing.md) | Internal positioning and sales notes. |
| [campaign-pack-template-registry_website.md](./campaign-pack-template-registry_website.md) | Public website copy boundaries. |
| [campaign-pack-template-registry_test-cases.md](./campaign-pack-template-registry_test-cases.md) | QA and regression matrix. |
| [campaign-pack-template-registry_validation.md](./campaign-pack-template-registry_validation.md) | Docs validation and source-truth cross-check. |

## Key Source Truth

| Source | Relevance |
| --- | --- |
| `src/data/shared/businessTypes.ts:48` | Canonical `BUSINESS_CATEGORIES` values: `service`, `retail`, `food`, `professional`, `creative`, `health`, and `specialty`. |
| `src/data/shared/businessTypes.ts:212` | Category resolution prefers stored `businessCategory`, then derives from `businessType`. |
| `__docs__/creative-editor-template-registry/creative-editor-template-registry_firebase.md:31` | Existing MenuList pattern: one platform category catalog document plus Storage-backed editor payloads. |
| `__docs__/campaigncue/campaign-pack-output-system/README.md:7` | CampaignCue output is a full campaign pack, not scattered posts. |
| `__docs__/campaigncue/daily-campaign-desk/daily-campaign-desk_spec.md:33` | Daily Desk recommendations are computed from already-loaded overview data and deterministic recipes. |

## Registry Shape

```text
campaigncuePlatformPackTemplates/{businessCategory}
campaigncueWorkspaces/{workspaceId}/packTemplateIndexes/default
```

The owner path reads one resolved category catalog. Shared festival/event templates are copied as small metadata summaries into each relevant category doc. Full template payloads live in Storage and are loaded only when the owner opens a template.

## Runtime Files

| File | Purpose |
| --- | --- |
| `src/constants/campaigncue/outputPicker.ts` | CampaignCue grouped output intent registry for recommended, sell today, bookings, local visibility, print, handoff, reuse, and advanced actions. |
| `src/constants/campaigncue/packTemplates.ts` | CampaignCue-owned registry limits, Storage roots, category/event constants, and owner copy. |
| `src/types/campaigncuePackTemplates.ts` | Summary, catalog, payload, hydrated template, and workspace save contracts. |
| `src/lib/validation/campaigncuePackTemplateSchemas.ts` | Zod validation for catalogs, payloads, and workspace saves. |
| `src/lib/campaigncue/pack-templates/*` | Category resolver, one-read catalog DAL, explicit workspace save/delete, and campaign-pack adapter. |
| `src/components/templates/campaigncue/PackTemplatePicker.tsx` | Daily Desk template picker with grouped owner-output choices, local search, and explicit save. |
| `scripts/campaigncue/seed-platform-pack-templates.js` | Dry-run-first platform seed script. |
| `scripts/verification/verify-campaigncue-pack-templates.js` | Static registry verifier. |

## Non-Goals

- No Canva-style marketplace.
- No Vista-style generic "Choose Format" grid as the primary owner path.
- No thousands of platform templates.
- No social posting or provider account connection.
- No model-owned campaign decision.
- No stale price/date/contact facts inside reusable templates.
- No MenuList `storeAssetTemplates` reuse for CampaignCue workspace templates.
