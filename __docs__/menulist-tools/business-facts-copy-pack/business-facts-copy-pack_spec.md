# Business Facts Copy Pack - Product Spec

**Status:** Implemented V0 public browser-local tool
**Last Updated:** July 16, 2026
**Audience:** CEO / PM / product reviewers

---

## 1. Product Job

Help an SMB owner answer:

> Can I reuse the same clear business facts everywhere customers find or message us?

This is an output tool, not a scan. The owner enters facts once and receives copy blocks they can reuse.

## 2. User

Primary V0 users:

- restaurant owner updating profile text, WhatsApp replies, and printed QR notes
- salon, clinic, repair shop, studio, class, or local service owner with scattered public facts
- agency or freelancer preparing client setup material
- mobile-first owner who needs clear WhatsApp/staff copy before publishing a customer link

## 3. V0 Input

V0 collects owner-entered facts only:

| Field | Purpose |
| --- | --- |
| Business name | Copy and report label |
| City or area | Location context |
| Business type | Simple category wording |
| What customers can get | Offer/menu/service summary |
| Short description | Owner-approved profile description |
| Hours | Customer timing context |
| Location or service area | Visit/delivery/service context |
| Phone or WhatsApp | Contact path |
| Current customer link | MenuList or other customer-facing link format check only |
| Booking, order, or enquiry link | Optional action path format check only |
| Preferred customer action | Call, message, book, order, visit, request quote, or ask |

## 4. V0 Output

The tool returns:

- overall status
- check rows with `evidenceText`
- generated copy blocks
- one next action into MenuList
- copy report
- copy public report link
- download report
- optional consented follow-up

Copy blocks:

- Google/Profile description
- WhatsApp Business about text
- Instagram/Facebook bio
- Website/contact snippet
- Staff answer card
- Customer link share text

All copy is deterministic string assembly from owner-entered facts plus explicit missing-fact placeholders. No AI rewrite is generated.

## 5. Report Rows

| Row | Source | Evidence rule |
| --- | --- | --- |
| Business identity | Owner-entered business name, type, and area | Checked entered fields only |
| Public description | Owner-entered short description and offer summary | Checked length and presence only |
| Offer/menu/service summary | Owner-entered offer text | Checked whether customer-facing offer text exists |
| Hours | Owner-entered hours | Checked entered field only |
| Location or service area | Owner-entered area text | Checked entered field only |
| Contact path | Owner-entered phone or WhatsApp | Checked presence and simple format only |
| Customer action | Selected action and optional action link | Checked owner selection and URL format only |
| Current customer link | Entered URL | Checked URL format only; not opened |
| Copy blocks | Generated from entered facts | Confirms deterministic copy pack was created |
| External platform update | Boundary row | Always not checked in V0 |

## 6. Status Rules

| Status | Meaning |
| --- | --- |
| Ready | Identity, offer/description, contact path, customer action, and current customer link are present |
| Missing basics | Business identity, offer/description, or contact path is missing |
| Unclear | Core facts exist but hours, location, action, or current link are incomplete |
| Not checked | Reserved for empty/adapter-only future states |
| Manual review needed | Reserved for setup/manual-review flows |

V0 should prefer `unclear` over false certainty when owner-entered facts are incomplete.

## 7. Out Of Scope

V0 must not:

- fetch or inspect a website
- open Google, Instagram, Facebook, WhatsApp, directories, or maps
- verify profile ownership
- update external platforms
- send WhatsApp messages
- store report history
- create a report API route
- call AI/search providers
- generate AI rewrites
- promise rankings, citations, traffic, orders, bookings, or conversion

## 8. V1 Owner Check

V1 lives inside the shared Business Health/Public Truth owner card and may also surface through Public Discovery, OBP readiness, or setup flows.

V1 can generate the same copy blocks from actual MenuList store/project truth:

- store name
- location/service area
- hours/temp status
- menu/service summary
- customer link
- action links
- phone/WhatsApp

V1 does not create a new dashboard.

## 9. V2 Paid Add-On

Paid behavior is justified only when it adds:

- recurring business fact readiness checks
- saved copy history
- multi-location consistency reports
- agency/client setup exports
- owner-approved managed setup or repair

A better one-time copy pack is not enough for paid packaging.

## 10. Language Rules

Use calm wording:

- "Copy pack is ready"
- "Current customer link is missing"
- "Checked entered facts only"
- "No external profile was opened"

Avoid unsupported claims:

- "Your Google profile is fixed"
- "We updated WhatsApp"
- "This improves ranking"
- "AI visibility boost"
- "Customers will order more"
