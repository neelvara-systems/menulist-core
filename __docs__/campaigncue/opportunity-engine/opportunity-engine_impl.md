# Opportunity Engine — Implementation Plan

## Service

`OpportunityService` reads Business Brain summaries, source snapshots, asset readiness, calendar context, and analytics summaries. It must not scan raw events on page load.

## Data

| Entity | Fields |
| --- | --- |
| Opportunity | `workspaceId`, `businessBrainId`, `agencyClientId`, `locationId`, `type`, `priority`, `sourceReferences`, `status`, `createdAt` |
| OpportunityRule | `vertical`, `sourceType`, `trigger`, `minimumConfidence`, `cooldown`, `outputDefaults` |

## APIs

Current runtime:

- `GET /api/campaigncue/workspace` returns deterministic cues from Business Brain, source inputs, asset rights, schedules, locations, and analytics summaries without writing raw cue rows on page load.
- The same overview response returns `dailyDesk`, computed from the generated cues plus campaigns, assets, locations, schedules, and results. This gives the owner one recommended action, missing-input prompts, manual delivery tasks, asset-reuse prompts, print/photo tasks, ready-pack controls, and result-memory prompts without an extra Firestore read.
- `POST /api/campaigncue/campaigns` accepts a cue by `opportunityId` and creates the campaign pack.

The current implementation avoids raw event scans and avoids cue-display writes. Cues are recalculated from bounded Business Brain/source facts, readiness warnings, source inputs, asset-rights state, location records, schedule records, and dashboard summary counters. Each cue includes owner benefit, evidence, and a safe action label. Daily Campaign Desk uses the top cue as an action source, but it can route the owner to missing details, a ready pack, results, approval, or locations when that is more useful than creating a new pack.

## Acceptance

Restaurant, salon, retail, local-service, fitness, clinic, and other local-business workspaces show scoped cues/recipes with clear next actions and no raw prompt as the default path. Agency and multi-location records can be managed in the workspace; location variant cues are generated from active location records without direct provider sync.
