# CampaignCue AI Assistance Layer - Spec

## Goal

Use lower-cost AI capability to remove SMB owner work while preserving CampaignCue's core product rule:

`AI suggests. CampaignCue decides from facts, recipes, gates, and memory. Owner approves.`

## Owner Workflow

1. Owner opens Daily Campaign Desk.
2. CampaignCue shows the deterministic recommendation first.
3. AI Assistance Plan shows where AI can help next:
   - turn rough inputs into usable facts,
   - ask the next missing detail,
   - draft pack copy from approved facts,
   - explain trust findings,
   - interpret owner-reported results,
   - guide the next useful photo or reusable asset.
4. Owner follows an action into an existing tab.
5. CampaignCue keeps missing-input and trust gates in control.
6. Export remains manual/download-first.

## Non-Negotiable Boundaries

- The model never chooses the campaign recipe.
- The model never invents price, discount, date, phone, address, destination, availability, result, or rights status.
- The model never mutates `CreativeEditorDocument`, CampaignCue source facts, campaign packs, trust status, or result memory directly.
- The model never posts, sends WhatsApp messages, connects provider accounts, starts ad spend, or publishes mini-pages.
- Provider calls are disabled by `ENABLE_CAMPAIGNCUE_AI_PROVIDER_CALLS: false`.
- Pattern Cue runs deterministic text-pattern analysis from an owner-submitted link and notes. `ENABLE_CAMPAIGNCUE_PATTERN_CUE_MODEL_ASSIST` remains false until CampaignCue-specific capacity accounting and provider gates exist.
- The active plan adds no Firestore read, write, delete, Storage write, or Cloud Function.

## Canonical Object

`CampaignCueAIAssistancePlan` is derived from `CampaignCueDailyDesk` and `CampaignCueOutputPack`.

It contains:

- overall readiness status,
- six assistant items,
- next best action,
- zero-cost policy,
- provider policy.

Each item contains:

- stage,
- label,
- owner value,
- current input,
- suggested action,
- target tab,
- status,
- authority,
- provider-call permission,
- cost tier,
- source references,
- guardrails.

## Acceptance Criteria

- The plan appears after deterministic recommendation evidence, not before it.
- Each item routes to an existing CampaignCue tab.
- The campaign ZIP includes a readable assistant work plan.
- `campaign-pack-summary.md` summarizes the assistant plan.
- Docs and verifiers explicitly state no incremental Firebase cost.
- Provider-call capability remains a future gated layer.
