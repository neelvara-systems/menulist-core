# Campaign Pack Output System — Test Cases

## Static Guards

- `CampaignCueOutputPack` type exists.
- Daily Desk builder calls `buildCampaignCueOutputPack()`.
- `outputPack.downloadBundle.files` exists.
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
| WhatsApp output exists | ZIP includes WhatsApp message/status/reply/catalog reminder files. |
| Google output exists | ZIP includes title/description/date/link/terms files. |
| No hosted mini-page route | ZIP includes mini-page/QR brief only, not a public URL claim. |
| No rendered visual exists | ZIP includes image/print briefs, not fake PNG/PDF binaries. |
| Result options exist | ZIP includes result-memory file and UI keeps one-tap result actions. |

## Commands

```bash
node scripts/verification/verify-campaigncue-runtime.js
npx tsc --noEmit --incremental false --pretty false
npm run lint
git diff --check
```
