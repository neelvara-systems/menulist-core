# Support Truth Change Control Test Cases

## Contract

| ID | Scenario | Expected |
| --- | --- | --- |
| STCC-001 | Feature flag off | Existing release preview works and omits additive change-control proof |
| STCC-002 | Valid four-section proof | Strict response schema accepts it |
| STCC-003 | Duplicate, oversized, cross-scope, or unknown proof data | Rejected |
| STCC-004 | Maximum-valid preview DTO | Serialized response remains within the shared 256 KiB browser cap |

## Source Watch

| ID | Scenario | Expected |
| --- | --- | --- |
| STCC-S01 | Source Governance disabled | `not_enabled`; no source lookup |
| STCC-S02 | Affected answers have no source IDs | `no_linked_sources` |
| STCC-S03 | Approved, effective, future-review, conflict-free source | `ready` |
| STCC-S04 | Missing governance or non-approved status | Attention reason shown |
| STCC-S05 | Review date is today or earlier | Review due |
| STCC-S06 | Effective date is in the future | Not yet effective |
| STCC-S07 | Reviewer-recorded conflict exists | Conflict attention shown |
| STCC-S08 | Referenced Knowledge Intake source document missing | Missing source shown |
| STCC-S09 | Generic evidence ID is not a Knowledge Intake source ID | Counted as non-governed; no cross-collection probe |
| STCC-S10 | More than 50 governable source IDs | First 50 checked deterministically and proof is partial |
| STCC-S11 | Optional source metadata read fails | Source proof is unavailable; core release review remains usable |
| STCC-S12 | Legacy answer contains malformed evidence references | Invalid references are counted and skipped; release preview remains usable |

## Cross-Surface Review

| ID | Scenario | Expected |
| --- | --- | --- |
| STCC-D01 | Surface entity IDs intersect release changes | Surface and matched entity IDs shown |
| STCC-D02 | Surface has visible mapped content | Article/FAQ/changelog counts shown |
| STCC-D03 | Changed entity has no direct surface | Listed as unmapped |
| STCC-D04 | Summary missing or invalid | Evidence unavailable; no raw collection fallback |
| STCC-D05 | More than 10 matched surfaces | Exact total retained, deterministic sample capped, proof partial |

## Propagation Proof

| ID | Scenario | Expected |
| --- | --- | --- |
| STCC-P01 | Ready manifest matches current source versions | Current compiled proof ready |
| STCC-P02 | Manifest source versions differ | Rebuild required even if stored status says ready |
| STCC-P03 | Manifest stale/building/failed | Exact bounded state shown |
| STCC-P04 | Source-version or manifest scope is wrong | Invalid/unverified proof |
| STCC-P05 | Valid public/private bundle references | Correct readiness booleans |
| STCC-P06 | Widget uses direct runtime | Source-versioned mode; no compiled-delivery claim |
| STCC-P07 | Public API or MCP disabled | Disabled, not missing |
| STCC-P08 | Release activation confirmed | Compiled channels show rebuild required after activation |

## Security And Cost

| ID | Scenario | Expected |
| --- | --- | --- |
| STCC-C01 | Unauthenticated or unauthorized request | Existing route rejects before proof reads |
| STCC-C02 | Source lookup | Direct references only, max 50, metadata field mask |
| STCC-C03 | Product dependency review | One compact summary read, no raw source query |
| STCC-C04 | Propagation proof | Two compact control reads |
| STCC-C05 | Preview cancelled | Zero writes |
| STCC-C06 | Proof generation fails | Release remains pending and no note publishes |

## Responsive UI

| ID | Scenario | Expected |
| --- | --- | --- |
| STCC-U01 | 390 px viewport | Vertical proof sections, wrapping labels, 44 px actions, no horizontal overflow |
| STCC-U02 | Large dependency set | Bounded sample plus truthful remainder count |
| STCC-U03 | Open source/surface/activation handoff | Existing permission-scoped route opens |
| STCC-U04 | Keep as draft | Modal closes with no activation or publication |
| STCC-U05 | Governed source findings exist | Up to five source names, linked-answer counts, and owner-readable reasons appear before the Knowledge Intake handoff |
