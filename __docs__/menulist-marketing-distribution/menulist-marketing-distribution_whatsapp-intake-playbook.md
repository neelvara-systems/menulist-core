# MenuList Marketing Distribution - WhatsApp Intake Playbook

**Status:** Active campaign playbook  
**Created:** June 22, 2026  
**Owner:** Founder with Codex acting as MenuList marketing consultant  
**Scope:** Owner-facing WhatsApp onboarding message states, consent boundaries, and campaign handoffs.  
**Runtime Source:** `__docs__/messaging-onboarding/`

## Purpose

This playbook turns the implemented messaging-onboarding runtime into a marketing-safe operator script.

Use it for inbound or permission-based owner conversations only. Do not use it for scraped-number bulk outreach.

## Positioning Line

> Send your current list on WhatsApp. MenuList turns it into one official customer link.

Use `list` as the umbrella term. It covers:

- menu
- service list
- rate card
- package list
- price list
- catalog
- photo
- screenshot
- PDF
- typed message

## Runtime Truth

Messaging onboarding already exists as a provider-backed WhatsApp flow under `__docs__/messaging-onboarding/`.

The campaign must still respect these live boundaries:

- Runtime provider: official Meta WhatsApp Cloud API.
- Function runtime env `ENABLE_MESSAGING_ONBOARDING` must be true for real WhatsApp webhooks.
- Provider secrets are required: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, and `WHATSAPP_VERIFY_TOKEN`.
- Public website click-to-WhatsApp CTA uses the supplied test number. Production traffic still needs the final public onboarding number/account, response owner, operating hours, consent copy, and tracking decision.
- No official WhatsApp or Meta partnership claim.
- No automatic WhatsApp catalog sync claim.
- No bulk outreach from scraped numbers.

## Owner Message States

| State | Owner-facing message | Operator note |
| --- | --- | --- |
| First contact | Hi. Send the menu, service list, rate card, package list, catalog, photo, PDF, screenshot, or text you currently share with customers. | Use only after owner starts chat or has given permission. |
| Source received | Received. MenuList will prepare a public preview for review. | Do not promise publish before extraction/review finishes. |
| Details needed | Please send business name, city, and what this list is for: menu, service list, rate card, catalog, package list, or price list. | Keep short. Ask only for missing essentials. |
| Source unclear | This file is not clear enough to prepare a reliable public preview. Please send a clearer photo, PDF, screenshot, or typed list. | Do not blame the owner. |
| Unsupported request | MenuList can prepare your public customer link. It cannot sync WhatsApp Catalog, Zomato, Swiggy, Instagram, Google, or POS directly from this chat. | Preserve trust. No fake done state. |
| Preview ready | Your preview is ready for review: [preview link]. Check names, prices, services, business details, and customer actions before approval. | Preview URL comes from the runtime flow. |
| Corrections needed | Send the correction in one message. Example: "Haircut is 399, not 299" or "Remove Sunday timing." | Keep correction intake practical. |
| Owner approved | Approved. MenuList will publish the official customer link. | Approval must map to the runtime's actual approval path. |
| Published | Your official customer link is live: [public link]. Use this in WhatsApp replies, Instagram bio, Google profile links, QR, website, print, and staff messages. | Include QR only when available from share tools or sent by the runtime. |
| Follow-up | Have staff send this link whenever customers ask for the latest list: [public link]. | This drives two-surface activation. |
| Opt-out | Understood. We will stop follow-ups for this conversation. | Required for trust and compliance. |

## Prefilled Website Message

Current `/whatsapp` test-number prefill:

```text
Hi MenuList, I want to create an official customer link for my business. I am sending my current menu, service list, rate card, catalog, package list, or price list.
```

## Campaign CTA Rules

Use these only when they open the configured WhatsApp destination or the page clearly labels a non-WhatsApp current-list setup path:

- Send list on WhatsApp
- Forward your list
- Make it official
- Start from current list

Do not use:

- Official WhatsApp partner
- WhatsApp catalog sync
- Auto-sync your WhatsApp store
- Blast customers on WhatsApp
- Guaranteed live in minutes
- No review needed

## Two-Surface Activation

After publish, drive the owner to add the link to at least two customer surfaces within seven days:

1. WhatsApp Business profile or quick reply.
2. Instagram bio.
3. Google Business Profile website/menu link.
4. QR print placement.
5. Website link.
6. Staff reply template.

Activation is not just link creation. It is a published link plus real customer-facing placement.

## Measurement Fields

Track manually until runtime instrumentation is added:

- lead source
- business category
- city
- source type received
- preview ready time
- approval state
- public link state
- surfaces activated
- follow-up state
- paid plan state
- permission status
- opt-out status

## Compliance Guardrails

- Start with inbound, founder-introduced, partner-introduced, or owner-permission conversations.
- Identify MenuList clearly.
- Respect stop/opt-out replies.
- Do not continue promotional follow-ups after no response.
- Do not scrape local business numbers and bulk message them.
- Do not expose raw phone numbers, provider payloads, access tokens, or private customer data in public assets.
- Ask permission before using any real business name, screenshot, message, link, or result in marketing.

## Public Proof Rules

Use fictional demo businesses until permissioned real businesses exist.

For real businesses, collect permission for:

- business name
- before source screenshot
- after public link
- owner quote
- city/category
- video/audio usage
- before/after social post

No permission means no public proof.

## Next Operational Blocker

Before broad traffic goes to the direct click-to-WhatsApp CTA on `/whatsapp`, the founder must confirm:

1. final public onboarding phone number/account;
2. who replies during the campaign;
3. expected response hours;
4. follow-up policy;
5. whether tracking parameters are required.
