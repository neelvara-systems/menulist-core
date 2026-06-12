# Shared Creative Editor - Firebase Notes

## Base Editor

The shared base editor performs no Firebase reads, writes, deletes, listeners, Cloud Functions, or Storage uploads. Fabric editing is browser-local until a product adapter calls a product-owned save/export callback.

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
| Edit layers/properties | 0 | 0 | Browser state only. |
| Download SVG/PNG/JSON | 0 | 0 | Browser download only. |
| Register exported asset | 1 workspace guard read | 1 asset write + 1 event write | Existing `POST /api/campaigncue/assets` path. |

## Storage

Day-one editor export is browser download/manual handoff. It does not upload the exported file to Storage.

Future Storage upload must use product-owned prefixes:

- CampaignCue: `campaigncue/assets/{workspaceId}/...`
- MenuList: MenuList-owned project/store prefix.
- Answerlattice: Answerlattice-owned tenant/product prefix.

## Cost Guardrails

- Do not write on every drag or property edit.
- Do not embed base64 files in Firestore.
- Do not open realtime listeners for editor state.
- Persist compact document JSON only after an explicit save path exists.
- Keep rendered binary files in Storage, not Firestore.

## Security

- Product adapters must validate input before writes.
- Product adapters must verify workspace/tenant access.
- Rights and consent metadata stay product-owned.
- Public export links must be explicit and revocable.
