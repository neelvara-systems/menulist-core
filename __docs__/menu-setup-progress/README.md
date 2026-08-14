# Menu Setup Progress

**Status:** Local source complete; app/browser evidence pending
**Flags:** `ENABLE_MENU_SETUP_PROGRESS`, `ENABLE_LOCATION_LAUNCH_READINESS`
**Last reviewed:** August 14, 2026

Menu Setup Progress is one pure owner-side computation over the selected project, already-loaded store details, Menu Quality signals, and starter activation evidence. It adds no setup document, API route, listener, queue, or Function.

When `ENABLE_LOCATION_LAUNCH_READINESS` is on and the current project/store is an outlet, the same computation is presented as **Locations · Menu setup**. This is Location Launch Readiness: one next customer-menu readiness step for the current location, not a second checklist or franchise operations product.

## Current required path

1. **Source added** only when a real selected project with a non-empty `projectId` is loaded. Store `onboardingSource` alone does not impersonate project truth.
2. **Menu imported** only when active extracted items exist. Categories without active items remain incomplete.
3. **Key details checked** when active items exist and current price/price-outlier quality signals are clear.
4. **Menu published** only when `lastPublishedAt` is a valid supported timestamp. Malformed or throwing legacy timestamp adapters fail closed.
5. **Link placed/ready** after publish. Starter stores require the existing two distinct validated activation actions; non-starter stores preserve the current published-link-ready behavior.

Descriptions, images, translations, official-page links, and public photos remain optional hints while required setup is still open. **Translations ready** appears only when the selected project has a translation/project-content quality signal. Optional work does not keep the setup card alive after publish-and-placement completes.

## Surfaces

- Desktop owner dashboard card.
- Mobile Menu card.
- Mobile Share card after publication.
- One Mobile More root shortcut while setup remains incomplete.

All mobile actions stay inside MobileShell through current callbacks. The summary hides when required setup is complete; optional quality/profile work remains available in its normal feature surfaces.

Location Launch Readiness follows the same suppression rule. A completed location does not keep a permanent progress card, and HQ does not receive a new approval queue or cross-location audit workflow.

## Data and recovery

- Desktop loads at most one selected project document for Menu Setup Progress and Menu Check, with the existing 10-minute SWR dedupe window. If Menu Check is disabled, the progress feature can be the reason for that one bounded read.
- Mobile reuses `MobileProjectsProvider`; More waits for provider loading to finish and adds no separate query.
- Malformed project files/items, invalid timestamps, and invalid activation timestamps fail incomplete instead of breaking the owner screen.
- Late acknowledgements are applied only when the current store still matches the acknowledged store.

Previous narratives are preserved in [`_archive/pre-2026-07-16/`](./_archive/pre-2026-07-16/).
