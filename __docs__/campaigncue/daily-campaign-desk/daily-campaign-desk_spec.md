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
- Is an approval, manual reminder, result receipt, or safe reuse action due next?

## Owner Workflow

1. Owner opens CampaignCue.
2. Owner can add a short operating pulse for current business state, capacity, stock, local moment, and validity window.
3. Campaign Decision Engine scores campaign recipes from existing facts, the current pulse, commercial policy, readiness, risk, workspace-local timing, and result receipts.
4. The first screen shows one recommended action with confidence, status, why-this, why-now, pulse evidence, commercial preflight, and pack outputs.
5. Missing details appear as small cards with direct links to Business, Inputs, Assets, Locations, Visibility, Settings, Agency, or Results.
6. Campaign Rhythm prioritizes one next action: resolve approval, open a time-sensitive due task, record a missing result, open a future scheduled task, use a ready pack, or rebuild a useful past recipe from current facts.
7. If a campaign pack exists, the owner can download the structured Campaign Pack ZIP, open it, mark it used, choose an explicit date/time for a manual task, request/resolve approval, or record a result.
8. If no pack exists, the owner can create one from the top cue only after required gates pass.
9. The same pack shows a campaign pack review: decision evidence, pack readiness, source facts, missing inputs, freshness, commercial safety, approval, trust summary, manual delivery cards, local presence, language handoff, result question, and one-tap result options.
10. Manual delivery cards show channel-specific copy/download fields for WhatsApp, Google, creative, ads, video, scripts, staff, and calendar handoff.
11. The Visibility surface prepares Google/local fields, honest review requests, and return-customer handoff without connecting, importing contacts, or posting to provider accounts.
12. Provider posting remains off; the owner downloads, copies, and posts manually.

## Day-One Behavior

| Capability | Decision |
| --- | --- |
| Daily recommendation | Computed from already-loaded overview data. |
| Campaign Decision Engine | Deterministically ranks campaign recipes from facts, timing, assets, channels, trust risk, owner effort, repetition, and result memory. AI does not decide. |
| Recommendation explanation | Home shows confidence, readiness state, score, why-this, why-now, trust preflight, missing inputs, and recommended pack outputs. |
| Missing input inbox | Business detail, current source input, price/date/availability, asset rights, result, approval, and location prompts. |
| Owner Pulse | Business state, capacity, stock, local moment, note, and validity window are stored in the existing Business Brain and shown on the first screen. Expired pulse is a required refresh before a new pack can be prepared. |
| Commercial safety | Promotions, discounts, approval, maximum discount, minimum promoted price, and do-not-promote terms are deterministic gates. |
| Vertical/action recipes | Twenty recipes are implemented. The existing restaurant, salon, retail, local-service, fitness, clinic, generic, shared-review, retention, reuse, and visibility actions now include catering inquiries, membership reminders, back-in-stock updates, seasonal maintenance, trial sessions, and clinic service availability. |
| Campaign pack review | The latest pack exposes source facts, missing inputs, trust summary, delivery cards, result question, result options, and local visibility cues. |
| Pack readiness | Five deterministic 20-point checks cover facts, trust, freshness, approval, and manual handoff. The score is not an engagement, reach, ROI, or best-time prediction. |
| Campaign Rhythm | Derived from already-loaded campaigns/schedules and selects one next manual action with zero incremental Firebase/provider operations. |
| Safe campaign reuse | A useful completed campaign may nominate its recipe; creation rebuilds from current Decision Engine candidates and current source truth with new trust/approval/export state. |
| Campaign Pack Output | The latest pack also exposes `CampaignCueOutputPack`: decision, missing-input checklist, channel copy, delivery cards, readiness, rhythm, freshness, commercial safety, trust report, presence passport, protected-language handoff, staff execution, reuse notes, mini-page/QR brief, learning suggestion, result memory, and a ZIP file manifest. |
| Multi-output pack | Existing campaign outputs now include owner use case, output formats, print formats, photo tasks, review checklist, and structured `handoffFields`. |
| Manual delivery assistant | The desk, pack review, delivery tab, campaign cards, and pack export show owner-safe manual use steps and copyable handoff fields. CampaignCue does not send, post, connect, or spend. |
| Local visibility cue | Visibility prompts check locality, destination, Google-ready output presence, and fresh-fact readiness without provider calls. |
| Asset reuse | The desk routes to saved assets, the shared editor, and CueLayers upload when an existing poster, screenshot, or flat generated image needs safe reuse. |
| Campaign Pack Editor Mode | Opening an output in the editor keeps the campaign context visible: safe tasks, protected facts, multi-output formats, trust checks, manual delivery, result memory, and mobile review guidance. |
| Print pack | Pack download includes print/in-store use guidance. |
| Owner photo task | Desk shows one or more practical photo tasks. |
| Result receipt | Desk records a bounded owner-reported signal, optional use time, channel, reply/call/booking/order/walk-in/link-click counts, note, and tested variable inside compact `campaign.resultMemory.lastReceipt`. `not_used` never changes the campaign to used or records a use time. |
| Approval lifecycle | Request, approve, and reject reuse one deterministic approval document per campaign. Resolution is transactional; requested/rejected packs cannot be used publicly, agency workspaces require approved state, and closed/already-approved packs cannot open another request. |
| Manual reminder | Owner must choose a local date/time. Elapsed tasks are derived as due without a status write; CampaignCue never posts automatically. |
| Freshness gate | New packs store an order-independent source hash and bounded expiry. Download, export, mark-used, and schedule re-read only the current source snapshot and fail closed on stale or expired packs. |
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
- "Reuse safely"
- "Pack readiness"
- "Campaign rhythm"
- "Open checks"
- "Check if ready to share"
- "Add missing business details"

Avoid internal language:

- source confidence
- deterministic generation
- provider mutation
- Firebase setup
- direct publish as a normal owner action
- predicted engagement score
