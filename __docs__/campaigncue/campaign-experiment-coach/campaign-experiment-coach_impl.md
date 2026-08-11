# Campaign Experiment Coach - Implementation

## Flow

```text
Business Brain + recipe + assets + bounded campaign history
  -> buildCampaignCueExperimentSuggestion
  -> Campaign Pack stores deterministic suggestion
  -> existing campaign-action API accepts accept_experiment
  -> transaction re-reads current campaign and role/agency gates
  -> campaign pack becomes accepted + audit event + idempotency result
  -> existing record_outcome action stores only an explicitly selected variable
  -> pure lifecycle helper completes only a matching accepted test
```

## Code Map

| Responsibility | Location |
| --- | --- |
| Feature flag | `src/config/features.ts` |
| Campaign action constant | `src/constants/campaigncue/delivery.ts` |
| Durable types | `src/types/campaigncue.ts` |
| Suggestion builder | `src/lib/campaigncue/operatingLoop.ts` |
| Pure acceptance/completion rules | `src/lib/campaigncue/experimentCoach.ts` |
| Persisted runtime parser | `src/lib/campaigncue/recordBoundary.ts` |
| Request validation | `src/lib/validation/campaigncueSchemas.ts` |
| Role, agency, idempotency, transaction, and audit path | `src/lib/campaigncue/server.ts` |
| Owner review and result UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Regression suite | `scripts/verification/test-campaigncue-experiment-coach.ts` |

Old campaign records containing only `variable`, `instruction`, and `reason` remain valid and are interpreted as `suggested`. Fabric JSON, provider payloads, and model output do not enter this contract.
