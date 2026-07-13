# CampaignCue AI Assistance Layer

**Status:** Implemented as a deterministic, zero-incremental-cost assistant plan.
**Owner promise:** AI reduces work after CampaignCue decides from facts.
**Code truth:** `src/types/campaigncue.ts`, `src/lib/campaigncue/dailyDesk.ts`, `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx`.

The AI Assistance Layer shows where AI can help an SMB owner without turning CampaignCue into a generic AI content tool. It is computed from the already-loaded Daily Campaign Desk and Campaign Pack Output data.

It does not decide what to promote, mutate protected business facts, post to channels, write a new Firebase document, create a Storage artifact, or call a model provider in the current runtime.

## Documents

| Document | Purpose |
| --- | --- |
| [ai-assistance-layer_spec.md](./ai-assistance-layer_spec.md) | Product contract and owner workflow. |
| [ai-assistance-layer_impl.md](./ai-assistance-layer_impl.md) | Code paths, data flow, and implementation notes. |
| [ai-assistance-layer_firebase.md](./ai-assistance-layer_firebase.md) | Firebase cost and persistence boundary. |
| [ai-assistance-layer_mobile-support.md](./ai-assistance-layer_mobile-support.md) | Mobile admission and UX behavior. |
| [ai-assistance-layer_test-cases.md](./ai-assistance-layer_test-cases.md) | Regression and safety test matrix. |
| [ai-assistance-layer_marketing.md](./ai-assistance-layer_marketing.md) | Internal positioning. |
| [ai-assistance-layer_website.md](./ai-assistance-layer_website.md) | Public-copy boundaries. |
| [ai-assistance-layer_helpdoc.md](./ai-assistance-layer_helpdoc.md) | Owner help copy. |
| [ai-assistance-layer_validation.md](./ai-assistance-layer_validation.md) | Current validation report. |

## Active Assistant Stages

- Source intake.
- Missing input.
- Pack drafting.
- Trust explainer.
- Result interpreter.
- Photo coach.

Every stage exposes status, owner value, suggested action, authority, provider-call permission, cost tier, source references, and guardrails.
