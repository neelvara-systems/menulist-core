# Shareable Tool Reports - Follow-Up Playbook

**Status:** Operational playbook for consented report leads
**Last Updated:** July 5, 2026
**Audience:** Founder, support, sales, setup partners

---

## Purpose

The public report funnel should stay simple:

```txt
free public tool -> shareable report -> report gaps become setup job list -> consented follow-up -> MenuList setup/fix path
```

The follow-up form is not a saved report system. It creates one existing public contact enquiry and tags that enquiry with report metadata so the team can understand the requested work.

---

## Where To Find These Leads

Report follow-up requests are stored in the existing `landingPageEnquiries` collection through `/api/public/contact`.

The manual-refresh ops view is `/ops/report-leads`. Use it for daily triage before going directly to Firestore.

Filter by:

| Field | Value |
| --- | --- |
| `source` | `menulist_public_contact` |
| `sourceKind` | `shareable_tool_report` |
| `sourceToolId` | Source tool id, for example `photo-gap-check` |
| `sourceReportStatus` | `ready`, `missing_basics`, `unclear`, `not_checked`, or `manual_review_needed` |

The nested `sourceContext` object carries the same bounded details:

| Field | Meaning |
| --- | --- |
| `toolId` | Which public tool generated the report |
| `reportStatus` | The report's overall status |
| `businessName` | Owner-entered business name when present |
| `businessContext` | Owner-entered city/context when present |
| `reportGeneratedAt` | Canonical ISO source-tool timestamp; invalid direct submissions are `null` |
| `missingCount` | Number of missing rows in the shared report |
| `unclearCount` | Number of unclear rows in the shared report |
| `notCheckedCount` | Number of not-checked rows in the shared report |
| `primaryNumber` | The one honest number shown by the report |
| `setupJobList` | Up to six bounded setup jobs derived from visible missing, unclear, or not-checked report rows |

The `message` field contains a bounded text summary for human reading. It is not canonical truth and should not be written into MenuList business data without owner confirmation.

The ops view reads recent leads only. If an older lead is not visible there, use Firestore with the same fields above.

---

## Triage

Use the metadata to choose the first response.

Start with `setupJobList` when present. The report gaps become the setup job list; each item is a paid/setup-work candidate only after the owner confirms the source truth.

| Signal | Follow-up path |
| --- | --- |
| `missing_basics` with missing count greater than 0 | Offer to create or import one current customer link |
| `unclear` with unclear count greater than 0 | Ask for the owner-approved source and propose cleanup inside MenuList |
| `ready` | Offer to publish, share, or connect the current customer link to the owner's public surfaces |
| `manual_review_needed` or many `notChecked` rows | Explain what was not checked and offer manual setup help |
| Multiple locations mentioned in `message` | Treat as multi-location or agency/reporting candidate, not a better free one-time check |

---

## First Reply Template

Use calm operational language:

```txt
Thanks for sending the report. I checked the submitted MenuList tool summary.

The useful next step is to create or clean up one current customer link for the business, then use that link wherever customers already look.

The report gaps become this setup job list:
- menu/service cleanup
- hours and action links
- QR/share link readiness
- photo/profile basics
- public page setup

This report did not inspect external platforms unless the tool explicitly said it did.
```

Adjust the middle bullets to the source tool. Keep the promise tied to MenuList setup work.

---

## Boundaries

Do not say:

- "Your AI visibility is poor."
- "We scanned Google."
- "We can update your Google/Instagram/Facebook profile automatically."
- "This will improve ranking."
- "This report is saved history."
- "This is a recurring monitor."

Say:

- "This report shows what the public tool checked."
- "The next step is one current customer link."
- "We can help clean up the facts and publish them through MenuList."
- "External platforms need owner-approved handoff unless a specific approved adapter exists."

---

## Upgrade Path

Paid work should be framed as setup or recurring operations:

| Customer need | Offer |
| --- | --- |
| One messy menu, service list, PDF, or profile | Managed setup / cleanup |
| Repeated stale facts | Public Truth Monitor candidate |
| Multiple branches | Multi-location consistency candidate |
| Agency handling many SMBs | Agency setup report pack candidate |

Do not sell a better one-time report as the paid product. The paid value is the work, recurrence, history, multi-location reporting, or partner reporting.
