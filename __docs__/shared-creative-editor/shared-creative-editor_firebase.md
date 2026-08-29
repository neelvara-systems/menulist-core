# Shared Creative Editor - Firebase Notes

## Base Editor

The shared base editor performs no Firebase reads, writes, deletes, listeners, Cloud Functions, or Storage uploads. Fabric editing, product tool/workspace allowlists, initial selection/drawer configuration, readiness scans, local recovery drafts, contextual toolbar actions, drawer search, recent insertions, My Stuff upload/recent display, project style presets, ready-made text templates, Brand Kit quick picks, text placeholders, page controls, floating selected-layer toolbar actions, Active Layers drag reorder, and optional template-save button rendering are browser-local until a product adapter calls a product-owned save/export callback.

AI suggestion text copy and Base64 PNG text copy are browser-local clipboard handoffs. They use Clipboard API success or acknowledged textarea fallback success before showing copied feedback, and failed diagnostics record support booleans plus text length only. They add no Firestore reads/writes/deletes, Storage operations, provider calls, Cloud Function logic, rules, indexes, Firebase deploy requirement, or Vercel deploy action.

## Product Adapter Rule

Each product must own its own persistence.

| Product | Persistence rule |
| --- | --- |
| CampaignCue | Save export metadata through CampaignCue Asset Library and CampaignCue Firebase only. |
| MenuList | MenuList adapter must use MenuList-owned DAL/API paths, MenuList media image Storage paths, MenuList AI accounting, and public menu/OBP cache invalidation; it cannot write CampaignCue documents. |
| Answerlattice | Future adapter must use Answerlattice tenant shape and Firebase boundary. |

## CampaignCue Current Writes

| Action | Reads | Writes | Notes |
| --- | --- | --- | --- |
| Open blank editor | 0 | 0 | Uses already-loaded CampaignCue overview data in the client. |
| Open campaign output in editor | 0 | 0 | Uses already-loaded campaign output data. |
| Edit layers/properties, including contextual toolbar, floating toolbar, and Active Layers reorder actions | 0 | 0 | Browser state only. |
| Search drawer, use My Stuff, apply Styles, add ready-made text templates, use Brand Kit, add placeholders, add/switch/duplicate/lock pages | 0 | 0 | Uses static local template JSON, the current document metadata, and already-loaded adapter asset sources. |
| Download SVG/PNG/JSON | 0 | 0 | Browser download only. |
| Register exported asset | 1 workspace guard read | 1 asset write + 1 event write | Existing `POST /api/campaigncue/assets` path. |
| Save as template through product callback | Product-owned | Product-owned | The shared editor provides document + optional preview only; MenuList printable assets use the MenuList-owned template registry DAL. |

## Storage

Day-one editor export is browser download/manual handoff. It does not upload the exported file to Storage.

Future Storage upload must use product-owned prefixes:

- CampaignCue: `campaigncue/assets/{workspaceId}/...`
- MenuList: MenuList-owned project/store prefix.
- Answerlattice: Answerlattice-owned tenant/product prefix.

## Cost Guardrails

- Do not write on every drag or property edit.
- Do not write from contextual toolbar, drawer search, My Stuff, Styles, ready-made text template, Brand Kit, placeholder, page, floating toolbar, or Active Layers reorder actions unless a product-owned explicit save path is invoked.
- Do not write platform/default templates when the owner only opens, previews, customizes, or downloads them.
- Do not embed base64 files in Firestore.
- Do not open realtime listeners for editor state.
- Persist compact document JSON only after an explicit save path exists.
- Keep rendered binary files in Storage, not Firestore.

## Security

- Product adapters must validate input before writes.
- Product adapters must verify workspace/tenant access.
- Rights and consent metadata stay product-owned.
- Public export links must be explicit and revocable.
