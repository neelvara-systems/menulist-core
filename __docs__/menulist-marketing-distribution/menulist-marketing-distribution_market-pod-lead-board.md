# MenuList Marketing Distribution - Market-Pod Lead Board

**Status:** Active template  
**Created:** June 23, 2026  
**Owner:** Founder with Codex acting as MenuList marketing consultant  
**Related action:** MLD-I002  

---

## Purpose

This is the manual board template for international client acquisition.

It exists so MenuList does not "launch globally" in theory. Each sprint must pick:

1. one market pod;
2. one city;
3. one vertical;
4. one acquisition channel;
5. one measurable action: current list received.

---

## Board Columns

| Column | Required? | Notes |
| --- | --- | --- |
| Lead ID | Yes | Use stable internal ID, not phone number. |
| Business name | Yes | Public business name. |
| City | Yes | City or local area. |
| Country | Yes | Market pod routing. |
| Business type | Yes | Cafe, salon, barber, bakery, car detailing, etc. |
| Source channel | Yes | Google Maps, Instagram, partner, walk-in, referral, Product Hunt, etc. |
| Google/Maps URL | Optional | Research source; not permission to message. |
| Instagram URL | Optional | Research/source channel. |
| Website URL | Optional | Public-list drift evidence. |
| Contact path | Yes | WhatsApp inbound, Instagram DM, email, partner intro, walk-in, upload form. |
| Contact value | Optional | Keep private; do not publish. |
| Consent source | Yes before follow-up | Inbound, partner permission, walk-in, existing relationship, manual public email, none. |
| Current list type | Yes | Menu, service list, rate card, package list, price list, catalog. |
| Public-list problem | Yes | Old PDF, screenshot, missing prices, multiple versions, old QR destination, etc. |
| Lead score | Yes | 0-20 using the score below. |
| Outreach message | Yes if contacted | Link to script or paste final sent message. |
| Owner reply state | Yes | No contact, replied, not interested, asked question, sent list, stop. |
| Source received? | Yes | The key conversion event. |
| Preview state | Yes | Not started, preparing, ready, corrections, approved, abandoned. |
| Public link state | Yes | Not live, live, owner rejected, blocked. |
| Surfaces activated | Yes | WhatsApp, Instagram, Google/profile, QR, website, print, staff replies. |
| Paid state | Yes | Not pitched, pitched, paid, not ready, lost. |
| Permission state | Yes | No public use, anonymized OK, named OK, case-study OK. |
| Opt-out state | Yes | Active, stopped, no further follow-up. |
| Next action | Yes | One concrete next step. |
| Next action owner | Yes | Founder, Codex, partner, operator. |
| Next action date | Yes | Date, not vague. |

---

## Lead Score

Score 0-20. Contact only leads above 11 unless founder chooses a relationship-based exception.

| Signal | Score |
| --- | --- |
| Has visible menu/service/price/package/catalog list | 0-4 |
| List exists in 2+ public places | 0-4 |
| List likely changes often | 0-4 |
| Customers ask for menu/prices/services | 0-4 |
| Owner likely wants assisted setup | 0-4 |

Score interpretation:

| Score | Action |
| --- | --- |
| 0-7 | Do not contact. Research only. |
| 8-11 | Park unless warm intro exists. |
| 12-15 | Manual audit candidate. |
| 16-20 | Priority outreach or walk-in candidate. |

---

## Status Values

Use fixed states so the board stays measurable.

| Field | Allowed values |
| --- | --- |
| Owner reply state | no-contact, sent, replied, asked-question, sent-list, not-interested, stop |
| Preview state | not-started, preparing, ready, corrections, approved, abandoned, blocked |
| Public link state | not-live, live, rejected, blocked |
| Paid state | not-pitched, pitched, paid, not-ready, lost |
| Permission state | none, anonymized-ok, named-ok, case-study-ok |
| Opt-out state | active, stopped |

---

## First Sprint Template

Do not start with all SMBs.

Recommended first sprint:

| Field | Default |
| --- | --- |
| Market pod | India + GCC |
| City | Founder chooses |
| Vertical | Founder chooses one: salons/spas/barbers or cafes/bakeries |
| Channel | WhatsApp-first via inbound, warm intro, Instagram reply, partner intro, or walk-in |
| Lead count | 50 researched, 20 qualified, 10 contacted |
| Success target | 5 current lists received |

This is intentionally smaller than the public challenge. The goal is signal, not volume.

---

## CSV Header

Use this when creating the first sheet:

```csv
lead_id,business_name,city,country,business_type,source_channel,google_maps_url,instagram_url,website_url,contact_path,contact_value,consent_source,current_list_type,public_list_problem,lead_score,outreach_message,owner_reply_state,source_received,preview_state,public_link_state,surfaces_activated,paid_state,permission_state,opt_out_state,next_action,next_action_owner,next_action_date,notes
```

---

## Outreach Rule

Every outreach message must be specific:

Bad:

> We are MenuList, a SaaS platform for SMBs.

Better:

> I noticed your rate card/menu appears in more than one public place. When it changes, customers may still see old versions. MenuList can prepare one official customer link from your current list before payment. Can I prepare a preview?

If the contact channel is WhatsApp, follow `menulist-marketing-distribution_whatsapp-compliance-checklist.md`.

---

## Blockers Before Real Lead Collection

Founder must choose:

1. first city;
2. first vertical;
3. allowed contact path;
4. outreach sender identity;
5. whether Codex should prepare a real lead list from public sources or only the board template.
