# Asset Library - Spec

## Summary

Asset Library stores and organizes source images, generated assets, channel variants, campaign outputs, rights metadata, approval state, and reuse history.

## Goals

- Keep every campaign asset traceable.
- Avoid regenerating assets that already exist.
- Separate source uploads, generated drafts, approved assets, exported assets, and archived assets.
- Make rights and usage notes visible before reuse.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Asset states | Source, draft, approved, exported, archived, and blocked states are explicit. |
| Source linkage | Generated assets link back to campaign, cue, and business fact refs. |
| Rights metadata | Owner can record permission, source, expiry, and restriction notes. |
| Reuse | Approved assets can be reused in new campaign packs. |
| Search/filter | Filter by channel, campaign, type, approval state, and location. |
| Storage separation | Large media files stay in Storage, not Firestore documents. |

## Non-Goals

- It is not a digital asset management suite for enterprise media teams.
- It does not license third-party media automatically.
- It does not make private assets public by default.

## Risks

- Unbounded asset history can increase Storage cost.
- Missing rights metadata can create reuse risk.
- Duplicate assets can make owner review harder.

