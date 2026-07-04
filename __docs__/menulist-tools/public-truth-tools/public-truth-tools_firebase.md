# Public Truth Tools - Firebase Cost Tracking

**Status:** Active family; sixteen V0 tools, a public shareable report layer, and twelve V1 owner readiness modules implemented
**Last Updated:** July 4, 2026
**Audience:** Founder, developers, cost auditors

---

## Summary

The family now has sixteen V0 runtime tools: Public Truth Check, Business Facts Copy Pack, WhatsApp Reply Pack, Customer FAQ Reply Pack, QR Link Health Check, Menu Readability Check, Customer Question Coverage Check, Booking Inquiry Readiness Check, Price Availability Gap Check, Menu PDF Cleanup Check, Google Profile Basics Checklist, One Customer Link Preview, Social Bio Link Consistency Check, WhatsApp Action Link Check, Hours Check, and Photo Gap Check. Their report/check paths add no Firebase usage; their optional follow-up forms reuse the existing public contact enquiry write after consent.

The logged-in owner V1 card now shows twelve readiness modules inside Business Health using the existing owner store context, project summary cache, mobile project cache, and at most one selected/default project read when not already cached. It writes no report state. Customer Question Coverage Check, Booking Inquiry Readiness Check, Price Availability Gap Check, Menu PDF Cleanup Check, and Google Profile Basics Checklist are computed from current MenuList business facts, menu/service truth, public-link readiness, and owner-confirmed handoff fields only. One Customer Link Preview and Social Bio Link Consistency Check map to existing public-link, Share, Public Discovery, and Business Health readiness surfaces without duplicate owner modules. Menu Freshness is owner-only and computed from already-loaded MenuList store/project fields. No V1 module scans Google, Maps, Search, or external sites.

July 1 acknowledgement note: accepted optional follow-up state now requires the existing contact route to return the shared source/status/help-topic acknowledgement after the enquiry write. This changes only response shape and browser guards; it adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, AI/provider calls, Firebase deploy requirement, or Vercel deploy action.

July 2 Maps Place Check note: `mapsPlaceCheck` is documented separately in `../maps-place-check/`. It is a flag-off owner/admin callable that can make one Gemini Google Maps grounding call when enabled. It is not part of the zero-cost public V0 tool loop and writes no report or canonical store state.

July 3 Tools Hub note: Tools Hub at `/tools` is static website UI only. It groups existing public tool links and has no report execution, contact handoff, Firestore read/write, Storage operation, Cloud Function call, external URL fetch, or AI/provider call. It is documented separately in `../tools-hub/`.

July 3 Shareable Tool Reports note: `/tools/reports` is a public viewer that decodes report payloads from the URL hash fragment. It has no report API route, no report collection, no report-view Firestore read/write, no Storage operation, no Cloud Function call, no external URL fetch, and no AI/provider call. Its optional visible follow-up form reuses the existing consented `/api/public/contact` enquiry path and can create one existing contact write; that write is not report storage. The contact write carries bounded `shareable_tool_report` metadata for triage. `/ops/report-leads` can read recent existing enquiries for platform-admin manual triage with 0 writes and no realtime listener. It is documented separately in `../shareable-tool-reports/`.

| Resource | Current cost |
| --- | --- |
| Firestore reads | 0 |
| Firestore writes | 0 during check/report; 1 existing contact enquiry write per accepted optional follow-up |
| Firestore deletes | 0 |
| Storage operations | 0 |
| Cloud Functions | 0 |
| AI/provider calls | 0 |
| Google/Maps/Holiday API calls | 0 |
| Image uploads/analysis calls | 0 |

Estimated current monthly cost: `0`.

---

## V0/V1/V2 Cost Ladder

