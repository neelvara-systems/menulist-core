# Campaign Pack Output System — Test Cases

## Static Guards

- `CampaignCueOutputPack` type exists.
- Daily Desk builder calls `buildCampaignCueOutputPack()`.
- `outputPack.downloadBundle.files` exists.
- `outputPack.proofDeck` exists and `proof-deck/campaign-proof-deck.md` is present in the bundle.
- `outputPack.readiness` contains exactly five bounded checks and `trust/pack-readiness.md` is present.
- `outputPack.rhythm` exists and `instructions/campaign-rhythm.md` is present.
- Owner UI includes `OutputPackSummary`.
- ZIP path includes `campaign-pack-summary.md` and `campaign-pack.json`.
- Verifier rejects direct publish/send/provider wording.

## Owner Flow Tests

| Case | Expected |
| --- | --- |
| Pack exists with clear trust | Output pack shows Ready and ZIP downloads. |
| Missing required input exists | Output pack marks missing-input files as Needs input. |
| Trust warning exists | Trust report and summary show Needs review. |
| Trust blocked exists | Output pack marks blocked reasons and export action remains server-gated. |
| Agency pack not approved | Approval readiness is zero, public-use actions are blocked, and approve/reject only resolve a requested approval. |
| Competing approval decisions | Transaction rechecks waiting state; the first decision wins and the other receives a conflict. |
| Closed/already-approved pack | New approval request is unavailable and rejected server-side. |
| Readiness score shown | Score measures facts, trust, freshness, approval, and manual handoff only; copy explicitly rejects engagement/reach prediction. |
| Useful past result | Rhythm nominates the source campaign and reuse creates a new current-truth pack with provenance only. |
| Old campaign used or archived | It does not create a stale agency approval reminder. |
| Legacy pack without stored decision | It never borrows decision evidence or missing-input questions from a different recipe. |
| WhatsApp output exists | ZIP includes WhatsApp message/status/reply/catalog reminder files. |
| Google output exists | ZIP includes title/description/date/link/terms files. |
| Page not published, unpublished, or expired | ZIP includes the mini-page/QR brief but no public path claim. |
| Current page explicitly published | Pack and ZIP retain the opaque published slug, route path, and current-stage absolute URL; they never invent a second slug. |
| Brand Playbook exists | ZIP includes Campaign Proof Deck brief with brand system, creative set, focus, UGC/reel dialogue-action and shot-plan references, checklist, and source trace. |
| UGC/video output exists | ZIP includes creator persona, camera plan, product-placement, dialogue/action beats or B-roll checklist, consent, and disclosure handoff fields. |
| Brand Playbook is missing | Proof deck is Needs review, not blocked, and campaign output can still proceed if other trust gates allow it. |
| No rendered visual exists | ZIP includes image/print briefs, not fake PNG/PDF binaries. |
| Result options exist | ZIP includes result-memory file and UI keeps one-tap result actions. |
| Cloud copy enabled | Same deterministic ZIP can be checksum-validated, saved, replaced through two rotating slots, and downloaded through the current generation only. |
| Cloud copy unavailable | Local ZIP download remains available and no archive pointer is written. |
| Owner selects an output focus | Campaign stores canonical intent id, requested output types, and optional source-template provenance; Output Pack summary and bundle manifest retain the focus. |
| Output focus has missing grouped facts | Browser routes to Missing Input Inbox and server independently rejects a forged request. Any confirmed alternative can satisfy an any-of group. |
| Goal-specific focus conflicts with current decisions | A compatible Decision Engine candidate is selected, or creation is rejected; the system never relabels an unrelated recipe. |
| Client tampers with channels | Server uses canonical channels from the allowlisted output intent. |
| Unknown intent/unknown request field | Strict campaign-create schema rejects the request. |
| Reuse/custom-size intent sent to campaign API | Server rejects it; owner flow uses CueLayers/shared editor. |
| Reuse campaign combined with template/output intent | Schema rejects the conflicting request modes. |

## Commands

```bash
npm run verify:campaigncue-operating-loop
npm run verify:campaigncue
npx tsc --noEmit --incremental false --pretty false
npm run lint
git diff --check
```
