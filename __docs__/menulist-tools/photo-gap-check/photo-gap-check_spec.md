# Photo Gap Check - Product Spec

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 4, 2026
**Audience:** CEO / PM / product reviewers

---

## 1. Product Job

Help an SMB owner answer:

> Can customers recognize this business and understand what it offers from the visuals on its public source?

The tool checks visual coverage from owner-selected facts. It does not verify or analyze images.

---

## 2. User

Primary V0 users:

- restaurant owner checking logo, cover, storefront, and menu-item photos
- salon, clinic, shop, studio, or service owner checking visual proof
- agency/freelancer preparing a public customer link
- owner with old social/profile photos and no current customer source

---

## 3. V0 Input

V0 collects owner-selected facts only:

| Field | Purpose |
| --- | --- |
| Business name | Report label |
| City or locality | Report context |
| Business type | Helps frame product/service photo row |
| Current customer link | Optional current public source reference |
| Logo present | Owner self-report |
| Cover image present | Owner self-report |
| Location/team/work photo present | Owner self-report |
| Product/service/catalogue photos present | Owner self-report |
| Photos look current | Owner self-report |
| Public page already shows images | Owner self-report |

V0 does not upload, fetch, inspect, store, or analyze images.

---

## 4. V0 Report Rows

| Row | Result source | Evidence rule |
| --- | --- | --- |
| Logo | Owner selection | Checks selected visible fact only |
| Cover image | Owner selection | Checks selected visible fact only |
| Location or team photo | Owner selection | Checks selected visible fact only |
| Product or service photos | Owner selection and business type | Checks selected visible fact only |
| Photo context | Owner selection | Checks whether owner says photos look current |
| Public page images | Owner selection | Checks whether owner says current customer page shows images |
| Current customer link | Entered URL | Checks URL format only; does not open the link |
| External photo verification | Boundary row | Always `not_checked` in V0 |

Every row includes `evidenceText` explaining what was actually checked.

---

## 5. Status Rules

| Status | Meaning |
| --- | --- |
| Ready | Visual basics, current photo context, public page images, and current link are present |
| Missing basics | No core visual asset is selected |
| Unclear | Some visual assets exist but important visual or link facts are missing |
| Not checked | Reserved for future adapter-only states |
| Manual review needed | Reserved for future setup/manual-review flows |

V0 should prefer `unclear` over false certainty when owner-selected facts are incomplete.

---

## 6. Out Of Scope

V0 must not:

- upload files
- store images
- analyze image quality
- count image objects from a file picker
- inspect Google Business Profile, Instagram, Facebook, websites, directories, or social profiles
- fetch the current customer link
- generate image recommendations
- create a report API route
- update MenuList store truth
- mutate external platforms
- call AI/search providers
- promise ranking, citations, visits, bookings, orders, or revenue

---

## 7. V1 Owner Check

V1 should live inside existing owner surfaces such as Official Business Page readiness, Business Health, Public Discovery, setup flow, or Share/QR readiness.

V1 can use actual MenuList truth:

- OBP logo/cover image state
- store profile media
- menu/service item image coverage
- public page image visibility
- current customer link readiness
- missing visual slots surfaced as direct fix actions

V1 should not create a separate visual identity dashboard.

---

## 8. V2 Paid Add-On

Paid behavior is justified only when it adds:

- recurring visual coverage checks
- saved history
- monthly owner/agency reports
- multi-location image coverage reports
- partner setup reports
- owner-approved repair workflow

A better one-time check is not enough for paid packaging.

---

## 9. Language Rules

Use calm wording:

- "Visual basics are ready"
- "Logo is missing"
- "Images were not uploaded"
- "Google and Instagram were not inspected"

Avoid anxiety or unsupported claims:

- "Your brand looks bad"
- "You are losing customers"
- "We verified your photos"
- "AI image score"
- "Ranking improvement"
