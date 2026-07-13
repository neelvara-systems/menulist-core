# CampaignCue AI Assistance Layer - Test Cases

## Runtime

1. With current source inputs, the source-intake item is `ready`.
2. With no current source inputs, the source-intake item is `needs_input`.
3. With a required missing input, the missing-input item is `needs_input`.
4. With a trust blocker, the trust-explainer item is `blocked`.
5. With no campaign, pack drafting is `needs_input`.
6. With a campaign, pack drafting is `ready` or `needs_review` depending on pack state.
7. With confirmed assets, photo coach is `ready`.
8. With rights-review assets only, photo coach is `needs_review`.
9. With no assets, photo coach is `needs_input`.

## Safety

1. Provider-call permission is false for every current item.
2. Provider call count in `costPolicy` is zero.
3. Firestore read/write/delete and Storage write counts in `costPolicy` are zero.
4. Guardrails mention protected facts and owner approval.
5. UI copy says the model does not choose campaigns or post anywhere.
6. The ZIP includes `instructions/assistant-work-plan.md`.
7. `campaign-pack-summary.md` includes the assistant plan section.

## Regression Commands

- `npm run verify:campaigncue-operating-loop`
- `npm run verify:campaigncue`
- `npx tsc --noEmit --incremental false --pretty false`
