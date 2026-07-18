# Asset Library - Spec

## Summary

Asset Library is the compact CampaignCue registry for owner-entered asset notes and server-registered reusable/exported files. It keeps source, rights, optional private Storage identity, and bounded campaign usage references together in one workspace-scoped document.

## Goals

- Keep every campaign asset traceable.
- Avoid regenerating assets that already exist.
- Separate usable, blocked, and archived registry state from rights status.
- Make rights and usage notes visible before reuse.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Asset states | `ready`, `blocked`, and `archived` are registry states; rights independently remain `confirmed`, `needs_review`, or `restricted`. |
| Source linkage | Optional campaign, output, and channel references must resolve inside the same workspace before registration. |
| Rights metadata | Owner can record permission, source, expiry, and restriction notes. |
| Reuse | Only ready assets with confirmed rights satisfy deterministic campaign photo readiness. |
| Current browse | The active runtime returns one bounded newest-first list; category/filter/search expansion must not add per-filter reads. |
| Storage separation | Large media files stay in Storage, not Firestore documents. |
| Download identity | Durable records store only workspace-owned Storage paths. External URLs and signed download URLs are never accepted from the owner API or returned from persisted state. |

## Non-Goals

- It is not a digital asset management suite for enterprise media teams.
- It does not license third-party media automatically.
- It does not make private assets public by default.
- Metadata registration is not a binary upload. The active owner form can save an asset note; CueLayers/server export paths own their file uploads.
- It is not currently an archive manager, approval workflow, thumbnail generator, or multi-filter DAM grid.

## Risks

- Unbounded asset history can increase Storage cost.
- Missing rights metadata can create reuse risk.
- Duplicate assets can make owner review harder.