| Lane | Product behavior | Default cost posture | Storage rule |
| --- | --- | --- | --- |
| V0 public free tool | Public acquisition check, basic report, export, and optional handoff | Prefer static/browser-local behavior with no provider calls; consented handoff may reuse an existing bounded contact/setup flow | Do not store leads unless there is explicit consent and an approved capped contact/setup flow |
| V1 logged-in owner check | Included owner check from current MenuList truth | Current V1 readiness modules reuse owner store context, project summary read, mobile project cache, and at most one selected/default project read; writes nothing | Store at most latest/capped status only if a future Business Health/Public Discovery persistence need is approved |
| V2 paid add-on behavior | Recurring checks, saved history, monthly report, multi-location scan, agency report | Paid entitlement must cover Firestore, scheduler, external adapter, and provider cost | Dedicated capped history is allowed only after paid add-on approval and retention rules |

Do not charge for a better one-time check. Paid value must come from recurrence, saved history, multi-location reporting, agency/client export, partner/reseller reporting, or owner-approved repair work.

---

## Future Cost Rules

Public Truth Tools must be cost-classed before implementation.

| Cost class | Expected operations | Rule |
| --- | --- | --- |
| `static` | No Firebase | Prefer for public education/tools |
| `firestore_low` | Existing store/project reads | Must reuse current summaries and DAL where possible |
| `external_fetch` | Server fetch or source adapter | Requires rate limits, source policy, body caps, and budget guard |
| `ai_provider` | Model calls | Requires SAFE_MODE, operation logging, and non-owner billing mode unless owner-approved |
| `manual_review` | Stored lead/report only | Must use capped summaries or existing contact/onboarding flows |

---

## Preferred Storage Pattern

Avoid per-check document spam.

Preferred:

```txt
platformSummary/publicTruthTools_{sId}
```

Use it only when owner-authenticated report state must be persisted.

Possible shape:

```json
{
  "sId": "123",
  "updatedAt": "serverTimestamp",
  "tools": {
    "public-truth-check": {
      "status": "missing_basics",
      "lastCheckedAt": "timestamp",
      "items": {
        "hours": "present",
        "menu": "present",
        "contact": "missing"
      }
    }
  }
}
```

This keeps reports capped per store.

---

## Disallowed Cost Patterns

Do not create:

- one Firestore document per small check result
- unbounded report history by default
- per-page crawl logs for public users
- public model calls without cost caps
- owner enhancement-pack debits for public/internal checks unless explicitly approved
- scheduled Cloud Functions per tool

Scheduled maintenance, if ever needed, must use the consolidated MenuList maintenance scheduler pattern.

---

## Cost Forecast For Current Tools

The current implemented V0 tools are documented separately in:

- `__docs__/menulist-tools/public-truth-check/public-truth-check_firebase.md`
- `__docs__/menulist-tools/business-facts-copy-pack/business-facts-copy-pack_firebase.md`
- `__docs__/menulist-tools/whatsapp-reply-pack/whatsapp-reply-pack_firebase.md`
- `__docs__/menulist-tools/customer-faq-reply-pack/customer-faq-reply-pack_firebase.md`
- `__docs__/menulist-tools/qr-link-health-check/qr-link-health-check_firebase.md`
- `__docs__/menulist-tools/menu-readability-check/menu-readability-check_firebase.md`
- `__docs__/menulist-tools/customer-question-coverage-check/customer-question-coverage-check_firebase.md`
- `__docs__/menulist-tools/booking-inquiry-readiness-check/booking-inquiry-readiness-check_firebase.md`
- `__docs__/menulist-tools/price-availability-gap-check/price-availability-gap-check_firebase.md`
- `__docs__/menulist-tools/menu-pdf-cleanup-check/menu-pdf-cleanup-check_firebase.md`
- `__docs__/menulist-tools/google-profile-basics-checklist/google-profile-basics-checklist_firebase.md`
- `__docs__/menulist-tools/customer-link-preview/customer-link-preview_firebase.md`
- `__docs__/menulist-tools/social-bio-link-check/social-bio-link-check_firebase.md`
- `__docs__/menulist-tools/whatsapp-action-link-check/whatsapp-action-link-check_firebase.md`
- `__docs__/menulist-tools/hours-check/hours-check_firebase.md`
- `__docs__/menulist-tools/photo-gap-check/photo-gap-check_firebase.md`

The framework itself remains zero-cost until runtime code exists.
