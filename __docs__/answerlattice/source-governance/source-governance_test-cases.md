# Source Governance Test Cases

## Contract

| ID | Scenario | Expected |
| --- | --- | --- |
| SG-001 | Parse a legacy source without governance | Accepted as unreviewed-compatible source |
| SG-002 | Parse a complete valid governance object | Accepted without unknown fields |
| SG-003 | Unknown authority, status, access, or citation value | Rejected |
| SG-004 | Invalid date, oversized list, note, owner, or conflict list | Rejected |
| SG-005 | Conflict list contains the source itself | Rejected by server normalization |
| SG-006 | Public citation is selected for a private source | Rejected |
| SG-007 | Excluded or superseded source remains citable | Rejected |
| SG-008 | Next review date precedes effective date | Rejected |

## Security

| ID | Scenario | Expected |
| --- | --- | --- |
| SG-101 | Unauthenticated update | Rejected |
| SG-102 | User without `MANAGE_KNOWLEDGE` | Rejected |
| SG-103 | Inactive license | Rejected before Firestore mutation |
| SG-104 | Source belongs to another workspace or job | Rejected |
| SG-105 | Conflict source belongs to another workspace or job | Rejected |
| SG-106 | Browser writes source directly | Denied by existing Firestore rules |
| SG-107 | Oversized or extra request fields | Rejected |
| SG-108 | Source-governance feature flag is off | Mutation fails closed before a source read or write |
| SG-109 | Conflict source has not been reviewed | Link is rejected before either source changes |

## Transaction And Audit

| ID | Scenario | Expected |
| --- | --- | --- |
| SG-201 | Valid first update | Source governance updated and one audit event created |
| SG-202 | Same request ID and same payload replayed | No second write or audit; a reciprocal save returns every committed source patch again |
| SG-202A | Browser retries an unchanged failed save | It reuses the pending request ID until the matching response succeeds; stale responses cannot settle and pending state is capped at 20 |
| SG-202B | Response contains too many, duplicate, malformed, or target-divergent patches | Browser rejects the response without mutating the bundle |
| SG-203 | Same request ID with different payload | Conflict response |
| SG-204 | Update succeeds | Audit stores compact previous/new governance without source body |
| SG-205 | Add a reviewed conflict | Both sources receive reciprocal links in one transaction and response |
| SG-206 | Remove a conflict | Both source links clear in one transaction and response |
| SG-207 | Reciprocal peer already has five other conflicts | Save rejects without partial writes |

## Review Flow

| ID | Scenario | Expected |
| --- | --- | --- |
| SG-301 | Canonical proposal has a legacy/unreviewed source | Accept disabled with source-review guidance |
| SG-302 | Every linked source is approved and conflict-free | Existing canonical acceptance checks may proceed |
| SG-303 | Approved source has conflict links | Accept remains disabled |
| SG-304 | FAQ or article draft has unreviewed source | Existing review behavior remains unchanged |
| SG-305 | Source is workspace private and not publicly citable | Governance summary shows the boundary |
| SG-306 | Accepted proposal gains a source conflict before publishing | Publication rechecks evidence and creates no mutation proposal |
| SG-307 | Proposal uses only the other side of a conflict | Reciprocal link blocks acceptance |

## Cost

| ID | Scenario | Expected |
| --- | --- | --- |
| SG-401 | Save without conflicts | Two reads and two writes in the governance transaction |
| SG-402 | Add five new conflicts | Seven reads and up to seven writes in the governance transaction |
| SG-403 | Replace five previous conflicts with five new conflicts | At most 12 reads and 12 writes |
| SG-404 | Open page without saving | Existing bundle read only; no governance write |
| SG-405 | No governance on legacy source | No migration read or write |
