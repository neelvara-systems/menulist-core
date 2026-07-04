# Hours Check - Product Spec

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 4, 2026
**Audience:** CEO / PM / product reviewers

---

## 1. Product Job

Help an SMB owner answer:

> Can a customer clearly understand when this business is open, closed, or operating on special hours?

The tool checks hours clarity from owner-entered facts. It does not verify the business on external platforms.

---

## 2. User

Primary V0 users:

- restaurant owner publishing normal and festival hours
- salon, clinic, repair shop, studio, or retail owner with weekly closed days
- business that handles orders, pickup, appointments, or walk-ins
- agency/freelancer setting up a current customer link for an SMB client
- multi-location prospect that may later need recurring or branch-level hours reporting

---

## 3. V0 Input

V0 collects owner-entered facts only:

| Field | Purpose |
| --- | --- |
| Business name | Report label |
| City or locality | Location timing context |
| Timezone or country | Clarifies timing for customers |
| Regular hours | Main day/time text |
| Closed days | Weekly closed days or open-daily note |
| Late-night handling | Owner-selected midnight boundary clarity |
| Special or holiday hours | Owner-selected status |
| Special hours note | Festival, seasonal, temporary, or no-special-days text |
| Current customer link | Optional current MenuList/public link reference |
| Contact fallback shown | Owner self-report for call, WhatsApp, booking, or contact fallback |

V0 does not fetch, inspect, verify, store, or publish these sources.

---

## 4. V0 Report Rows

| Row | Result source | Evidence rule |
| --- | --- | --- |
| Regular hours | Entered regular-hours text | Checks day and time words locally |
| Closed days | Entered closed-day text and regular-hours text | Checks closed/open-daily wording locally |
| Late-night hours | Owner selection and hours text | Checks whether midnight-crossing hours are marked clearly |
| Holiday hours | Owner selection and special-hours text | Checks listed or no-special-days state locally |
| Location timing | City, area, timezone, or country text | Checks location/time context locally |
| Contact fallback | Owner selection | Checks whether a visible fallback is indicated |
| Current customer link | Entered URL | Checks URL format only; does not open the link |
| External hours verification | Boundary row | Always `not_checked` in V0 |

Every row includes `evidenceText` explaining what was actually checked.

---

## 5. Status Rules

| Status | Meaning |
| --- | --- |
| Ready | Regular hours, closed-day clarity, special-hours state, timing context, contact fallback, and current customer link are present or not needed |
| Missing basics | Regular hours or timing context are missing |
| Unclear | Basic hours exist but supporting facts are missing or ambiguous |
| Not checked | Reserved for future adapter-only states |
| Manual review needed | Reserved for future setup/manual-review flows |

V0 should prefer `unclear` over false certainty when owner-entered facts are incomplete.

---

## 6. Out Of Scope

V0 must not:

- inspect Google Business Profile, maps, websites, directories, or social profiles
- fetch the current customer link
- call a holiday calendar API
- infer local public holidays
- store the report
- create a report API route
- update MenuList store hours
- mutate external platforms
- call AI/search providers
- promise ranking, citations, visits, orders, bookings, or revenue

---

## 7. V1 Owner Check

V1 should live inside existing owner surfaces such as Business Health, Public Discovery, Official Business Page readiness, or Share/QR readiness.

V1 can use actual MenuList truth:

- store/project regular hours
- temporary status and holiday/special hours
- OBP/public page hours visibility
- current customer link readiness
- call/WhatsApp/booking fallback
- multi-location hours consistency signal if already loaded in owner context

V1 should not create a separate hours dashboard.

---

## 8. V2 Paid Add-On

Paid behavior is justified only when it adds:

- recurring checks
- saved history
- monthly owner/agency reports
- multi-location branch hours consistency
- holiday readiness reminders
- owner-approved repair workflow

A better one-time check is not enough for paid packaging.

---

## 9. Language Rules

Use calm wording:

- "Hours are ready for a customer link"
- "Holiday hours are missing"
- "Google was not inspected"
- "Checked entered fields only"

Avoid anxiety or unsupported claims:

- "Your hours are broken"
- "You are losing visits"
- "We verified Google"
- "Ranking improvement"
- "AI visibility opportunity"
