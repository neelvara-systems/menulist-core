# Opportunity Engine — Firebase Cost Tracking

## Collections

Current runtime:

No opportunity collection is written on page load. Cues are calculated from `businessBrains/default` and `sourceSnapshots/current`, then accepted by creating a campaign through `/api/campaigncue/campaigns`.

Logical expansion:

| Collection | Reads | Writes | Guard |
| --- | --- | --- | --- |
| `campaigncueOpportunities` | Home/dashboard cue list | Create/update/dismiss/accept | Query scoped and limited. |
| `campaigncueOpportunitySummaries` | Dashboard summary | Recalculated by job | Use summary docs instead of raw scans. |
| `campaigncueOpportunityRules` | Cached config | Admin/config writes only | Cache safely. |

## Cost Rules

- Recalculate cues through bounded jobs, not on every page render.
- Store cue cooldowns to prevent repeated writes.
- Use source/readiness/analytics summaries.

## Current Pass

Current runtime calculates cues from Business Brain/source context on the server and does not write opportunity docs on page load.

- `GET /api/campaigncue/workspace` returns deterministic cue objects from bounded reads.
- Accepting a cue writes only through `POST /api/campaigncue/campaigns`.
- Raw analytics events are not scanned to render cues.
