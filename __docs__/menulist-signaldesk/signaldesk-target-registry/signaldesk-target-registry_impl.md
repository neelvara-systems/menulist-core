# SignalDesk Target Registry - Implementation

**Status:** Implemented and feature-audited
**Created:** June 23, 2026
**Last Updated:** July 21, 2026

## Runtime Map

| Boundary | Current source |
| --- | --- |
| Request schemas, persisted projectors, cursor | `src/lib/signaldesk/targetContracts.ts` |
| CSV parser | `src/lib/signaldesk/csvImport.ts` |
| Import/provider transaction and target reads | `src/lib/signaldesk/workflowServer.ts` |
| Protected action and workspace routes | `src/app/api/signaldesk/actions/route.ts`, `src/app/api/signaldesk/workspace/route.ts` |
| Client response validation and cursor query | `src/database/signaldesk/index.ts` |
| Abort-safe page merge | `src/hooks/signaldesk/useSignalDeskOverview.ts` |
| Desktop registry/import UI | `src/components/signaldesk/SignalDeskWorkspace.tsx` |
| Rules and indexes | `firestore-signaldesk.rules`, `firestore-signaldesk.indexes.json` |

## Persisted Truth

| Collection | Role |
| --- | --- |
| `signaldeskTargetSummaries` | List-safe lifecycle and scoring projection. |
| `signaldeskTargets` | Private detail, contact fields, notes, permission evidence, and provider identity. |
| `signaldeskIdentityIndex` | Deterministic identity hash to target binding. |
| `signaldeskSourceCandidates` | Target/source-run/source-policy provenance. |
| `signaldeskContactIdentities` | Private normalized contact identity and permission state. |
| `signaldeskSourceRunSummaries` | Compact import result counts. |
| `signaldeskSuppressionLedger` | Existing contact-level suppression authority read by imports. |
| `signaldeskIdempotencyKeys` | Manual import or provider-run retry truth. |
| `signaldeskProviderSourceRetention` | Provider record lineage and refresh/retention state. |

The constants registry still contains legacy/future collection names, but this feature does not create row-level import or target-state-event documents.

## Transaction Sequence

The import server validates and normalizes the complete request before opening one Firestore transaction. Inside it:

1. read retry claim and current source policy;
2. derive admitted fields and deterministic identities;
3. read identity indexes;
4. resolve stable or legacy-compatible target IDs;
5. read source run, provider claim/run, summaries, details, candidates, contacts, suppressions, and retention rows;
6. strictly project all existing authority;
7. reject orphan, rebind, policy, provenance, lifecycle, or contact conflicts;
8. preserve mature lifecycle/score fields;
9. write accepted summary/detail/identity/candidate/contact/retention truth;
10. write source-run, retry/provider settlement, timeline, audit, control summary, and daily cost truth.

No accepted row can commit independently of the rest of the request.

## CSV Boundary

The browser parser accepts exactly these ten columns:

`displayName, category, city, country, website, email, phone, currentListUrl, instagram, permissionEvidenceRef`

It supports a byte-order mark, CRLF/LF, quoted commas, escaped quotes, and quoted line breaks. It rejects malformed quotes, shifted columns, empty display names, overlong fields, more than 50 rows, and input above 100,000 characters. Server Zod validation repeats the authoritative field constraints.

## Target Paging

`SIGNALDESK_TARGET_PAGE_SIZE` is 30. The server queries `updatedAt DESC, document ID DESC`, strictly projects rows, and stops when 30 valid targets are collected. Rejected rows produce bounded aggregate diagnostics and can trigger additional 30-document scans only within the existing ten-page projection ceiling.

The workspace route accepts the exact cursor only for `section=targets`. The client aborts stale requests, deduplicates by target ID, and exposes an explicit desktop `Load older` control. Other workspace sections continue to receive only their bounded current target window.

## Feature Flag

`ENABLE_MENULIST_SIGNALDESK_IMPORTS` is enforced in the import server and before source-provider work. The desktop form follows the same flag. Disabling it does not hide existing target history; it prevents new import/provider mutation.

## Security And Privacy

- Protected routes use current SignalDesk admission and permissions.
- Mobile action classification blocks import and target mutation.
- Summary projection excludes raw contact and private detail fields.
- Direct browser writes are denied.
- Raw contact reveal remains a separate permissioned, audited handoff action.
- Audit uses stable event classification, not imported row content.
