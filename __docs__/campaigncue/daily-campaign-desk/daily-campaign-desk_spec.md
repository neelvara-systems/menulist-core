# Daily Campaign Desk — Spec

## Product Role

Daily Campaign Desk is the CampaignCue owner starting point. Its job is to reduce the owner's work to the next useful campaign action, not to expose every creative tool.

The screen must answer:

- What campaign path is useful today?
- Why CampaignCue recommends it.
- What detail is missing before the pack can be trusted?
- Is a pack already ready?
- What can be downloaded, manually delivered, printed, photographed, or reused?
- Has the owner recorded what happened after using a pack?

## Owner Workflow

1. Owner opens CampaignCue.
2. Campaign Decision Engine scores campaign recipes from existing facts, readiness, risk, timing, and result memory.
3. The first screen shows one recommended action with confidence, status, why-this, why-now, trust preflight, and pack outputs.
4. Missing details appear as small cards with direct links to Business, Inputs, Assets, Locations, Agency, or Results.
5. If a campaign pack exists, the owner can download the structured Campaign Pack ZIP, open it, mark it used, or record a result.
6. If no pack exists, the owner can create one from the top cue.
7. The same pack shows a campaign pack review: decision evidence, reason, source facts, missing inputs, trust summary, manual delivery cards, local visibility cues, result question, and one-tap result options.
8. Manual delivery cards show channel-specific copy/download fields for WhatsApp, Google, creative, ads, video, scripts, and calendar handoff.
9. The Visibility surface prepares Google/local update fields without connecting or posting to provider accounts.
10. Provider posting remains off; the owner downloads, copies, and posts manually.

## Day-One Behavior

| Capability | Decision |
| --- | --- |
| Daily recommendation | Computed from already-loaded overview data. |
| Campaign Decision Engine | Deterministically ranks campaign recipes from facts, timing, assets, channels, trust risk, owner effort, repetition, and result memory. AI does not decide. |
| Recommendation explanation | Home shows confidence, readiness state, score, why-this, why-now, trust preflight, missing inputs, and recommended pack outputs. |
| Missing input inbox | Business detail, current source input, price/date/availability, asset rights, result, approval, and location prompts. |
| Vertical recipes | Twelve recipes are implemented: restaurant, salon, retail, local-service, fitness, clinic, generic local business, slow lunch, weekend slots, new arrival, old-poster reuse, and Google/local visibility refresh. |
| Campaign pack review | The latest pack exposes source facts, missing inputs, trust summary, delivery cards, result question, result options, and local visibility cues. |
| Campaign Pack Output | The latest pack also exposes `CampaignCueOutputPack`: decision, missing-input checklist, channel copy, delivery cards, trust report, reuse notes, mini-page/QR brief, result memory, and a ZIP file manifest. |
| Multi-output pack | Existing campaign outputs now include owner use case, output formats, print formats, photo tasks, review checklist, and structured `handoffFields`. |
| Manual delivery assistant | The desk, pack review, delivery tab, campaign cards, and pack export show owner-safe manual use steps and copyable handoff fields. CampaignCue does not send, post, connect, or spend. |
| Local visibility cue | Visibility prompts check locality, destination, Google-ready output presence, and fresh-fact readiness without provider calls. |
| Asset reuse | The desk routes to saved assets, the shared editor, and CueLayers upload when an existing poster, screenshot, or flat generated image needs safe reuse. |
| Campaign Pack Editor Mode | Opening an output in the editor keeps the campaign context visible: safe tasks, protected facts, multi-output formats, trust checks, manual delivery, result memory, and mobile review guidance. |
| Print pack | Pack download includes print/in-store use guidance. |
| Owner photo task | Desk shows one or more practical photo tasks. |
| Result memory | Desk prompts for a result when used count is ahead of recorded outcomes, writes a structured `resultSignalId`, and stores compact `campaign.resultMemory` for next recommendations. |
| Direct posting | Not active. |
| Paid provider generation | Not active. |

## Product Boundaries

Daily Campaign Desk must not become:

- A generic blank design dashboard.
- A template marketplace.
- A direct social scheduler.
- An email/SMS blast tool.
- An ad autopilot.

It must keep CampaignCue's wedge: source-backed local campaign packs, owner review, manual export, and confidence-labeled learning.

## Owner Copy Rules

Use plain action language:

- "Add input"
- "Download campaign pack ZIP"
- "Mark used"
- "Record result"
- "Reuse old image"
- "Open checks"
- "Check if ready to share"
- "Add missing business details"

Avoid internal language:

- source confidence
- deterministic generation
- provider mutation
- Firebase setup
- direct publish as a normal owner action
