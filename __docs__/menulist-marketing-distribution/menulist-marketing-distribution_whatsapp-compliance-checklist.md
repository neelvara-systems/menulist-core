# MenuList Marketing Distribution - WhatsApp Compliance Checklist

**Status:** Active checklist  
**Created:** June 23, 2026  
**Owner:** Founder with Codex acting as MenuList marketing consultant  
**Scope:** WhatsApp, Instagram DM, email, and manual outreach guardrails for MenuList marketing/distribution.

---

## Purpose

This checklist keeps the WhatsApp-first campaign usable without damaging trust, sender reputation, or platform access.

It is not legal advice. It is the operating guardrail for MenuList launch work until legal review or a jurisdiction-specific policy replaces it.

Primary source checks:

- WhatsApp Business Messaging Policy: https://whatsappbusiness.com/policy/
- WhatsApp Business Terms: https://www.whatsapp.com/legal/business-terms
- Product and campaign docs in `__docs__/messaging-onboarding/`
- MenuList marketing-distribution action register

---

## Launch Rule

Use WhatsApp as an inbound or permission-based intake channel.

Do not use WhatsApp as a scraped-number outbound blast channel.

Allowed:

- owner starts chat from `/whatsapp`
- owner replies to a founder, partner, or warm-intro message
- partner submits a client list with permission
- owner explicitly asks for a preview
- follow-up stays tied to the current list they sent

Blocked:

- scraping Google Maps/Instagram phone numbers and bulk messaging
- repeated promotional messages after no response
- pretending to be WhatsApp, Meta, Google, an agency, or a customer
- using WhatsApp logo or language as if MenuList is officially partnered
- implying MenuList syncs WhatsApp Catalog, Instagram, Google, Yelp, Apple, LINE, Kakao, POS, Zomato, or Swiggy automatically

---

## Consent Sources

| Source | Can contact? | Rule |
| --- | --- | --- |
| `/whatsapp` click-to-chat | Yes | Owner started the conversation. Keep replies tied to the requested onboarding. |
| Partner-introduced owner | Yes, if permission is explicit | Record partner name and permission context in the lead board. |
| Instagram DM after business replies | Yes, manually | Keep it specific to the public-list issue; offer WhatsApp/upload path. |
| Google Maps phone number | No for WhatsApp blasting | Use for research only unless the owner starts contact or another lawful/manual route is approved. |
| Public email | Manual only | Must include clear identity and opt-out if commercial. |
| Walk-in / in-person consent | Yes | Record permission source and next agreed channel. |
| Existing customer | Yes within relationship | Keep context clear; respect opt-out immediately. |

---

## Required Message Hygiene

Every first-touch or follow-up message must:

1. identify MenuList clearly;
2. state why the owner is being contacted;
3. ask for the current list, not for a demo call first;
4. avoid pressure, fake urgency, fake metrics, or revenue-loss claims;
5. include a plain stop path when the message is promotional or follow-up oriented;
6. avoid any guarantee around speed, ranking, sales, indexing, or platform updates.

Approved first-contact shape:

```text
Hi, this is MenuList. I noticed your business shares a menu/service/rate list across public customer channels. MenuList can prepare one official customer link from your current list before payment. If useful, send the latest list here or tell me to stop.
```

For `/whatsapp` inbound:

```text
Received. Please send business name, city, list type, and the latest PDF/photo/screenshot/link you want customers to trust.
```

For stop/opt-out:

```text
Understood. We will stop follow-ups for this conversation.
```

---

## WhatsApp Provider Boundaries

Before production WhatsApp traffic:

| Gate | Required state |
| --- | --- |
| Public number/account | Founder-approved production onboarding number, not the test number. |
| Response owner | Named human or operating rota. |
| Response hours | Published internally before campaign traffic. |
| Provider secrets | Set outside repo; no secrets committed. |
| Webhook readiness | Verified through messaging-onboarding runbook. |
| Consent copy | Present in scripts and lead board. |
| Opt-out handling | Operator knows where suppression is recorded. |
| Tracking | Manual board or runtime event decision exists. |

Do not run click-to-WhatsApp ads until all gates are satisfied.

---

## Data Handling

Store only what is needed for the campaign:

- business name
- city/country
- contact channel
- consent source
- list type
- preview status
- approval status
- public link status
- opt-out status

Do not store or publish:

- raw provider tokens
- private customer conversations
- personal customer phone numbers from owner files
- real screenshots without permission
- unredacted owner messages in public assets

---

## Proof Permission Checklist

Before using a real business in marketing, get permission for each item:

| Proof item | Permission required? |
| --- | --- |
| Business name | Yes |
| City/category | Yes |
| Before screenshot/source | Yes |
| After public link | Yes |
| Owner quote | Yes |
| Logo/photo | Yes |
| Video/audio | Yes |
| Revenue, conversion, or performance result | Do not use without measured source and written approval |

Use fictional demo businesses until permission exists.

---

## Regulated And Sensitive Verticals

Avoid WhatsApp promotional messaging for regulated or sensitive verticals until reviewed:

- alcohol
- gambling/gaming
- medical/pharma
- financial products
- adult content
- political or issue-based messaging
- age-restricted services

For clinics, wellness, and similar SMBs, keep the claim to public service-list clarity. Do not make medical outcome, diagnosis, treatment, or compliance claims.

---

## Pre-Campaign Checklist

Do not run a WhatsApp campaign until every item is checked:

| Item | Status |
| --- | --- |
| Production WhatsApp account confirmed | Blocked |
| Response owner and hours confirmed | Blocked |
| Lead board includes consent and opt-out fields | Ready after market-pod board adoption |
| Permission script ready | Ready in this checklist |
| Stop/opt-out script ready | Ready in this checklist |
| Proof permission checklist ready | Ready in this checklist |
| No unsupported WhatsApp/Meta claims in copy | Required before every public asset |
| No scraped-number bulk outreach | Permanent rule |

---

## Done Criteria

This checklist is operationally ready when:

1. it is linked from the marketing-distribution README;
2. MLD-W009 is marked done;
3. market-pod lead board includes consent and opt-out fields;
4. every outreach script references this guardrail before use.
