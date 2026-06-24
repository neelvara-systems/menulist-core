# Campaign Pack Output System — Implementation

## Code Truth

| Contract | File |
| --- | --- |
| Output pack types | `src/types/campaigncue.ts` |
| Derived output pack builder | `src/lib/campaigncue/dailyDesk.ts` |
| Owner summary and ZIP export | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Regression guard | `scripts/verification/verify-campaigncue-runtime.js` |

## Data Flow

1. `loadCampaignCueOverviewServer()` loads the existing bounded overview.
2. `buildCampaignCueDailyDesk()` builds decision, ready pack, pack review, trust summary, and manual delivery cards from in-memory data.
3. `buildCampaignCueOutputPack()` derives `CampaignCueOutputPack` from the latest campaign, source facts, missing inputs, trust summary, recipe, assets, delivery cards, and Business Brain Brand Playbook.
4. `CampaignCueOverview.dailyDesk.outputPack` and `dailyDesk.packReview.outputPack` reach the owner UI.
5. `OutputPackSummary` shows readiness counts, folders, mini-page/QR brief status, Campaign Proof Deck status, and result memory.
6. Pack creation is unavailable unless the selected decision is `ready_to_prepare`; the server recomputes the decision and rejects non-ready decisions before writing campaign state.
7. `recordAction(..., "export")` builds the ZIP blob locally first, calls the protected export action API, and downloads the ZIP only after the server accepts the action.
8. `buildCampaignPackZipBlob()`/`downloadCampaignPackZip()` use the existing `jszip` dependency to create a browser-local ZIP with `campaign-pack-summary.md`, `campaign-pack.json`, and every `outputPack.downloadBundle.file`.

## ZIP Contents

The bundle root is `{campaign-title}-campaign-pack`.

Current files include:

- `campaign-pack-summary.md`
- `campaign-pack.json`
- `decision/decision-card.md`
- `missing-inputs/missing-input-checklist.txt`
- channel folders from manual delivery fields
- `print/print-formats-and-qr-card-brief.md`
- `proof-deck/campaign-proof-deck.md`
- `trust/trust-summary.md`
- `instructions/use-this-campaign.md`
- `instructions/language-handoff.txt`
- `result/result-memory.txt`
- `reuse/reuse-this-pack.txt`
- `bundle-manifest.json`

The ZIP is generated in the browser after the server records the export action. It does not add a new API, Cloud Function, or Storage write.

## Current Runtime Limits

The output pack includes text, briefs, instructions, and references. It does not create fake binary image/PDF files. Rendered images/PDFs must come from the shared editor export or an existing registered asset.

The Campaign Proof Deck is a markdown/PDF brief inside `CampaignCueOutputPack.proofDeck`. It summarizes Brand Playbook direction, campaign/social creative set, product/service focus, UGC dialogue/action beats, reel shot-plan references, trust checklist, and source trace for owner, agency, or client review. It stays a review artifact until a real renderer/export path creates a final PDF.

The source-to-channel pack is emitted through existing output intent handling. It lets an owner turn the current source-backed campaign cue into the standard WhatsApp, Google/local, creative/print, calendar/manual-task, and result-memory pack. It does not force-select one individual source update, and it does not add blog, podcast, or video repurposing; autopilot distribution; direct posting; posting-time optimization; provider analytics; Storage objects; or new Firestore reads/writes.

The local creator test brief is emitted through existing UGC/video manual delivery fields and output intent handling. It adds creator-fit questions, a lightweight creator brief, a 3-test plan, flat-fee boundary guidance, disclosure/consent notes, and result-memory prompts. It does not add a creator table, marketplace listing, contract workflow, payment workflow, provider call, Storage object, or new Firestore read/write.

The language handoff is deterministic and cost-free. It records the saved business locale and warns owners/staff/agencies to keep protected facts unchanged during manual translation. It does not generate translated variants or invoke a translation/model provider.

The mini-page/QR object is a brief and content contract only. Hosted public mini-page publishing needs a later explicit route, approval, tracking, and cache/security contract before activation.
