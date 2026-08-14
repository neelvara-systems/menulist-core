# Public Truth Monitor Add-On - Test Cases

**Last Updated:** July 16, 2026
**Status:** Runtime implemented

---

## Documentation Gate Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| PTMA-001 | V2 is described as a better one-time free report | Fail |
| PTMA-002 | V2 omits paid entitlement | Fail |
| PTMA-003 | V2 omits capped history/retention | Fail |
| PTMA-004 | V2 adds standalone scheduled function by default | Fail |
| PTMA-005 | V2 claims Google/Search/AI ranking results | Fail |
| PTMA-006 | V2 mutates external profiles | Fail |
| PTMA-007 | V2 writes canonical truth without owner approval | Fail |
| PTMA-008 | V2 has no Firebase cost cap | Fail |

## Runtime Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| PTM-API-001 | Entitled owner calls `/api/public-truth-monitor/summary` | Auth, tenant check, entitlement check, then saved summary returns |
| PTM-API-002 | Entitled owner calls `/api/public-truth-monitor/refresh` | Auth, write rate limit, bounded JSON validation, tenant check, report build, and one atomic capped-summary merge/write |
| PTM-API-003 | Owner without entitlement refreshes | 403 response; no monitor summary write |
| PTM-API-004 | Malformed refresh body is submitted | 400 response from bounded parser/Zod validation |
| PTM-API-005 | Authenticated staff member lacks Business Health / `VIEW_ANALYTICS` permission | 403 response before monitor summary read or write |
| PTM-DATA-001 | Report history exceeds cap | Newest entries remain; old entries are removed after maximum 6 reports |
| PTM-DATA-002 | Report export is downloaded | Browser-local text report is generated; no Firestore write |
| PTM-MOB-001 | Mobile opens Business Health | Public truth history card stays inside `MobileShell` and uses the shared hook |
| PTM-BOUNDARY-001 | Runtime tries to fetch external sources or call providers | Fail source gate |
| PTM-BOUNDARY-002 | Production rate-limit provider is unavailable | Summary/refresh fails closed; protected owner-data operation does not bypass admission |
| PTM-BOUNDARY-003 | Authenticated route reaches summary or refresh rate limiting | The normalized session admitted by `withAuth()` is reused; no second request-context session lookup can produce a false 401 |
| PTM-DATA-003 | Two manual refreshes overlap | Each transaction rebuilds from the current summary; one refresh cannot silently overwrite the other's history entry |
| PTM-AUTH-001 | Compact and nested session tenant/store aliases disagree | 403 before protected monitor reads or writes |
| PTM-AUTH-002 | Store is reassigned, disabled, deleted, or blocked after initial route admission | Summary transaction rejects current scope; no saved summary is disclosed or written |
| PTM-AUTH-003 | Tenant is disabled, deleted, or blocked after initial route admission | Summary transaction rejects current scope; no saved summary is disclosed or written |
| PTM-AUTH-004 | Store role loses `VIEW_ANALYTICS` before final summary transaction | Current permission callback rejects; refresh produces no summary write |
| PTM-AUTH-005 | Root and nested aliases are equivalent string/number forms | Exact canonical scope is accepted |
| PTM-AUTH-006 | Paid subscription is revoked or changed after report-input reads but before final persistence | Final transaction rejects current entitlement; no summary write |
| PTM-CLIENT-001 | Tenant changes while a store identifier remains the same | SWR uses a different tenant-plus-store key and former history is not reused |
| PTM-CLIENT-002 | Summary response carries another tenant or store ID | Runtime response validation rejects before cache mutation |
| PTM-CLIENT-003 | Summary response has malformed enums, counters, history/latest identity, URLs, or source-boundary values | Runtime response validation rejects and the generic owner-safe error path is used |
| PTM-CLIENT-004 | Refresh response includes the full readiness report and Firestore timestamp metadata | Browser projection retains only entitlement plus validated summary and drops unused/internal fields |
