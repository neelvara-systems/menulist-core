# AI System Layer — Firebase Cost Tracking

**Feature:** Centralized AI Infrastructure for MenuList  
**Status:** ✅ CURRENT CODEBASE TRUTH — Existing ledgers plus daily provider health records
**Last Updated:** June 25, 2026

---

## Summary

- **Existing extraction audit ledger:** `MENULIST_AI_OPERATIONS`
- **Existing billable app-route ledger:** `menulistAiOperations/{tId}/{sId}/{docId}`
- **New MenuList health record:** `_health/aiProvider_gemini`
- **New Answerlattice health record:** `platformSummary/answerlatticeAiProviderHealth`
- **No new `aiUsageLog` collection:** That older design remains deferred and is not part of the active schema.

The AI System Layer should avoid creating a write per internal AI call unless the operation is billable, owner-visible, or needed for incident response. The daily provider health checks add only one small status write per product per UTC day.

---

## Firestore Operations

### Reads

| Operation | Backend | Trigger | Frequency | Docs Read | Notes |
| --- | --- | --- | --- | --- | --- |
| Route rate limit check | Upstash Redis | Protected AI app routes | Per guarded request | 0 Firestore | Existing route guard; not a Firestore read |
| Scheduler health previous status | Firestore Admin SDK | Answerlattice health task | Once per scheduler run | 1 | Skips duplicate successful checks inside the same UTC day |

### Writes

| Operation | Collection/path | Trigger | Frequency | Docs Written | Notes |
| --- | --- | --- | --- | --- | --- |
| Extraction audit | `MENULIST_AI_OPERATIONS` | Menu extraction completion | Per extraction job | 1 | Existing detailed Cloud Functions audit record |
| Billable app-route operation | `menulistAiOperations/{tId}/{sId}` | Successful billable app-route AI output | Per charged operation | 1 | Existing route accounting path |
| MenuList provider health | `_health/aiProvider_gemini` | `menulistMaintenanceScheduler.ai_provider_health_check` | Daily | 1 | Records provider/model/latency/status/key stats |
| Answerlattice provider health | `platformSummary/answerlatticeAiProviderHealth` | `answerlatticeMasterScheduler.ai_provider_health_check` | Daily | 1 | Records provider/model/latency/status |

### Deletes

No new delete path was added for this hardening pass.

---

## Cost Estimate

### Daily Provider Health

| Resource | Operations/month | Monthly Cost Impact |
| --- | --- | --- |
| MenuList health writes | ~30 writes | Negligible |
| Answerlattice health reads | ~30 reads | Negligible |
| Answerlattice health writes | ~30 writes | Negligible |
| Gemini health prompts | ~60 tiny requests | Provider-billed, minimal |

The provider calls, not the health records, are the real production cost surface. Production scaling should be managed with billing, model-level quota monitoring, budget alerts, and quota increase requests.

---

## Security Rules

The health records are written with Admin SDK from Cloud Functions. Browser clients must not write provider health or operation accounting docs.

Existing rule coverage:

```text
firestore.rules
  match /MENULIST_AI_OPERATIONS/{docId}
  match /menulistAiOperations/{tId}/{sId}/{docId}
```

No new Firestore rules or indexes are required for the daily health records because they are Admin SDK writes and point reads by operators/schedulers.

---

## Current Accounting Boundaries

`MENULIST_AI_OPERATIONS` remains the detailed extraction audit collection.

`menulistAiOperations/{tId}/{sId}` remains the billable app-route operation ledger used by AI accounting paths.

`aiUsageLog` is not implemented. Do not add rules, indexes, cleanup jobs, or owner dashboards for it unless a future cost-control implementation explicitly introduces that collection.

---

_Document Status: ✅ CURRENT — no new usage-log collection introduced_
