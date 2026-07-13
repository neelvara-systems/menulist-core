# Campaign Pack Output System — Spec

## Product Role

CampaignCue output is a ready-to-use campaign pack. It is not a single generated post, a generic design file, or a loose text export.

The owner should leave the pack knowing:

- what to promote
- why this campaign was recommended
- what details are missing
- what facts were checked
- what to copy or download per channel
- how to use it manually
- what can be reused later
- what brand/playbook direction the pack follows
- what agency/client proof deck should be reviewed
- what creator/audience-fit checklist applies when a local creator handoff is useful
- which preferred language/locale applies and which protected facts must stay unchanged if copy is translated manually
- what result to record

## Canonical Object

The canonical output object is `CampaignCueOutputPack`.

It contains:

- decision card
- facts used and missing inputs
- creative/editable source references
- channel copy blocks
- delivery cards
- five-check pack readiness for facts, trust, freshness, approval, and manual handoff
- trust report
- source freshness and recheck actions
- current commercial-safety findings
- normalized language policy and protected-fact review note
- owner-managed presence passport
- staff execution steps and result prompt
- one-variable learning suggestion
- reuse notes
- mini-page and QR brief
- Campaign Proof Deck brief
- calendar/reminder note
- Campaign Rhythm next action with due/scheduled counts and safe-reuse candidate
- language handoff note
- result memory prompt
- next actions
- download bundle file manifest

## Day-One Owner Workflow

1. Owner opens Daily Campaign Desk.
2. CampaignCue shows a recommended campaign and missing inputs.
3. Owner answers required missing inputs before creating a full pack.
4. Owner creates or opens the latest pack.
5. Pack review shows readiness, trust status, approval state, and delivery cards.
6. Owner downloads the campaign pack ZIP only when server trust gates allow public use.
7. Owner copies or uses fields manually in WhatsApp, Google Business Profile, Instagram/Facebook, print, staff handoff, email/SMS, or ad/agency handoff.
8. Owner records what happened; a useful result may nominate that recipe for a new current-truth pack.

## Readiness Contract

`CampaignCuePackReadiness` is a deterministic completeness and safety receipt, scored as five bounded checks worth 20 points each:

1. Required facts.
2. Trust checks.
3. Current business truth.
4. Required approval.
5. Manual handoff readiness.

The score does not predict engagement, reach, sales, bookings, ranking, or best posting time. Public-use actions still rely on server trust, freshness, and approval gates; a score never bypasses them.

## Safe Reuse Contract

When result memory shows that a completed campaign was useful, Campaign Rhythm may nominate its recipe. Reuse creates a new campaign from the current Decision Engine candidates and current source snapshot. It records only `reusedFromCampaignId` and `reuseMode: "rebuild_from_current_truth"` as provenance. It does not copy old output text/files, trust state, source hash, approval state, action counts, result receipt, or export history.

## Channel Output Contract

| Channel | Active output |
| --- | --- |
| Source-to-channel pack | current source-backed campaign cue, WhatsApp copy, Google/local draft, social/print creative guidance, manual task, review checklist, and result prompt. |
| WhatsApp | image brief, short message, status text, customer reply text, catalog/menu link reminder. |
| Google Business Profile | post type, title, description, date reminder, photo reminder, CTA link, terms. |
| Instagram / creative | caption, square/story/print guidance, CTA, editor source when available. |
| Print / offline | print format list, QR-card brief, flattened export instruction. |
| Email / SMS | subject, preview, body, SMS text. |
| Ads / agency | headline, ad copy, destination, budget approval note, UTM when available. |
| Staff | staff share message, counter script, owner instruction. |
| UGC / local creator test | creator-fit checklist, lightweight creator brief, 3-test plan, flat-fee boundary note, disclosure, consent, CTA, and result prompt. |
| Mini-page / QR | title, details, CTA, destination, terms, and hosted-page-disabled note. |
| Campaign Proof Deck | brand system, campaign/social creative set, product/service focus, UGC/reel dialogue-action reference, shot-plan reference, review checklist, and source trace as a review brief. |
| Language handoff | preferred locale, local-language boundary, and protected fact list for manual translation. |

## Hard Boundaries

- No direct social posting.
- No WhatsApp sending.
- No provider account connection.
- No ad-spend mutation.
- No hosted public offer page in the current runtime.
- No fake PNG/PDF output if the renderer has not produced a binary file.
- No claim that the proof deck is a final rendered PDF, website, social post, or generated video.
- No fake AI-avatar or fictional-customer UGC experience treated as a real testimonial.
- No creator recruiting, contract management, payment processing, marketplace listing, or guaranteed reach/revenue claim.
- No model-owned campaign decision.
- No automatic translation claim in the active export/download runtime.
- No invented price, date, phone, location, claim, or offer.
- No engagement, reach, ROI, or best-time prediction in the readiness score.
- No automatic repeat or stale-output cloning when a past campaign was useful.

## Owner Copy Rules

Use:

- "Download campaign pack ZIP"
- "Use this campaign"
- "Needs input"
- "Needs review"
- "Blocked"
- "Mini-page and QR brief"
- "Pack readiness"
- "Campaign rhythm"
- "Reuse safely"

Avoid:

- "AI-generated post"
- "Layer decomposition"
- "Provider mutation"
- "Autopilot"
- "Direct publish"
- "Predicted engagement score"
