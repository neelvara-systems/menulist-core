# MenuList SignalDesk - Compliance Policy

**Status:** Initial policy
**Created:** June 23, 2026
**Scope:** Source, channel, consent, suppression, privacy, and internal safety rules for SignalDesk.

## Core Rule

Availability of data is not permission to contact.

SignalDesk must record source rights, field storage permission, outreach eligibility, retention, suppression state, and human approval before any outbound action.

## Source Policy

| Source | Allowed first use | Blocked use |
| --- | --- | --- |
| Manual curated list | Candidate review after source reason is recorded | Treating unknown source as outreach permission |
| Existing MenuList signals | Prioritization and attribution | Raw customer scan alone becoming a prospect |
| Owner/customer referral | Candidate target with referral context | Inventing referral claims |
| Paid intent | Warm lead handling after explicit form/click action | Cold retargeting claims such as "we saw you clicked" |
| Public website/business page | Manual evidence review | Storing restricted content as truth |
| Google Maps / Places-like data | Temporary candidate signal only after source policy | Scraping/storing as prospect truth or using GBP APIs for lead gen |
| Foursquare Places PAYG | Identity/category signal only if terms allow | Contacting businesses as prospective customers |
| Apify/Outscraper-style data | Gated discovery/evidence only after source policy, provider approval, env-controlled Actor review, and budget cap | Default source for outreach or scrape-and-send |
| Research Agent Table | Prompt-to-table planning, evidence rows, pass/fail/unsure fit, and market-pod mapping after source policy | Treating table rows as outreach permission or auto-sequence input |

External source-policy evidence is recorded in the end-to-end research memo:

- Google Maps restrictions: `../menulist-marketing-distribution/menulist-marketing-distribution_end-to-end-growth-research-2026-06-23.md:35`
- GBP API lead-generation blocker: `../menulist-marketing-distribution/menulist-marketing-distribution_end-to-end-growth-research-2026-06-23.md:36`
- Foursquare prospect-contact blocker: `../menulist-marketing-distribution/menulist-marketing-distribution_end-to-end-growth-research-2026-06-23.md:37`
- Scraper-market caution: `../menulist-marketing-distribution/menulist-marketing-distribution_end-to-end-growth-research-2026-06-23.md:38`

## Web Research Additions - June 23, 2026

Current external-source review is recorded in `menulist-signaldesk_web-research-addendum-2026-06-23.md`.

Adopted compliance additions:

| Area | SignalDesk rule |
| --- | --- |
| Email sender readiness | Provider send stays disabled until sender identity, physical address, SPF/DKIM, DMARC-before-scale, unsubscribe, bounce, complaint, and suppression handling are ready. |
| Email opt-out | Every commercial email path must support simple opt-out and suppression. Opt-out handling must not depend on a user giving extra information beyond what is needed to suppress. |
| Sender responsibility | Vendor/provider send does not transfer responsibility away from MenuList; SignalDesk must keep audit, suppression, and sender-health evidence. |
| WhatsApp | Free-form responses require a user/inbound/opt-in context and must respect the 24-hour customer-service window; business-initiated messages outside that window require approved templates. |
| Instagram/Messenger | Use as inbound, ad-click, or response channels first; cold DM automation remains blocked. |
| Phone/SMS/robotext | Automated phone/text marketing is blocked unless explicit consent and jurisdiction-specific review exist. Do not treat third-party lead-source consent as enough. |
| Places-like providers | Use narrow field masks, avoid contact fields, store provider IDs/source references, keep non-exempt provider content short-lived, and do not turn provider output into durable prospect truth without source-policy approval. |
| Apify source broker | Apify can run only the configured source Actor, cannot accept arbitrary browser Actor IDs, cannot store raw dataset payloads, and must rely on source-policy contact-use stripping before any contact field is retained. |
| Research Agent Table | Research rows must preserve provider, source policy, source run, and row-level source refs. `pass` means review priority, not permission to contact. |
| AI risk | AI outputs must remain governed, mapped, measured, and managed through model version, prompt version, confidence, rejected facts, edits, eval failures, cost, and pause conditions. |

## Channel Policy

### Email

