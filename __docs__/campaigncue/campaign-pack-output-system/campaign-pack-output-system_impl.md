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
3. When the owner selects an output focus, the campaign API validates an allowlisted output-intent id, rejects editor-only intents, reevaluates grouped fact requirements, selects a compatible Decision Engine candidate for goal-specific intents, ignores client channel overrides in favor of canonical intent channels, and stores `sourceTemplateId`, `outputIntentId`, and `requestedOutputTypes` inside the existing campaign pack.
4. `buildCampaignCueOutputPack()` derives `CampaignCueOutputPack` from the latest campaign, campaign history, source facts/inputs, pack-aligned missing inputs, trust summary, persisted recipe/decision/output focus, assets, delivery cards, Campaign Rhythm, workspace approval policy, and Business Brain policy/profile data.
5. The builder evaluates current commercial policy against active source inputs, normalizes language policy, derives the presence passport, staff execution steps, one-variable learning suggestion, five-check pack readiness, and persisted campaign freshness. Legacy campaigns without a freshness hash remain explicitly `unknown`.
6. The builder adds `CampaignCueAIAssistancePlan` as a derived assistant work plan with zero additional Firestore reads/writes, Storage writes, or provider calls.
7. `CampaignCueOverview.dailyDesk.outputPack` and `dailyDesk.packReview.outputPack` reach the owner UI without a shape assertion at the producer/consumer boundary.
8. `OutputPackSummary` shows the requested output focus when present, readiness score/checks, prediction boundary, Campaign Rhythm, folders, source freshness, commercial safety, owner-managed presence, protected-language review, staff execution, one-variable learning, mini-page/QR publication status, Campaign Proof Deck status, and result memory.
9. Pack creation is unavailable unless the selected decision is `ready_to_prepare`; the server recomputes the decision, output-intent requirements, and goal compatibility before writing campaign state.
10. `recordAction(..., "export")` builds the ZIP blob locally first, calls the protected export action API, and downloads the ZIP only after the server accepts the action.
11. `buildCampaignPackZipBlob()` uses the existing `jszip` dependency to prepare a browser-local ZIP with `campaign-pack-summary.md`, `campaign-pack.json`, and every `outputPack.downloadBundle.file`; `recordAction(..., "export")` starts the browser download only after the protected server export action succeeds.

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

Local ZIP download remains browser-generated and adds no Storage write. The optional cloud-copy action builds the same deterministic ZIP before calling the separate protected prepare route, uploads through a checksum-bound signed PUT, then finalizes through the existing idempotent campaign action route. See [Durable Cloud Export Archive](../durable-cloud-export-archive/README.md).

## Current Runtime Limits

The output pack includes text, briefs, instructions, and references. It does not create fake binary image/PDF files. Rendered images/PDFs must come from the shared editor export or an existing registered asset.

The Campaign Proof Deck is a markdown/PDF brief inside `CampaignCueOutputPack.proofDeck`. It summarizes Brand Playbook direction, campaign/social creative set, product/service focus, UGC dialogue/action beats, reel shot-plan references, trust checklist, and source trace for owner, agency, or client review. It stays a review artifact until a real renderer/export path creates a final PDF.

The source-to-channel pack is emitted through the existing campaign write. It lets an owner turn the current source-backed campaign cue into the standard WhatsApp, Google/local, creative/print, calendar/manual-task, and result-memory pack. The existing campaign document gains only bounded intent/provenance fields; no new collection or extra write is added. It does not force-select one individual source update, and it does not add blog, podcast, or video repurposing; autopilot distribution; direct posting; posting-time optimization; provider analytics; or Storage objects.

The local creator test brief is emitted through existing UGC/video manual delivery fields and output intent handling. It adds creator-fit questions, a lightweight creator brief, a 3-test plan, flat-fee boundary guidance, disclosure/consent notes, and result-memory prompts. It does not add a creator table, marketplace listing, contract workflow, payment workflow, provider call, Storage object, or new Firestore read/write.

The language handoff is deterministic and cost-free. It records the saved business locale and warns owners/staff/agencies to keep protected facts unchanged during manual translation. It does not generate translated variants or invoke a translation/model provider.

The mini-page/QR object is derived from the pack brief and the already-loaded campaign pointer. A current explicitly published page exposes its opaque slug, relative route path, and absolute URL from the existing local/preview/production deployment matrix; unpublished, expired, missing, or feature-disabled state exposes no public path or URL. The separate Hosted Offer Page service owns publication, trust/freshness/approval gates, cache invalidation, expiry, and no-tracking public rendering, so this derivation adds no read.

Safe result-backed reuse is implemented by `createCampaignCueCampaignServer()`. The server validates that the selected source campaign has a useful owner-reported result and no blocked trust state, resolves the same recipe from the newly computed Decision Engine candidates, requires `ready_to_prepare`, and writes a normal new campaign with current outputs, source snapshot, freshness, trust report, and `ownerApprovalState: "not_requested"`. The old pack remains immutable history.

Legacy pack alignment is conservative: the output pack uses a stored decision only when it belongs to the pack recipe. It does not borrow missing-input questions or decision evidence from a different current recommendation.
