# Winning Pack Refresh - Implementation

## Flow

```text
already-loaded campaigns + current deterministic recommendation
  -> bounded eligible-candidate selection
  -> owner chooses Refresh safely
  -> existing create-campaign route with reuseCampaignId
  -> server validates source campaign and exact current recipe
  -> current Decision Engine and missing-input gates rerun
  -> current source snapshot and Trust Center report rebuilt
  -> new campaign saved with root/generation provenance
  -> response merged locally
```

## Code Map

| Responsibility | Location |
| --- | --- |
| Feature gate | `src/config/features.ts` |
| Candidate selection and owner context | `src/lib/campaigncue/operatingLoop.ts` |
| Durable campaign fields | `src/types/campaigncue.ts` |
| Persisted boundary | `src/lib/campaigncue/recordBoundary.ts` |
| Authoritative refresh creation | `src/lib/campaigncue/server.ts` |
| Owner controls | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Regression suite | `scripts/verification/test-campaigncue-winning-pack-refresh.ts` |

## Provenance

- `reusedFromCampaignId`: immediate source pack.
- `reuseRootCampaignId`: first source in the refresh chain.
- `refreshGeneration`: bounded number of refresh hops.
- `reuseMode`: always `rebuild_from_current_truth`.
- `sourceTemplateId`: retained only as template provenance; current facts are hydrated again.

No campaign-chain reads are needed because root and generation are written on the new pack.
