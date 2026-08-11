# Vertical Campaign Playbooks - Implementation

## Flow

```text
Business Brain business type
  -> static vertical playbook
  -> matching deterministic recipes
  -> Decision Engine scoring
  -> missing-input and trust gates
  -> one explainable recommendation
  -> current Campaign Pack creation
```

## Code Map

| Responsibility | Location |
| --- | --- |
| Feature gate | `src/config/features.ts` |
| Playbook registry and resolver | `src/constants/campaigncue/verticalPlaybooks.ts` |
| Recipe definitions | `src/constants/campaigncue/dailyDesk.ts` |
| Recommendation scoring and gates | `src/lib/campaigncue/decisionEngine.ts` |
| Owner rendering | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Regression suite | `scripts/verification/test-campaigncue-vertical-playbooks.ts` |

The registry validates recipe references at test time. It does not duplicate recipe payloads and does not create another runtime source of truth.
