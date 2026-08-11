# Campaign Inbox - Specification

## Owner Problem

An SMB owner often knows what changed but does not have time to navigate several forms. Examples include a new offer, today's availability, an end date, a stock note, or a booking detail. CampaignCue should turn that update into checked source candidates without asking the owner to design a campaign or write a prompt.

## Product Promise

`Tell CampaignCue what changed -> review the detected details -> save the selected facts -> let the Daily Desk recompute from current truth.`

Campaign Inbox does not promise perfect extraction. The deterministic parser understands a bounded set of explicit labels. Unlabelled or unrecognized prose stays intact as a note for review.

## Accepted Text Shape

One update per line is recommended:

```text
Offer: Hair spa package this weekend
Price: INR 799
Ends: Sunday at 7 PM
Availability: Six appointments remain
```

Recognized label families cover offer, price, discount, terms, availability, stock, event/date/validity, asset/photo note, menu link, booking link, phone, WhatsApp, website, and location. Matching is case-insensitive and supports `:` or `：` as the separator.

## Candidate Outcomes

| Outcome | Behavior |
| --- | --- |
| Campaign fact | Owner can select it and save it as an existing source input. |
| Business detail | Owner can place it in the matching Business Details draft and review that canonical record. |
| General note | Preserved as one `manual_note` candidate with `needs_review`. |
| Unsupported or ambiguous line | Preserved in the general note; never guessed. |
| Duplicate line | Deduplicated within the draft. |
| More than eight candidates | Parsing stops at the bounded limit and tells the owner to save a smaller update. |

## Authority Rules

- The parser may classify text; it may not establish truth by itself.
- The owner's reviewed batch confirmation establishes manual source-input confidence.
- `active` source candidates can participate in deterministic decisions.
- `needs_review` candidates remain visible but cannot become decision-ready facts.
- Phone, WhatsApp, location, website, menu URL, and booking URL stay canonical Business Brain fields and are never silently written as source facts by Campaign Inbox.
- Price, discount, offer terms, dates, and availability can be saved as time-sensitive source inputs after review. They remain subject to Trust Center and pack-freshness checks.

## Bounds

- Draft text: 4,000 characters.
- Candidate count: 8.
- Candidate label: 120 characters.
- Candidate value: 1,200 characters.
- Empty/whitespace-only input: rejected locally.
- Saved candidate IDs: deterministic for the idempotent request.
- No raw draft, parse trace, rejected line, or model prompt is stored.

## Accessibility And Owner Language

- Primary action: `Review update`.
- Confirmation action: `Save selected details`.
- Canonical-route action: `Use in Business details`.
- Statuses: `Ready to use`, `Needs review`, and `Business detail`.
- Inputs and actions use at least 44px targets on narrow screens.
- Technical terms such as extraction, schema, model confidence, and ingestion are not shown.

## Non-Goals

- No background listening or inbox scraping.
- No social account connection.
- No customer-contact import.
- No automatic Business Brain mutation.
- No direct posting, WhatsApp send, or ad mutation.
- No photo/audio upload in this feature; secure media capture is the next workstream.
- No provider call while `ENABLE_CAMPAIGNCUE_AI_PROVIDER_CALLS` and the Campaign Inbox model-assist gate are disabled.
