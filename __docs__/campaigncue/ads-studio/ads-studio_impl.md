# Ads Studio - Implementation

## Runtime Contract

Ads Studio currently prepares ad-pack output inside the existing CampaignCue campaign document and manual Campaign Pack ZIP. It performs no ad-account connection, Meta MCP call, provider metric import, ad creation, ad edit, catalog mutation, experiment mutation, or spend mutation.

## Flow

1. Load campaign, creative assets, CTA, destination, and business facts.
2. Generate ad copy variants and audience notes.
3. Add budget recommendation and UTM plan.
4. Run Creative Trust Center policy checks.
5. Owner approves the ad pack.
6. Export to owner/agency for manual setup.
7. Store compact owner-reported results through the existing campaign result-memory path.

## Active Data Objects

| Object | Purpose |
| --- | --- |
| `CampaignCueCampaign.outputs` | Existing `ad_handoff` copy, destination, UTM, audience, budget, policy, approval, and manual-step fields. |
| `CampaignCueCampaign.trustGate` | Existing campaign/output safety gate. |
| `CampaignCueCampaign.resultMemory` | Existing bounded owner-reported result receipt. |
| `CampaignCueDeliveryPolicy` and provider posture | Existing response-derived manual-only contract. |

There is no active `adPacks`, `adPolicyReports`, `adProviderConnections`, `adPublishJobs`, or `adPerformanceSnapshots` collection in the current runtime.

## Future Meta Ads MCP Adapter

`CAMPAIGNCUE_META_ADS_MCP_POSTURE` is the code source of truth for the validated but disabled connector direction.

The activation order is:

1. reporting,
2. activity logs,
3. signal and dataset health,
4. help and troubleshooting.

Catalog management and experiment/lift capabilities remain advanced candidates. Ad creation/editing, budget or spend changes, catalog mutation, and experiment mutation remain blocked.

A future adapter must:

- run server-side only,
- validate every MCP response into a provider-neutral schema,
- use a deterministic read-tool allowlist rather than free-form model tool selection,
- require explicit owner account and ad-account selection,
- enforce workspace role and tenant scope before every provider operation,
- keep tokens outside Firestore,
- use bounded timeout/retry behavior,
- write only a compact lazy-loaded summary when the owner requests or schedules a refresh,
- preserve manual ad-pack handoff when Meta is unavailable.

## API Boundary

- Provider adapters must isolate Google Ads and Meta Ads logic.
- The active `/api/campaigncue/integrations` route remains read-only posture and performs no Meta call.
- Provider metric import is not an accepted campaign action in the current schema.
- Any future mutation route must be separate from reporting, require idempotency and a reviewable preview, and remain disabled while `ENABLE_CAMPAIGNCUE_PUBLISHING` is false.
- Spend-changing actions require a new explicit owner approval, elevated role, visible amount/currency, cap, and reconciliation contract.
- API errors must preserve manual handoff output.

## Acceptance

- Owner can create and export an ad pack without ad account connection.
- The system never starts spend from generation alone.
- Current CampaignCue server and browser code import no MCP client and contain no Meta MCP network call.
- Current overview and integrations responses add no provider-connection Firestore read.
- Future provider evidence cannot become business truth or silently change a campaign decision.
