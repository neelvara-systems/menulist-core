# Campaign Operating Loop - Validation

## Approved Scope Cross-Check

| Requested capability | Implemented contract |
| --- | --- |
| Owner Pulse | Business state, capacity, stock, local moment, note, and validity window in Business Brain and Daily Desk. |
| Commercial Safety Gate | Promotion, discount, maximum discount, minimum price, capacity/stock, and do-not-promote checks in deterministic decision and Trust Center flow. |
| Pack expiry/drift guard | Persisted order-independent source hash plus earliest recipe/pulse/current-input expiry and server recheck before download, export, cloud archive, mark used, and schedule. |
| Campaign Receipt | Owner signal, optional time and counts, note, variable, and `owner_reported` confidence on the campaign. |
| One-variable learning | Deterministic channel/timing/offer/photo/CTA/format suggestion in decision and output pack. |
| Review/reputation pack | Dedicated recipe/opportunity, verified HTTP(S) destination, real completed-interaction note, honest-review policy, and staff/counter handoff. |
| Return-customer pack | Dedicated recipe/opportunity with non-identifying owner-managed audience, contact-payload rejection, and manual-send boundary. |
| Local Presence Passport | Derived profile list from Business Brain with no connection or update behavior. |
| Protected local-language packs | Target locale list and protected-fact handoff; no automatic translation claim or provider call. |
| Staff execution/local signals | Assignee/task metadata on existing schedule plus local/seasonal owner pulse evidence. |
| Campaign Rhythm | Derives approval, time-sensitive due task, missing result, future schedule, ready pack, safe reuse, or prepare-next from the already-loaded bounded campaign/schedule lists. |
| Pack readiness | Five deterministic checks cover facts, trust, freshness, approval, and manual handoff; copy rejects performance prediction. |
| Safe campaign reuse | Useful result can nominate a recipe, but server creation rebuilds from current candidates/facts and carries provenance only. |
| Approval lifecycle | Request/approve/reject reuse one deterministic document per campaign and agency public use requires approved state. |

## Architecture Cross-Check

- Existing CampaignCue Firebase project and route guards retained.
- Existing collections retained.
- Deterministic rules remain campaign authority.
- Shared Creative Editor remains product-neutral.
- Firestore holds compact state; derived output pack remains response/browser state.
- Export/download remains the delivery boundary.
- No signed URL, base64, customer contact list, Fabric runtime truth, or provider credential enters these new fields.

## Post-Implementation Parity Audit - July 11, 2026

| # | Area | Classification | Finding | Resolution |
| ---: | --- | --- | --- | --- |
| 1 | Export security | Mismatch | The editor header started a ZIP download before the protected server export gate completed. | Removed the standalone download helper and routed editor export through `recordAction(..., "export")`; download now starts only after server acceptance. |
| 2 | Result targeting | Mismatch | Campaign Rhythm and pack-row result actions could open Results without retaining the intended campaign, causing the newest pack to receive the result. | Added campaign-specific result selection and routed Rhythm, pack-row, Daily Desk, and editor result actions through it. |
| 3 | Result validation | Missing | Result submission could run without a selected signal and could retain another campaign's note, metrics, or default tested variable. | Disabled submission until a result is selected, cleared drafts when the target changes, and made the tested variable explicitly optional. |
| 4 | Rhythm freshness | Mismatch | A generated pack with stale, expired, or unknown freshness could be labeled `pack_ready`. | `pack_ready` now requires a current evaluated freshness receipt. |
| 5 | Approval readiness | Drift | An approved non-agency pack displayed that no approval gate was active. | Approval readiness now reflects every non-default approval state and says the pack is approved. |
| 6 | Approval lifecycle | Drift | Re-requesting a rejected pack overwrote the deterministic approval document's original `createdAt`. | Initial creation time is written only on the first request; re-request updates lifecycle fields without another read. |
| 7 | Duplicate operations | Missing | Rapid repeated clicks could create duplicate schedule, approval, export, mark-used, or result requests with new idempotency keys. | Shared busy guards now disable related actions while the first request is active. |
| 8 | Documentation | Drift | The spec retained an older Rhythm priority and the implementation doc called approval resolution a batch. | Updated spec, implementation, Firebase, tests, and validation to match current transaction/runtime behavior. |
| 9 | Campaign action concurrency | Defect | Ordinary actions derived counters and result memory from a campaign read performed before the write batch, allowing different valid requests to overwrite concurrent state. | Actions now re-read and derive from current campaign truth inside one Firestore transaction with event, summary, optional schedule, and retry completion. |
| 10 | Retry identity | Defect | Shared idempotency records were bound only to the action name, so another actor or changed payload using the same key could replay the wrong outcome. | Records now bind action, authenticated actor, and canonical SHA-256 request hash; changed identity and in-progress records fail closed. |
| 11 | Firebase read cost | Improvement | Adding a final transaction initially duplicated the old campaign/source preflight reads. | The obsolete preflight was removed. Ordinary actions use one transactional campaign read; workspace/source reads occur only for public-use safety checks. |

**Result:** 11 findings, all fixed locally. No new route, collection, listener, Storage object, provider call, or direct-posting path was added.

## Current Source Evidence - July 13, 2026

- `npm run verify:campaigncue` passed: 1,720 runtime checks, all CueLayers and pack-template boundary suites, 273 PWA asset checks, 123 operating-loop checks, and Firestore/Storage emulator suites.
- `npx tsc --noEmit --pretty false` passed.
- Scoped ESLint passed for the idempotency boundary, CampaignCue server, and operating-loop verifier.
- `npm run docs:check-links` passed across 2,358 markdown files and 4,253 internal links with zero broken links; the existing uppercase `videos/frame-presets/menulist/FRAME.md` naming warning remains outside this feature.
- CampaignCue docs wording was cross-checked against the active export/download/manual-handoff boundary. Older provider/publishing wording now describes only separately enabled provider layers, not current runtime behavior.
- Public-site browser QA passed through the local network address at `1280x720` and `390x844`: correct CampaignCue title/headings, safe-reuse FAQ present, no horizontal overflow, and no console warning/error.
- The protected app route invoked the shared CampaignCue auth handoff. The external `menulist.ai/lander` target returned `403` in this local environment, so authenticated Daily Desk behavior is not claimed by this browser run.
- `npm run build` was not run because production builds are opt-in for this repo.

## Remaining External Evidence

- Authenticated browser QA against a configured CampaignCue Firebase project.
- Mobile device QA for date-time entry and long destination URLs.
- Authenticated owner-role and reviewer-role browser QA for request/approve/reject, manual reminder creation, and safe reuse.
- Deployed shared-auth handoff smoke on the final CampaignCue and MenuList domains.
- Staging deployment and production-host smoke.
- Real owner validation of recipe usefulness and wording.

These are release-evidence tasks, not missing source implementation.
