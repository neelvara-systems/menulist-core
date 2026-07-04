# Public Truth Check - Firebase Cost Tracking

**Status:** Implemented - public self-report route and logged-in owner check
**Last Updated:** July 4, 2026
**Audience:** Founder, developers, cost auditors

---

## Summary

The implemented public report runs in the browser. The optional follow-up form can add one existing public contact enquiry write only after explicit consent.

July 1 acknowledgement note: the optional follow-up still reuses `/api/public/contact`, but the browser now requires the route's source/status/help-topic acknowledgement before submitted state. This changes no report-time Firebase usage and adds no new write path.

The implemented owner report runs inside Business Health. It reads existing MenuList owner truth through the current store context, the project summary DAL, and at most one selected/default project DAL read when the project is not already cached. It writes no Public Truth report state.

The July 4 owner fix list is cost-neutral. `setupJobList` is derived in memory from already-computed readiness modules and adds no Firestore reads, writes, deletes, Storage operations, Cloud Functions, provider calls, report history, or public-truth mutation.

| Resource | Current operations | Current cost |
| --- | --- | --- |
| Firestore reads | Public route: 0. Owner check: existing `storeDetails` context plus up to 1 `platformSummary/projects_{sId}` read and up to 1 selected/default project read when not already cached | Low; SWR-deduped and reused from existing owner DAL |
| Firestore writes | 0 during public/owner check/report; 1 `landingPageEnquiries` write per accepted public follow-up request through existing `/api/public/contact` | Low, proportional to consented follow-up submits |
| Firestore deletes | 0 | 0 |
| Storage operations | 0 | 0 |
| Cloud Functions | 0 | 0 |
| AI/provider calls | 0 | 0 |

Current implementation paths:

- `src/app/(website)/tools/public-truth-check/page.tsx`
- `src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx`
- `src/lib/public-truth-tools/publicTruthCheckReport.ts`
- `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts`
- `src/hooks/publicTruthTools/useOwnerPublicTruthReadiness.ts`

No new API route, Firestore collection, Storage operation, Cloud Function, or AI/provider call is used by V0 or V1. The follow-up form reuses the existing public contact API and its existing Firestore write path.

---

## Version Cost Ladder

| Version | Product behavior | Firebase posture | Provider posture | Approval rule |
| --- | --- | --- | --- | --- |
| V0 public free tool | Public lead magnet, basic report, report export, and optional follow-up | Check/report remains zero-cost; accepted follow-up uses one existing contact enquiry write | No external fetch, Google inspection, AI/search call, or crawler | Lead storage requires explicit consent, capped payload, and reuse of the existing public contact route |
| V1 logged-in owner check | Business Health/Public Discovery gaps from MenuList truth | Reuses owner store context, existing project summary read, mobile project cache, and at most one selected/default project read; no writes | No external provider | Any future write must be capped and justified; current V1 writes nothing |
| V2 paid add-on behavior | Recurring checks, saved history, monthly reports, multi-location and agency reports | Capped paid report history only after add-on approval | External adapters or AI/search sampling require SAFE_MODE, rate limits, source policy, and budget cap | Paid entitlement, audit trail, cost ledger, and retention rule are required before launch |

---

## Future Mode Cost Model

| Mode | Reads | Writes | Storage | Provider calls | Notes |
| --- | --- | --- | --- | --- | --- |
| `self_report` client-only | 0 | 0 | 0 | 0 | Lowest-cost public tool mode |
| `self_report` saved lead | 0 | 1 per submitted lead | 0 | 0 | Prefer existing contact/public-entry flow |
| `menulist_owner` | Existing store context plus up to 1 project summary read and 1 selected/default project read when not already cached | 0 | 0 | 0 | Current V1 implementation |
| `manual_review` | 0-1 | 1 request/write | Optional source upload outside V0 | 0 | Requires consent, retention rule, cost note, and cleanup rule |
| `approved_adapter` | 0-1 MenuList reads | 1 capped report write | 0 | External fetch cost | Requires source policy and budget cap |
| `ai_search_readability` | Existing report/source reads | 1 capped report write | 0 | Model/provider calls | Internal/paid only, not owner credits by default |

---

## Preferred Firestore Shape

If saved owner reports are needed:

```txt
platformSummary/publicTruthTools_{sId}
```

Store only latest/capped state:

```json
{
  "tools": {
    "public-truth-check": {
      "status": "missing_basics",
      "lastCheckedAt": "timestamp",
      "checks": {
        "hours": "missing",
        "menu_or_service_source": "present",
        "contact": "present"
      }
    }
  }
}
```

Do not create one document per report unless a paid recurring report feature is explicitly approved.

---

## Public Lead Storage

If the public tool captures contact details:

- require explicit consent
- use existing contact or public menu entry infrastructure where possible
- cap stored payload length
- V0 does not store uploaded files
- do not store raw uploaded files unless the user is entering an approved setup or manual-review flow with documented consent, retention, Firebase cost, and cleanup rules
- do not store unverified external facts as MenuList truth

---

## Cost Guardrails

- No arbitrary URL crawling.
- No model calls in public free mode.
- No per-check Firestore writes.
- No scheduled Cloud Function per tool.
- No owner enhancement pack debit for public/internal checks unless explicitly approved.
- No unbounded report history.

---

## Estimated Launch Cost By Safe Mode

| Launch shape | Monthly Firebase cost expectation |
| --- | --- |
| Static/client-only public page | 0 |
| Public page with lead submit | Low, proportional to form writes |
| Owner-authenticated status card | Low if it reuses existing store/project context |
| Recurring report history | Not approved in this planning pass |

---

## Implemented V1 Read Detail

| Surface | Read path | Count | Notes |
| --- | --- | --- | --- |
| Desktop Business Health | `PlatformGlobalDataContext.storeDetails` | Existing context | No additional Firestore read in this feature |
| Desktop Business Health | `getExistingProjectsListWithoutLoader(true)` | 1 summary read when SWR cache is cold | Shares the existing `businessHealthProjectScope` SWR key used by the Business Health scope selector; uses `platformSummary/projects_{sId}` and does not create a default project |
| Desktop Business Health | `getProjectDataWithoutLoader(projectId)` | 0-1 read when a selected/default project exists and is not cached | Used for item, price, menu/service clarity, QR-link readiness, hours, WhatsApp action, and photo/visual identity module checks |
| Mobile Business Health | `useMobileProjects()` | Existing mobile project cache | Reuses summaries and cached selected project where available |
| Mobile Business Health | `getProjectDataWithoutLoader(projectId)` | 0-1 read when the checked project is not already in mobile cache | Same DAL as desktop |

No Public Truth Check state is stored for V1. The July 1 owner-side module expansion reuses the same read path and still writes no report state. Saved history remains V2-only.

The exact owner fix loop added on July 1 is navigation-only. Desktop `fixHref` values and mobile `mobileFixTarget` values route owners to existing Business Settings, Projects, QR/Share, Official Page, Hours, or Presence Monitor surfaces. They add no new Firestore reads, writes, Storage operations, API routes, Cloud Functions, providers, or report-history documents.

No uploaded files are stored by the V0 public free tool. Persisted upload support belongs to approved setup, public menu entry, or manual-review flows only.
