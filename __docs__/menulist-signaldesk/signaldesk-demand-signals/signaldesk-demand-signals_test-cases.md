# SignalDesk Demand Signals - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026

## Functional Tests

| ID | Test | Expected |
| --- | --- | --- |
| DEM-T001 | Valid claim/setup signal arrives | Review item can be created with business context. |
| DEM-T002 | Anonymous QR scan signal arrives | Aggregate signal is stored; no prospect is created. |
| DEM-T003 | Partner referral is entered | Referral review item is created with evidence note. |
| DEM-T004 | Route-token signal arrives | Viral route attribution is linked to outcome bridge. |
| DEM-T005 | Suppressed target receives demand signal | Outreach remains blocked. |

## Privacy Tests

| ID | Test | Expected |
| --- | --- | --- |
| DEM-T010 | Payload includes raw customer identifier | Rejected or stripped before storage. |
| DEM-T011 | Payload includes full fingerprint | Rejected. |
| DEM-T012 | Customer scan attempts to create target | Blocked. |

## Cost Tests

| ID | Test | Expected |
| --- | --- | --- |
| DEM-T020 | Dashboard load | Reads `signaldeskDemandSignalSummaries`. |
| DEM-T021 | High scan volume | Writes are compact or bucketed; no per-customer reads. |
| DEM-T022 | Hook rejects invalid payloads | Rejection event stored without enrichment. |

## Mobile Tests

| ID | Test | Expected |
| --- | --- | --- |
| DEM-T030 | Mobile demand summary | Counts render without raw event read. |
| DEM-T031 | Mobile target creation | Not available. |
