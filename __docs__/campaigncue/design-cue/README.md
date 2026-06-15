# Design Cue - Documentation

Design Cue is the conversational and comment-based assistant inside the CampaignCue creative editor. It helps SMB owners ask for design changes in plain language, review proposed edits, and apply safe patches to the shared `CreativeEditorDocument`.

Design Cue is not a generic chatbot, direct publisher, or model-owned editor. It is a programmatic patch system with optional AI intent/copy assistance behind cost and trust gates.

## Document Set

| File | Audience | Purpose |
| --- | --- | --- |
| [design-cue_spec.md](./design-cue_spec.md) | Product, design | Owner problem, product boundaries, user flows, and acceptance. |
| [design-cue_impl.md](./design-cue_impl.md) | Engineering | Programmatic-vs-model architecture, patch contracts, routes, and implementation order. |
| [design-cue_firebase.md](./design-cue_firebase.md) | Engineering, finance | Firestore, Storage, rules, cost, and rate-limit posture. |
| [design-cue_mobile-support.md](./design-cue_mobile-support.md) | Product, mobile | Mobile owner workflow and interaction model. |
| [design-cue_helpdoc.md](./design-cue_helpdoc.md) | Owners/support | Owner-facing usage help. |
| [design-cue_marketing.md](./design-cue_marketing.md) | GTM | Internal positioning and differentiation. |
| [design-cue_website.md](./design-cue_website.md) | Public website | Public copy boundaries. |
| [design-cue_test-cases.md](./design-cue_test-cases.md) | QA | End-to-end, security, cost, and UX test matrix. |
| [design-cue_validation.md](./design-cue_validation.md) | Engineering, QA | Implementation audit, files reviewed, validation, and remaining risks. |

## Current Status

The current CampaignCue editor renders Design Cue inside the shared editor AI Tools drawer. Known command chips and safe owner comments resolve locally into validated `CreativeEditorDocument` patch sets. The owner must review the patch card and choose Apply before the document changes.

The guarded model-assist API route exists at `POST /api/campaigncue/design-cue/turns`, but `ENABLE_CAMPAIGNCUE_DESIGN_CUE_MODEL_ASSIST` is disabled. The route validates auth, scope, rate limit, and payload shape, then fails closed without provider calls.

## Core Decision

Most work must be programmatic:

- layer selection
- text insertion and selected-text transforms
- size/channel conversion
- brand/fact checks
- patch preview/apply/revert
- comment anchoring
- export checklist
- source-truth validation

Use an AI model only when deterministic logic cannot safely understand the owner request or when generating copy/critique candidates. The model returns intent or candidates. The programmatic resolver creates and validates patches.
