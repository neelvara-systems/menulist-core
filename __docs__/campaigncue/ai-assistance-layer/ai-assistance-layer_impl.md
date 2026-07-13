# CampaignCue AI Assistance Layer - Implementation

## Code Map

| Contract | File |
| --- | --- |
| Feature flags | `src/config/features.ts` |
| Durable types | `src/types/campaigncue.ts` |
| Derived plan builder | `src/lib/campaigncue/dailyDesk.ts` |
| Owner UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Regression guard | `scripts/verification/verify-campaigncue-runtime.js`, `scripts/verification/verify-campaigncue-operating-loop.ts` |

## Data Flow

1. CampaignCue loads the existing bounded overview.
2. `buildCampaignCueDailyDesk()` computes deterministic decisions, missing inputs, ready pack, trust summary, local visibility, and output pack.
3. `buildCampaignCueAIAssistancePlan()` derives the assistant plan from the same in-memory objects.
4. `dailyDesk.aiAssistance` reaches the owner UI with no additional API route or Firebase read.
5. `outputPack.aiAssistance` is included in `campaign-pack.json`.
6. `instructions/assistant-work-plan.md` is included in the campaign ZIP.
7. `campaign-pack-summary.md` includes the plan status, next action, and stage summaries.

## Current Stage Logic

| Stage | Source data | Authority |
| --- | --- | --- |
| Source intake | source inputs, source facts, source snapshot id | deterministic |
| Missing input | Daily Desk missing input tasks | deterministic |
| Pack drafting | current campaign outputs and ready pack | model candidate only, disabled |
| Trust explainer | trust summary findings | deterministic |
| Result interpreter | recipe result question and current campaign | deterministic |
| Photo coach | asset rights and recipe photo tasks | deterministic |

## Feature Flags

- `ENABLE_CAMPAIGNCUE_AI_ASSISTANCE_PLAN: true` shows the derived owner plan.
- `ENABLE_CAMPAIGNCUE_AI_PROVIDER_CALLS: false` keeps provider calls disabled.

## Failure Behavior

- Missing facts become `needs_input`.
- Review-only assets or trust findings become `needs_review`.
- Blocked trust findings become `blocked`.
- No campaign pack available keeps drafting and result interpretation in `needs_input`.
- Disabled provider calls stay visible in guardrails; no fallback model call is attempted.
