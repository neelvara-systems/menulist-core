# SignalDesk Foundation - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026

## Access Tests

| Test | Expected |
| --- | --- |
| Unauthenticated user opens `/signaldesk` | Blocked. |
| MenuList owner account opens `/signaldesk` | Blocked unless explicitly internal team member. |
| Read-only analyst opens dashboard | Allowed. |
| Read-only analyst reveals contact | Blocked. |
| Operator edits role policy | Blocked. |
| Founder admin edits role policy | Allowed and audited. |

## Audit Tests

| Test | Expected |
| --- | --- |
| Contact reveal succeeds | Audit event written. |
| Kill switch activates | Kill switch update and audit event written. |
| Policy changes | Audit event written. |
| Send/export action lacks audit path | Fails. |
| Audit page requests all records without pagination | Fails. |

## Kill Switch Tests

| Test | Expected |
| --- | --- |
| Global outbound switch active | All send/export actions blocked. |
| Email switch active | Email send/export blocked, other safe actions unaffected. |
| AI worker switch active | Worker does not run. |
| Source-provider switch active | Source run blocked. |
| Unauthorized user deactivates switch | Blocked. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile activates global pause | Allowed with confirmation and audit. |
| Mobile reveals contact | Not available. |
| Mobile sends/export | Not available. |
| Mobile edits roles | Not available. |

## Public Exposure Tests

| Test | Expected |
| --- | --- |
| Public route exists for SignalDesk | Fails. |
| SignalDesk URL appears in public sitemap | Fails. |
| Public visitor can inspect target data | Fails. |
| Public visitor can inspect source data | Fails. |
