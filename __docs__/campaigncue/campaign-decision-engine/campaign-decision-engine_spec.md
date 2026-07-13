# Campaign Decision Engine — Spec

## Product Rule

CampaignCue must not ask a model what the owner should promote.

CampaignCue recommends through:

Business Brain + current Owner Pulse + commercial policy + campaign recipes + workspace-local timing + asset readiness + missing inputs + trust/risk gates + owner-reported result receipts = recommended campaign cue.

AI may help with wording, variants, or ambiguous owner comments inside controlled systems. AI is not the authority for prices, dates, contacts, locations, claims, campaign safety, or document mutation.

## Decision Ladder

Every recommendation should answer:

1. Is there a real business goal?
2. Is there a matching campaign recipe?
3. Are required facts available?
4. Are facts fresh and protected?
5. Is there a usable channel?
6. Is there a usable asset/photo/design?
7. Is timing relevant?
8. Has this campaign been overused recently?
9. Did similar campaigns work before?
10. Can CampaignCue create a full pack?
11. Can Trust Center preflight clear it?
12. Can the owner use it manually today?

When the answer fails, CampaignCue asks for the missing input or recommends a safer action. It does not invent a promotion.

## Decision Object

The runtime exposes `CampaignCueDecision` with:

- `decisionId`
- `workspaceId`
- `businessBrainId`
- `recommendationTitle`
- `ownerGoal`
- `recipeId`
- `opportunityId`
- `decisionStatus`
- `confidence`
- `factsUsed`
- `missingInputs`
- `score`
- `explanation`
- `recommendedOutputs`
- `trustPreflight`
- `ownerPrimaryActionLabel`
- `commercialGate`
- `pulseEvidence`
- `experiment`

The owner sees plain language. The system keeps structured reasoning.

## Score Inputs

Scores are bounded integers from 0 to 100.

| Score | Meaning |
| --- | --- |
| `relevance` | Fit to business type and campaign moment. |
| `urgency` | Timing reason to act now. |
| `expectedImpact` | Likely usefulness for orders, bookings, visibility, reminders, or local action. |
| `factReadiness` | Required facts are present and usable. |
| `assetReadiness` | Usable photo/design/logo exists. |
| `channelReadiness` | Owner can manually use the recommended channels. |
| `resultMemoryBoost` | Similar campaigns worked before. |
| `ownerEffortPenalty` | Missing required facts/questions. |
| `repetitionPenalty` | Similar campaign was used too recently or marked not useful. |
| `trustRiskPenalty` | Blocked facts, restricted assets, review facts, or rights risk. |
| `finalScore` | Ranked decision score. |

Operating Pulse can increase relevance for quiet periods, available capacity, available stock, or a saved local moment. Closed business state, full capacity, unavailable stock, expired pulse, commercial restrictions, expired source inputs, and unsafe return-customer contact payloads are handled as explicit gates rather than score-only suggestions.

The review-request recipe requires a verified review destination plus a non-identifying note that a real visit, order, booking, appointment, or service was completed. The return-customer recipe requires a non-identifying owner-managed audience description. Neither path stores or imports customer contacts.

## Owner States

| State | Owner meaning |
| --- | --- |
| `ready_to_prepare` | Create the campaign pack now. |
| `needs_owner_input` | Answer required missing facts first. |
| `safe_evergreen_only` | Do a safer maintenance/update action instead of a risky promotion. |
| `blocked` | Do not promote until a risk is fixed. |

## Confidence

Confidence is not a model score.

- `high`: enough facts, low risk, useful timing/memory.
- `medium`: useful recommendation, but missing input or review remains.
- `low`: blocked, low score, or safer action needed.
