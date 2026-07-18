# Configuration Safety Implementation

## Source flags

`src/config/features.ts` is the app registry. `isFeatureEnabled()` returns true
only for boolean entries. Non-boolean configuration values are read through
typed access. These constants are compiled into the deployed artifact.

MenuList Functions use `functions/src/constants/features.ts`. Optional
`FEATURE_NAME_ENABLED` overrides accept `true`, `1`, `yes`, `on`, `false`,
`0`, `no`, or `off` case-insensitively. Any other configured value fails
closed. An absent override preserves the source default.

## Deployment identity

`src/constants/deploymentTargets.ts` resolves local, preview, and production.
Vercel's server marker is authoritative on Vercel; public markers must agree
with it. Unknown values and public/server conflicts return an explicit error
code. `next.config.js` publishes the canonical resolved public marker.

`src/lib/env/validateEnv.ts` compares each configured Firebase project to the
resolved product/stage target and checks complete credential tuples without
logging values. The validator is invoked by `src/instrumentation.ts`.

## CampaignCue model rollout

`src/lib/campaigncue/cue-layers/modelRegistry.ts` no longer treats a non-empty
`"false"` string as true. Premium enablement uses explicit boolean parsing;
segmentation requires an actual model identifier. Rollout values are finite
and clamped to 0–100. A 1–99 rollout is selectable only when the caller supplies
a stable bucket from 0 through 99; missing bucket fails closed.

This registry is a capability boundary. It does not itself authorize a
provider call, paid spend, or public release.
