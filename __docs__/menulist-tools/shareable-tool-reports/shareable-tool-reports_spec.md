# Shareable Tool Reports - Product Spec

**Status:** Implemented V0
**Last Updated:** July 3, 2026
**Audience:** CEO / PM

---

## Job

Let any public MenuList Tool report become easy to forward without forcing the recipient to create a MenuList account.

Owner/prospect flow:

```txt
Run a free public check
-> see a concrete report
-> copy public report link
-> share with partner, staff, agency, or MenuList
-> follow the natural MenuList fix path
```

---

## Why It Matters

The public tools are useful only if the output travels.

The microtool funnel principle is:

- the tool has one low-friction input
- the report is the asset
- the report lives at a link
- each gap maps to work MenuList can do
- the next action is obvious

MenuList should use this pattern for public business truth tools, not for generic SEO scoring or fake AI visibility claims.

---

## V0 Scope

V0 includes:

- public report viewer route: `/tools/reports`
- browser-local report payload in URL hash fragment
- shared payload schema version
- payload size cap
- safe internal next-action link guard
- explicit checked and not-checked text
- explicit evidence text for every row
- copy report link, copy report text, and download report from the viewer
- optional consented follow-up form on the viewer
- bounded report source metadata on the existing contact enquiry when the user submits the follow-up form
- all current public MenuList Tool report-card integrations

V0 does not include:

- stored report URLs
- Firestore report documents
- owner login
- report history
- monthly reporting
- competitor tracking
- crawling
- external profile inspection
- AI/search sampling
- ranking or citation promises

---

## Report Contract

Every shareable report must include:

| Field | Purpose |
| --- | --- |
| `toolId` | Stable source tool id |
| `toolName` | Human-readable tool name |
| `reportTitle` | Export/report title |
| `generatedAt` | Timestamp produced by the source tool |
| `status` | Bounded status such as `ready`, `missing_basics`, or `unclear` |
| `statusTitle` / `statusDescription` | Plain-language result |
| `checkedSourceText` | What the tool actually checked |
| `notCheckedText` | What it did not check |
| `summary` | One honest number plus present/missing/unclear/not-checked counts |
| `checks[]` | 3-16 rows, each with label, result, helper text, and evidence text |
| `nextAction` | One MenuList action |
| `publicBoundary[]` | Share-page limits |

The report must never imply a source was fetched, opened, stored, scanned, or changed unless the source tool actually did that.

---

## Publicness Rule

The viewer is public by design.

The user must not need to be a MenuList user to open a report link. The base viewer route is discoverable, while individual hash payloads are not added to sitemap because they are URL fragments.

The viewer may accept a consented follow-up request through the existing `/api/public/contact` route. That request sends a bounded report summary, contact details, and a small `sourceContext` object with tool id, report status, owner-entered business context, and summary counts. It does not create a report record, stored report URL, or recurring report history.

---

## Upgrade Path

V0 is shareable links.

V1 should add the same report-link behavior to future public tools when their report cards are created.

V2 can introduce stored reports only when a paid feature needs recurring checks, saved history, multi-location reporting, agency reports, or done-for-you repair workflow. That requires a new spec, retention policy, entitlement check, cost cap, and abuse policy.
