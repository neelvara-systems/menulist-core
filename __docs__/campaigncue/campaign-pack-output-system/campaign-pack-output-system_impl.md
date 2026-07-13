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
3. `buildCampaignCueOutputPack()` derives `CampaignCueOutputPack` from the latest campaign, campaign history, source facts/inputs, pack-aligned missing inputs, trust summary, persisted recipe/decision, assets, delivery cards, Campaign Rhythm, workspace approval policy, and Business Brain policy/profile data.
4. The builder evaluates current commercial policy against active source inputs, normalizes language policy, derives the presence passport, staff execution steps, one-variable learning suggestion, five-check pack readiness, and persisted campaign freshness. Legacy campaigns without a freshness hash remain explicitly `unknown`.
5. The builder adds `CampaignCueAIAssistancePlan` as a derived assistant work plan with zero additional Firestore reads/writes, Storage writes, or provider calls.
6. `CampaignCueOverview.dailyDesk.outputPack` and `dailyDesk.packReview.outputPack` reach the owner UI without a shape assertion at the producer/consumer boundary.
7. `OutputPackSummary` shows the readiness score/checks, prediction boundary, Campaign Rhythm, folders, source freshness, commercial safety, owner-managed presence, protected-language review, staff execution, one-variable learning, mini-page/QR brief status, Campaign Proof Deck status, and result memory.
8. Pack creation is unavailable unless the selected decision is `ready_to_prepare`; the server recomputes the decision and rejects non-ready decisions before writing campaign state.
9. `recordAction(..., "export")` builds the ZIP blob locally first, calls the protected export action API, and downloads the ZIP only after the server accepts the action.
10. `buildCampaignPackZipBlob()` uses the existing `jszip` dependency to prepare a browser-local ZIP with `campaign-pack-summary.md`, `campaign-pack.json`, and every `outputPack.downloadBundle.file`; `recordAction(..., "export")` starts the browser download only after the protected server export action succeeds.

Manual delivery field copies in `CampaignCueWorkspaceApp` remain browser-local. Copied feedback appears only after Clipboard API success or acknowledged textarea fallback success, and failed handoffs log `campaigncue_handoff_copy_failed` with clipboard/fallback support booleans plus copied value length only.

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
- `trust/pack-readiness.md`
- `trust/operating-and-commercial-check.txt`
- `instructions/use-this-campaign.md`
- `instructions/local-presence-passport.md`
- `instructions/language-handoff.txt`
- `instructions/assistant-work-plan.md`
- `instructions/campaign-rhythm.md`
- `result/result-memory.txt`
- `result/next-one-variable-test.txt`
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

Safe result-backed reuse is implemented by `createCampaignCueCampaignServer()`. The server validates that the selected source campaign has a useful owner-reported result and no blocked trust state, resolves the same recipe from the newly computed Decision Engine candidates, requires `ready_to_prepare`, and writes a normal new campaign with current outputs, source snapshot, freshness, trust report, and `ownerApprovalState: "not_requested"`. The old pack remains immutable history.

Legacy pack alignment is conservative: the output pack uses a stored decision only when it belongs to the pack recipe. It does not borrow missing-input questions or decision evidence from a different current recommendation.
