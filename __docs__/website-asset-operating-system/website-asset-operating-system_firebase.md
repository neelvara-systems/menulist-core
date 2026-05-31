# Website Asset Operating System - Firebase Cost Tracking

**Status:** Internal v1 implemented  
**Runtime Firebase cost today:** None  
**Storage decision:** Small published website assets may live in Git/public; large/raw assets should not

---

## Cost Summary

The docs and first internal package implementation add no Firebase reads, writes, deletes, Storage operations, Cloud Functions, indexes, schedulers, or deploys.

The implementation stays local/repo-only:

- slots are TypeScript files;
- manifest is JSON;
- briefs are Markdown;
- audits read local files;
- reviews read local files and file metadata;
- generated small assets are written to the repo.

## Current Operation Matrix

| Operation | Firestore reads | Firestore writes | Storage ops | Cloud Functions | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Create this doc set | 0 | 0 | 0 | 0 | Local Markdown only. |
| Run `assets:audit` | 0 | 0 | 0 | 0 | Inspects local repo files only. |
| Run `assets:brief` | 0 | 0 | 0 | 0 | Generates local Markdown only. |
| Run `assets:review` | 0 | 0 | 0 | 0 | Inspects local generated assets only. |
| Run `assets:fingerprint` | 0 | 0 | 0 | 0 | Writes source hashes to local manifest only. |
| Generate local internal placeholder | 0 | 0 | 0 | 0 | Writes to `packages/asset-factory/published/placeholders/` only. |
| Generate local static asset | 0 | 0 | 0 | 0 | Writes to local filesystem/public assets only after a slot and approval check. |
| Capture local browser screenshot | 0 | 0 | 0 | 0 | Only if using local/staged demo data that does not fetch Firebase. |

## Future Cost Risks

| Risk | Cost impact | Rule |
| --- | --- | --- |
| Capturing real owner dashboard data | Firestore reads and possible privacy risk | Use founder-approved demo tenant only. |
| Generating assets from live Answerlattice dashboards | Firestore reads | Prefer static public pages or sanitized demo routes. |
| Storing raw video in Firebase Storage | Storage and egress costs | Do not store raw/working files in Firebase by default. |
| Running Cloud Function render jobs | Invocation, CPU, storage cost | Not allowed in first implementation. |
| Scheduled asset audits in Firebase | Scheduler/function cost | Use local Codex automation or CI first. |
| Public serving of large MP4 assets from repo/Vercel | Bandwidth/performance cost | Keep homepage media under budgets; long videos should use CDN/object storage later. |

## Storage Policy

| Asset type | Allowed location |
| --- | --- |
| Small approved WebP/PNG/JPG website assets | `public/images/website/` or existing Answerlattice public paths |
| Small approved WebM/MP4 loops under budget | Public repo path if size budget passes |
| OG/social image | Public repo path |
| Raw recordings | Not in Git public paths |
| Working editor projects | Not in Git public paths |
| Long launch videos | External object storage/CDN reference in manifest later |
| Real customer screenshots | Not in public paths unless founder-approved and scrubbed |

## Cost Impact Note

Cost impact: no Firebase cost change for the docs or internal v1 implementation. Future implementation should remain local-file based unless a separate implementation plan explicitly adds Firebase or CDN storage.
