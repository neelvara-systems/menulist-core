# Campaign Operating Loop - Spec

## Product Role

CampaignCue should recommend the safest useful campaign the business can execute now. It must be able to say that the business is closed, capacity is full, stock is unavailable, a discount is outside policy, or current truth changed after the pack was created.

The model is not the decision authority. Rules, approved facts, owner-entered operating context, campaign recipes, trust gates, and owner-reported results are the authority.

## Canonical Inputs

### Owner Pulse

- business state: normal, quiet, busy, or closed
- capacity: unknown, available, limited, or full
- stock: unknown, available, low, or unavailable
- local or seasonal moment
- short owner note
- validity window

### Commercial Policy

- promotions allowed
- discounts allowed
- discount approval required
- maximum discount percentage
- minimum promoted price and currency
- do-not-promote list

### Local Presence And Language

- owner-managed Google profile and review destinations
- Apple Business Connect, Instagram, Facebook, WhatsApp catalog, website, or menu destinations
- source locale and target locale list
- mandatory human review of protected facts in every translated handoff

### Result Receipt

- owner-selected result signal
- optional used-at time
- optional reply, call, booking, order, walk-in, and link-click counts
- owner note
- the one campaign variable tested
- `owner_reported` confidence

## Decision Rules

1. Closed, full-capacity, or unavailable-stock states can block demand campaigns.
2. Limited capacity and low stock require review.
3. Paused promotions block promotional recipes but not safe maintenance, review, visibility, or asset-reuse work.
4. Discount language is checked against allow/approval/maximum rules.
5. Explicit currency or `price` values are checked against the minimum promoted price.
6. Do-not-promote terms block matching active inputs.
7. Expired owner pulse becomes a required refresh before a new pack can be prepared.
8. Expired source inputs are not treated as active decision evidence.
9. Workspace timezone determines weekday/weekend context.
10. Result receipts boost or penalize matching recipes without scanning raw events.
11. The next suggestion changes one variable only: channel, timing, offer, photo, CTA, or format.
12. A positive owner-reported result can nominate a previous pack for safe reuse, but the old output is never treated as current truth.
13. Safe reuse rebuilds the previous recipe against the current source snapshot, commercial policy, Owner Pulse, assets, and trust gates.
14. A pending or rejected owner/client approval blocks download, export, mark-used, and manual scheduling.
15. Agency workspaces require an approved pack before public-use actions.

## Campaign Rhythm

Campaign rhythm is a derived owner view, not a social scheduler and not a new database object. It ranks the next useful operating action in this order:

1. resolve a requested or required approval
2. complete a due manual task
3. record a missing result for a used pack
4. review the next scheduled manual task
5. use the current, freshness-valid ready pack
6. safely reuse a useful previous pack
7. prepare the next recommended pack

The rhythm view includes the next action, due/scheduled task counts, a manual-use window, a follow-up instruction, and at most one safe reuse candidate. It does not claim to know an algorithmically perfect posting time.

## Safe Reuse Contract

- Eligible source packs have a positive owner-reported result or measured owner-entered response and are not archived or trust-blocked.
- Reuse stores `reusedFromCampaignId` and `reuseMode: rebuild_from_current_truth` on the new campaign pack metadata.
- Reuse invokes normal campaign creation. It does not copy the old source hash, freshness receipt, trust report, output text, approval, or result receipt.
- The new pack receives a new source snapshot hash, freshness window, trust report, output set, approval state, and result prompt.
- Reuse adds no campaign-history read because campaign creation already loads the bounded campaign list.

## Approval Resolution Contract

- Approval request, approve, and reject use the existing protected campaign-action route.
- Repeated requests while a campaign is already requested are a no-op.
- One deterministic approval document is reused per campaign; repeated requests do not create an unbounded approval-document trail.
- Used, archived, and already-approved packs cannot start another approval request. Rejected active packs may be corrected and requested again.
- Approval resolution is transactional; the first valid approve/reject decision wins.
- Re-requesting a rejected pack updates the request time but preserves the approval document's original creation time.
- Event records preserve the audit trail.
- Only owner, admin, reviewer, or local-manager workspace roles may approve or reject.
- Reject requires an owner-safe reason.
- Approval never bypasses trust, freshness, commercial, rights, or protected-fact gates.

## Pack Readiness Score

The owner can see a bounded readiness score made from five 20-point checks:

- required facts
- trust findings
- source freshness
- approval state
- manual delivery fields

This is not an engagement score, reach prediction, performance forecast, or recommendation authority. A blocked check keeps the pack blocked regardless of the number.

## Added Recipes

### Customer Review Request

Requires a verified review destination and a real completed customer interaction. It must not incentivize positive reviews, fabricate reviews, or store customer contacts.

### Return-Customer Reminder

Requires a non-identifying description of an owner-managed audience and one current reason to return. CampaignCue prepares copy and staff handoff only; it does not import contacts or send messages.

## Pack Freshness Contract

Every newly created pack stores:

- source hash
- current/unknown/stale/expired state
- validated time
- expiry time bounded by recipe validity, current Owner Pulse validity, and current dated source inputs
- actions requiring recheck: download, export, mark used, and schedule

The server re-reads only `sourceSnapshots/current` for those public-use actions. A different hash or expired window returns a safe conflict and records the blocked action. Legacy packs without a freshness receipt stay `unknown` and require visible review rather than being silently treated as current.

Fact hashes sort facts by stable ID before hashing. Query order must never create a false stale result.

Owner-managed destinations accept only `http` or `https`. Return-customer source input rejects obvious pasted/imported customer contact payloads; only a non-identifying audience description is allowed.

## Owner Surfaces

- Daily Desk: quick Owner Pulse and visible commercial status.
- Business: commercial policy and do-not-promote rules.
- Visibility: Local Presence Passport, review pack, and return-customer pack entry.
- Settings: target languages with protected-fact review boundary.
- Calendar: owner/staff assignee and manual task type.
- Results: Campaign Receipt and one-variable learning instruction.
- Campaign Pack Output: truth receipt, commercial safety, presence, language, staff execution, and learning summary.
- Daily Desk: Campaign Rhythm with the next manual action and safe-reuse candidate.
- Packs: Reuse safely, request approval, approve, reject, and readiness evidence.
- Calendar: due/next manual task context from the same bounded schedule list.
- Results: the selected or rhythm-nominated campaign remains the result target; CampaignCue never silently records the result against a different latest pack.

## Non-Goals

- No direct posting or sending.
- No social/provider account connection.
- No customer contact database or CRM.
- No automated translation claim.
- No automated review request delivery.
- No reputation manipulation.
- No automatic weather/event provider.
- No guaranteed outcome or attribution claim.
- No engagement prediction, best-time prediction, content-performance score, or automatic recycling.
- No blind cloning of old campaign copy, facts, approvals, or result receipts.
