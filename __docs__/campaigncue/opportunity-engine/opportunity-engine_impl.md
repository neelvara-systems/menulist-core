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
- `POST /api/campaigncue/campaigns` accepts a cue by `opportunityId` and creates the campaign pack.

The current implementation avoids raw event scans and avoids cue-display writes. Cues are recalculated from bounded Business Brain/source facts, readiness warnings, source inputs, asset-rights state, location records, schedule records, and dashboard summary counters. Each cue includes owner benefit, evidence, and a safe action label.

## Acceptance

Restaurant and salon workspaces show scoped cues with clear next actions and no raw prompt as the default path. Agency and multi-location records can be managed in the workspace; location variant cues are generated from active location records without direct provider sync.
