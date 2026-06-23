# SignalDesk Outcome Bridge - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026

## Functional Tests

| ID | Test | Expected |
| --- | --- | --- |
| OUT-T001 | Create route token for approved action | Token is scoped, expiring, and linked to target/action. |
| OUT-T002 | Record current-list outcome through token | Outcome event and attribution touch are created. |
| OUT-T003 | Duplicate outcome event arrives | Summary count is not inflated. |
| OUT-T004 | Expired token is used | Event is rejected and bridge audit event is stored. |
| OUT-T005 | Manual outcome is entered | Evidence note and operator audit are required. |

## Boundary Tests

| ID | Test | Expected |
| --- | --- | --- |
| OUT-T010 | Attempt to write MenuList store truth | Blocked by bridge policy. |
| OUT-T011 | Attempt to publish MenuList output from SignalDesk | Blocked. |
| OUT-T012 | Route token includes raw target ID | Fails validation. |

## Cost Tests

| ID | Test | Expected |
| --- | --- | --- |
| OUT-T020 | Dashboard load | Reads summaries only. |
| OUT-T021 | Target outcome detail | Reads bounded target event stream. |

## Mobile Tests

| ID | Test | Expected |
| --- | --- | --- |
| OUT-T030 | Mobile outcome summary | Read-only summary renders. |
| OUT-T031 | Mobile route token creation | Not available. |
