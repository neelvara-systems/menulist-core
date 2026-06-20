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
- trust report
- reuse notes
- mini-page and QR brief
- Campaign Proof Deck brief
- calendar/reminder note
- language handoff note
- result memory prompt
- next actions
- download bundle file manifest

## Day-One Owner Workflow

1. Owner opens Daily Campaign Desk.
2. CampaignCue shows a recommended campaign and missing inputs.
3. Owner answers required missing inputs before creating a full pack.
4. Owner creates or opens the latest pack.
5. Pack review shows trust status and delivery cards.
6. Owner downloads the campaign pack ZIP only when server trust gates allow public use.
7. Owner copies or uses fields manually in WhatsApp, Google Business Profile, Instagram/Facebook, print, staff handoff, email/SMS, or ad/agency handoff.
8. Owner records what happened.

## Channel Output Contract

| Channel | Active output |
| --- | --- |
| WhatsApp | image brief, short message, status text, customer reply text, catalog/menu link reminder. |
| Google Business Profile | post type, title, description, date reminder, photo reminder, CTA link, terms. |
| Instagram / creative | caption, square/story/print guidance, CTA, editor source when available. |
| Print / offline | print format list, QR-card brief, flattened export instruction. |
| Email / SMS | subject, preview, body, SMS text. |
| Ads / agency | headline, ad copy, destination, budget approval note, UTM when available. |
| Staff | staff share message, counter script, owner instruction. |
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
- No model-owned campaign decision.
- No automatic translation claim in the active export/download runtime.
- No invented price, date, phone, location, claim, or offer.

## Owner Copy Rules

Use:

- "Download campaign pack ZIP"
- "Use this campaign"
- "Needs input"
- "Needs review"
- "Blocked"
- "Mini-page and QR brief"

Avoid:

- "AI-generated post"
- "Layer decomposition"
- "Provider mutation"
- "Autopilot"
- "Direct publish"