Email is the first controlled outbound rail.

Required before send:

- sender identity approved;
- sender domain readiness;
- SPF/DKIM/DMARC checked;
- Gmail-facing authentication minimums reviewed;
- physical address policy approved;
- unsubscribe path present;
- suppression checked;
- bounce/complaint handling ready;
- human approval recorded.

### WhatsApp

WhatsApp is assisted and consent-aware first. The runtime may prepare an approved handoff and can send through Meta only when the global provider-send flag, channel credentials, source policy, suppression checks, and human approval are all in place.

Allowed contexts:

- owner starts the conversation;
- click-to-WhatsApp ad or CTA creates inbound intent;
- explicit opt-in exists;
- founder-led/manual conversation where the owner expects follow-up;
- verification/correction flow where the owner initiated or consented.

Blocked contexts:

- scraped public phone numbers;
- enriched phone lists;
- cold WhatsApp blasts;
- number rotation;
- generic AI WhatsApp assistant;
- public listing phone availability treated as opt-in.

Additional readiness:

- channel-window state recorded;
- approved template state recorded when outside the 24-hour service window;
- escalation path available for automation-assisted replies;
- Meta/WhatsApp data is not reused for unrelated prospecting.

### Instagram / Messenger

Use as inbox/response channels first.

Allowed:

- inbound replies;
- ad-click-to-message intent;
- manual response to a clear business inquiry.

Blocked:

- cold DM automation;
- scraping followers;
- mass comment/DM sequences.

Additional readiness:

- inbound/ad-click/user interaction exists;
- platform response window is still open or a permitted template/message type exists;
- human escalation is available for ambiguous replies.

### Paid Campaigns

Paid campaign automation is skipped for this implementation slice. No spend mutation, campaign creation, ad webhook automation, lookalike expansion, or paid next-best-action execution is implemented.

## AI Compliance Rules

AI may:

- classify likely fit;
- summarize allowed evidence;
- detect current-list opportunity;
- draft within approved templates;
- classify replies;
- suggest next action.

AI may not:

- infer consent;
- decide source-rights eligibility;
- invent facts;
- use restricted fields in messages;
- approve sends;
- override suppression;
- classify marketing templates as utility messages;
- claim MenuList has verified the business unless MenuList actually has.

AI pause triggers:

- rejected-fact count rises;
- human edit rate rises;
- confidence drops below the approved threshold;
- complaint or suppression rates rise after AI-assisted drafts;
- provider cost exceeds budget;
- output asks to use a field not approved by source policy.

## Suppression Rules

Suppression events include:

- unsubscribe;
- DNC;
- wrong contact;
- complaint;
- hard bounce;
- manual block;
- source-policy block;
- channel-health block.

Suppression must be checked:

1. before draft approval;
2. before export;
3. before send;
4. before follow-up;
5. before route handoff if the route includes outreach.

## Privacy And PII

SignalDesk stores minimum necessary contact data.

Rules:

- mask contact details in list views;
- reveal contact only through audited action;
- never store raw secrets in Firestore;
- never place contact values in AI prompts unless required and approved;
- never export suppressed contacts;
- support deletion/restriction workflows where required;
- use hashed identities for suppression lookup.

## Artifact Rules

Evidence packets and preview artifacts:

- must be internal or noindex by default;
- must identify unverified facts as unverified;
- must not rehost restricted provider content;
- must not invent menus, prices, offers, hours, reviews, or traffic claims;
- must expire or be reviewed;
- must have takedown/complaint handling.

## Launch Blockers

SignalDesk must not send or export outbound messages if any are missing:

- source policy;
- source provenance;
- suppression check;
- channel policy;
- sender identity;
- unsubscribe path for email;
- human approval;
- audit event;
- decision snapshot;
- kill switch scope.

## Compliance Open Questions

| Question | Owner |
| --- | --- |
| Physical address for commercial email | Founder |
| First sender domain | Founder |
| WhatsApp production account and opt-in copy | Founder |
| First market jurisdiction | Founder |
| Message body retention period | Founder + legal/compliance review |
| Whether any source provider may be used for outreach | Founder + legal/compliance review |
