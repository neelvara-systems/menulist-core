# Daily Campaign Desk

**Status:** Implemented as computed CampaignCue owner workflow.

Daily Campaign Desk is the first CampaignCue owner screen. It turns the existing Business Brain, source inputs, campaign packs, assets, locations, schedules, and results into one practical daily path for an SMB owner:

1. Confirm the smallest missing detail.
2. Create or open the campaign pack.
3. Download/export and post manually.
4. Follow Campaign Rhythm for approval, manual reminders, result capture, or safe current-fact reuse.
5. Use the same pack for channel, manual delivery, print, photo, and image-reuse tasks.
6. Review the AI assistance plan for source intake, missing inputs, pack drafting, trust explanation, result interpretation, and photo coaching.
7. Record what happened with one tap or a short note.

This feature is not a generic design-tool dashboard, social scheduler, or posting integration. It is an owner operating surface over the existing export/download-first CampaignCue runtime.

The owner-facing product loop is:

`Business Brain / Opportunity Engine -> Daily Campaign Desk -> Campaign Pack -> Creative Studio -> Shared Creative Editor / Design Cue / CueLayers when needed -> Manual export -> Result memory`

## Documents

| Document | Purpose |
| --- | --- |
| [daily-campaign-desk_spec.md](./daily-campaign-desk_spec.md) | Product behavior and owner workflow. |
| [daily-campaign-desk_impl.md](./daily-campaign-desk_impl.md) | Code-level implementation map. |
| [daily-campaign-desk_firebase.md](./daily-campaign-desk_firebase.md) | Firestore, Storage, and cost posture. |
| [daily-campaign-desk_mobile-support.md](./daily-campaign-desk_mobile-support.md) | Mobile admission and responsive behavior. |
| [daily-campaign-desk_helpdoc.md](./daily-campaign-desk_helpdoc.md) | Owner-facing help copy. |
| [daily-campaign-desk_marketing.md](./daily-campaign-desk_marketing.md) | Internal positioning. |
| [daily-campaign-desk_website.md](./daily-campaign-desk_website.md) | Public website content boundaries. |
| [daily-campaign-desk_test-cases.md](./daily-campaign-desk_test-cases.md) | QA and regression checks. |
| [daily-campaign-desk_validation.md](./daily-campaign-desk_validation.md) | Implementation validation report. |

## Implemented Files

| Area | Files |
| --- | --- |
| Product constants | `src/constants/campaigncue/dailyDesk.ts`, `src/constants/campaigncue/index.ts`, `src/constants/campaigncue/navigations.ts` |
| Types | `src/types/campaigncue.ts` |
| Validation | `src/lib/validation/campaigncueSchemas.ts` |
| Shared deterministic builders | `src/lib/campaigncue/dailyDesk.ts`, `src/lib/campaigncue/operatingLoop.ts` |
| Server overview and output fields | `src/lib/campaigncue/server.ts` |
| Owner UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Verification | `scripts/verification/verify-campaigncue-runtime.js`, `scripts/verification/verify-campaigncue-operating-loop.ts` |
