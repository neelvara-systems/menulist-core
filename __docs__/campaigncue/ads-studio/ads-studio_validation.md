# Ads Studio - Validation

## Verdict

**Current runtime:** ready for source-backed ad-pack preparation and manual owner/agency handoff.

**Meta Ads MCP:** useful as a future read-first provider adapter, but intentionally not implemented or advertised as active.

## Verified Current Boundaries

- Meta's official Ads MCP overview was reviewed on July 18, 2026.
- `CAMPAIGNCUE_META_ADS_MCP_POSTURE` records reporting, activity logs, signal/dataset health, and help/troubleshooting as the first candidate capabilities.
- Ad creation/editing, budget or spend change, catalog mutation, and experiment mutation are explicitly blocked.
- CampaignCue publishing remains disabled.
- `/api/campaigncue/integrations` remains read-only posture.
- No CampaignCue MCP client/import, OAuth flow, provider token, Meta network call, provider-connection read, provider metric write, Storage object, Cloud Function, webhook, listener, or scheduler was added. Unrelated MCP dependencies elsewhere in the monorepo do not create a CampaignCue provider path.
- Ads Studio documentation no longer implies that connected publishing is active when a workspace is configured.
- Firebase guidance uses a future single compact lazy summary instead of five assumed Ads Studio collections or raw provider streams.

## Activation Blockers

- Meta app/scopes and tool-level read restrictions must be verified against the current provider contract.
- Server-only authorization, encrypted token ownership, revocation, tenant/ad-account mapping, rate limits, response validation, caching, and observability are not implemented.
- Provider evidence normalization and the exact compact summary schema are not implemented.
- No authenticated provider smoke test has been run.
- Any ad mutation remains a separate high-risk product decision and is not approved by this validation.

## Validation Evidence

- `node scripts/verification/verify-campaigncue-runtime.js` passed with 1,761 checks.
- `npx eslint src/constants/campaigncue/delivery.ts scripts/verification/verify-campaigncue-runtime.js` passed.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm run verify:campaigncue` passed, including CampaignCue asset/CueLayers/template/PWA/operating-loop/Pattern Cue checks plus Firestore and Storage emulator rules.
- `npm run docs:check-links` found zero broken links. Its 31 naming warnings are pre-existing video-document filenames outside CampaignCue Ads Studio.
- `git diff --check` passed for the affected files.
