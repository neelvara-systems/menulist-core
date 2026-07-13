# Campaign Pack Output System

**Status:** Implemented for the export/download-first CampaignCue runtime
**Owner promise:** one campaign pack, not scattered generated posts
**Code truth:** `src/types/campaigncue.ts`, `src/lib/campaigncue/dailyDesk.ts`, `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx`

Campaign Pack Output System is the owner-facing output layer for CampaignCue. It packages the current campaign decision, missing inputs, channel copy, manual handoff fields, five-check pack readiness, trust report, Campaign Rhythm, safe-reuse notes, mini-page/QR brief, Campaign Proof Deck brief, result memory prompt, and ZIP bundle manifest into one typed `CampaignCueOutputPack`.

It does not post, send, publish, connect provider accounts, start ad spend, or create a hosted offer page in the current runtime.

## Documents

| Document | Purpose |
| --- | --- |
| [campaign-pack-output-system_spec.md](./campaign-pack-output-system_spec.md) | Product contract and owner workflow. |
| [campaign-pack-output-system_impl.md](./campaign-pack-output-system_impl.md) | Code paths, data flow, and implementation notes. |
| [campaign-pack-output-system_firebase.md](./campaign-pack-output-system_firebase.md) | Firebase cost and storage posture. |
| [campaign-pack-output-system_mobile-support.md](./campaign-pack-output-system_mobile-support.md) | Mobile admission and UX notes. |
| [campaign-pack-output-system_test-cases.md](./campaign-pack-output-system_test-cases.md) | Regression and owner-flow test matrix. |
| [campaign-pack-output-system_marketing.md](./campaign-pack-output-system_marketing.md) | Internal positioning. |
| [campaign-pack-output-system_website.md](./campaign-pack-output-system_website.md) | Public-copy boundaries. |
| [campaign-pack-output-system_helpdoc.md](./campaign-pack-output-system_helpdoc.md) | Owner help article. |
| [campaign-pack-output-system_validation.md](./campaign-pack-output-system_validation.md) | Implementation validation report. |

## Active Output

The current output is a structured ZIP bundle with:

- readable `campaign-pack-summary.md`
- machine-readable `campaign-pack.json`
- decision card
- missing input checklist
- WhatsApp, Google, creative, ads, video, UGC, calendar, staff, email/SMS, and instruction text files when data exists
- print/offline brief
- mini-page and QR content brief
- `proof-deck/campaign-proof-deck.md` with brand snapshot, campaign/social creative set, product/service focus, UGC/reel dialogue/action and shot-plan reference, review checklist, and source trace
- language handoff note with preferred locale and protected facts that must not change during manual translation
- assistant work plan showing where AI can help without deciding campaigns, changing facts, or adding provider/Firebase cost
- `trust/pack-readiness.md` with facts, trust, freshness, approval, and delivery checks; it is not an engagement prediction
- `instructions/campaign-rhythm.md` with the next manual action, due/scheduled counts, follow-up, and safe-reuse candidate
- trust summary
- current-truth reuse notes; old output, approvals, source hashes, and result receipts are never copied into a new pack
- result memory prompt

Rendered PNG/PDF assets appear only when the editor/export pipeline produces them. The proof deck is a markdown/PDF brief for review, not a claimed final rendered PDF. The ZIP never fabricates a binary file that does not exist.
