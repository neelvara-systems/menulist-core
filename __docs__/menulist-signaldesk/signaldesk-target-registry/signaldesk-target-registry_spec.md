# SignalDesk Target Registry - Specification

**Status:** Runtime-backed specification
**Created:** June 23, 2026
**Last Updated:** July 21, 2026

## Purpose

The Target Registry is SignalDesk's private, canonical set of candidate business/location records. It preserves source and identity lineage before scoring, evidence, drafting, approval, contact, reply, or outcome work.

A target is a review object, not permission to contact.

## Current Scope

- manual CSV import of 1-50 rows;
- trusted provider import through an approved provider run;
- source-policy field and use enforcement;
- stable target identity and duplicate handling;
- list-safe target summary plus private target detail;
- contact identity and permission-evidence storage;
- suppression-aware initial state;
- source-run summary and lifecycle authority;
- strict 30-row desktop paging;
- stable IDs consumed by later SignalDesk modules.

## Current Target State

| Field | Values |
| --- | --- |
| Status | `new`, `review`, `ready`, `held`, `rejected`, `contacted`, `replied`, `converted` |
| Segment | `a`, `b`, `c`, `hold`, `reject` |
| Suppression | `clear`, `suppressed`, `wrong-contact`, `complaint` |
| Contactability | `ready`, `limited`, `missing`, `blocked` |
| Source confidence | `high`, `medium`, `low`, `blocked` |
| Next action | `review`, `enrich`, `score`, `evidence`, `draft`, `approve`, `export`, `contact`, `reply`, `outcome`, `hold`, `reject` |

Draft, approval, conversation, and outcome records remain separate objects; their existence updates target summary state without flattening those records into the registry.

## Import Contract

1. The import feature flag must be enabled.
2. Caller must have `target.review`; mobile mutation is blocked.
3. The request requires an actor-bound idempotency key, source name, active source policy, and 1-50 strict rows.
4. Manual rows cannot claim provider record identity. Provider identity is accepted only from the trusted provider-run path.
5. Source policy determines which fields, contact channels, evidence use, and import use are allowed.
6. Any retained email, phone, WhatsApp, or Instagram identity requires a bounded permission-evidence reference.
7. Exact duplicate rows collapse. Divergent rows with the same identity fail the complete import.
8. Existing identity, summary, detail, contact, suppression, lifecycle, and source-policy authority are read before writes.
9. Orphaned, foreign, malformed, rebound, expired, or ambiguous authority fails closed.
10. One transaction commits the complete accepted import and its audit/accounting truth.

## Identity Rules

- Manual imports use a normalized business identity derived from the admitted name/location/contact/website fields.
- Provider imports prefer provider record ID, then provider record URL, then a provider-scoped business identity.
- Two same-name provider records with different stable provider IDs remain different targets.
- Re-importing the same stable provider record reuses the target.
- A legacy identity is reused for provider data only when persisted provider provenance proves the same external record.
- A contact identity cannot be rebound to another target or source policy.
- Existing mature target lifecycle, score, and outcome fields cannot be regressed by re-import.

## Desktop And Mobile

Desktop Targets shows list-safe target summaries and loads the next 30 rows through a stable `updatedAt + targetId` cursor. The manual import form is hidden when imports are disabled.

Mobile remains dashboard-only. It can observe aggregate operational state but cannot open Target Registry, import, score, reveal contact, or mutate target truth.

## Non-Goals

- automatic contact consent inference;
- public lead or contact APIs;
- direct registry export/send;
- raw contact fields in target list responses;
- automatic duplicate merging across uncertain identities;
- client Firestore writes;
- provider calls when imports are disabled.

## Acceptance Criteria

- Disabled imports perform no provider or Firestore work.
- Duplicate or conflicting identity cannot create parallel outreach truth.
- Suppressed contact evidence holds the target.
- List responses never contain raw email, phone, Instagram, notes, or permission evidence.
- Older targets remain reachable without full-collection scans.
- All writes remain product-scoped, server-only, audited, and bounded.
