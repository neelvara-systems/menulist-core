# Website Asset Operating System - Validation

**Validation date:** July 10, 2026
**Status:** Internal v1 implemented; current motion and coordinated launch-pack assets approved and wired
**Public runtime:** None
**Firebase deploy:** Not required

---

## Engineering Checklist Verification

| Checklist item | Status | Evidence |
| --- | --- | --- |
| Internal product boundary is documented | Pass | `__docs__/website-asset-operating-system/README.md:14`, `AGENTS.md:111`, `AGENTS.md:271` |
| Public runtime is disabled by contract | Pass | `packages/asset-factory/manifest/assets.json:4`, `packages/asset-factory/schemas/asset-schema.ts:84` |
| Internal feature flag exists | Pass | `src/config/features.ts:23` |
| Root npm commands exist | Pass | `package.json:17`, `package.json:20` |
| Shared slot/manifest schema exists | Pass | `packages/asset-factory/schemas/asset-schema.ts:29` |
| MenuList asset slots exist | Pass | `packages/asset-factory/slots/menulist.asset-slots.ts:18` |
| Answerlattice asset slots exist | Pass | `packages/asset-factory/slots/answerlattice.asset-slots.ts:18` |
| Audit implementation exists | Pass | `packages/asset-factory/scripts/lib/asset-audit.ts:277` |
| Audit blocks broken generated/approved assets | Pass | `packages/asset-factory/scripts/lib/asset-audit.ts:294` |
| Audit blocks disconnected public media | Pass | `packages/asset-factory/scripts/lib/asset-audit.ts` |
| Audit enforces slot destination, required outputs, non-orphan entries, and exclusive file ownership | Pass | `packages/asset-factory/scripts/lib/asset-audit.ts` |
| Audit requires declared sources and exact added/changed/removed fingerprint parity | Pass | `packages/asset-factory/scripts/lib/asset-audit.ts` |
| Audit blocks generated/approved media with missing, mismatched, or shared brief ownership | Pass | `packages/asset-factory/scripts/lib/asset-audit.ts` |
| Audit blocks contradictory approved status, performance, decisions, and review scores | Pass | `packages/asset-factory/scripts/lib/asset-audit.ts` |
| Audit enforces each required output role's declared file format | Pass | `packages/asset-factory/scripts/lib/asset-audit.ts` |
| Fingerprint locking exists | Pass | `packages/asset-factory/scripts/lock-fingerprints.ts:30` |
| Docs/changelog reflect implemented v1 | Pass | `__docs__/changelog.md:63` |

## Command Verification

Original v1 verification:

| Command | Result | Notes |
| --- | --- | --- |
| `npm run assets:brief -- --all` | Pass | Generated briefs for all 17 declared slots under `packages/asset-factory/briefs/`. |
| `npm run assets:generate:missing -- --slot answerlattice.home.hero.support-control-motion` | Pass | Generated `packages/asset-factory/published/placeholders/answerlattice.home.hero.support-control-motion.svg`. |
| `npm run assets:fingerprint` | Pass | Locked watched source hashes for 13 non-missing asset slots. |
| `npm run assets:audit` | Pass | Historical v1 baseline; current healthy result is recorded below. |
| `npm run assets:review` | Pass | Historical v1 baseline; current healthy result is recorded below. |
| `npx tsc --noEmit --incremental false` | Pass | TypeScript completed with no output. |
| `git diff --check` | Pass | No whitespace errors. |

Intermediate stale-detection check after Answerlattice website docs changed:

| Command | Result | Notes |
| --- | --- | --- |
| `npm run assets:audit` | Blocked by stale Answerlattice fingerprints | 4 generated Answerlattice assets are stale because `__docs__/answerlattice/answerlattice-website/README.md` changed since their fingerprints were locked. This proves stale detection is working; do not relock until the assets are reviewed. |
| `npm run assets:review` | Blocked by same stale Answerlattice fingerprints | Answerlattice OG, logo mark, PWA icons, and splash assets require review before they can be treated as current again. |
| `git diff --check` | Pass | No whitespace errors in the current docs update. |

## Current Healthy Result

After the local HyperFrames/FFmpeg motion pass and the coordinated MenuList launch-pack update, the current verified result is:

- `npm run assets:audit`: 0 errors, 0 warnings.
- `npm run assets:review`: 0 blocked, 0 need founder review.
- The manifest contains 34 active slots: 27 MenuList slots and 7 Answerlattice slots.
- MenuList hero motion and the three Answerlattice motion clips are generated, approved, fingerprinted, and wired into their target public website surfaces with poster fallbacks.
- The MenuList launch pack coordinates the website motion, LinkedIn and square social assets, owner-PWA device proof, and four approved launch-video frames.
- Launch-pack status visuals use categorical demo states and do not invent customer counts, percentages, or performance claims.
- Every tracked public website media file is connected to AssetOS. Twelve previously disconnected intentional assets now have approved slots, briefs, bounded review notes, and source fingerprints.
- The loading-state Customer Feedback owner-inbox derivative and the QR Menu Links capture with a broken logo/empty media block were removed from `public/`; their raw source captures remain in the internal feature-screenshot archive. The QR feature page now reuses the approved fictional mobile-menu proof.
- A future disconnected public media file is an audit error and makes `npm run assets:audit` exit nonzero.
- Generated/approved entries now fail audit when they omit the declared destination or a required output role; orphan entries and duplicate file owners also fail. The current 34-slot manifest passes all four integrity checks.
- Declared source paths must exist, and fingerprint drift now includes watched files that appear or disappear. The current manifest has no missing source evidence or fingerprint path-set drift.
- Every generated/approved entry has one existing `packages/asset-factory/briefs/<slot-id>.md` brief; missing, mismatched, and multiply owned briefs now fail audit.
- Every current approved review has passing performance and valid 1-10 scores; approved asset status cannot coexist with a non-approved decision.
- Every required output role currently points to the slot's declared format extension; mismatched role/file formats now fail audit for generated/approved assets.
- Current follow-up gates pass: AssetOS audit/review, website public-copy and agent-readiness source gates, both public create-menu safety/truth verifiers, docs links, TypeScript, lint, and scoped diff integrity. All 87 scoped MenuList/shared verifier scripts pass. Global `git diff --check` remains blocked only by trailing whitespace in the unrelated concurrent `src/database/storage/uploadBase64ToStorage.ts` edit.
- Desktop and 390px local browser QA pass for `/features/qr-menu-links` and `/features/customer-feedback-loop`: intended images load, rejected captures are absent, localized copy fits, viewport width does not overflow, and browser error logs are empty.

## Files Created Or Modified

| Area | Status | Evidence |
| --- | --- | --- |
| Root operating contract | Updated | `AGENTS.md:111`, `AGENTS.md:271` |
| Runtime flag | Updated | `src/config/features.ts:23` |
| Root scripts | Updated | `package.json:17` |
| Internal package | Added | `packages/asset-factory/README.md:1` |
| Agent skill | Added | `.agents/skills/website-asset-factory/SKILL.md:1` |
| Review prompt | Added | `.github/codex/prompts/asset-review.md:1` |
| Feature docs | Updated | `__docs__/website-asset-operating-system/README.md:1` |
| Changelog | Updated | `__docs__/changelog.md:56` |

## Security And Cost

| Area | Result |
| --- | --- |
| Auth/API surface | No API route added. |
| Public route | No public route added. |
| Firebase | No Firestore, Storage, Function, rule, index, or scheduler change. |
| Vercel | No deploy or remote build run. |
| Data privacy | Scripts read local repo files only and do not fetch tenant/customer data. |
| Raw media | `packages/asset-factory/raw/` and `packages/asset-factory/working/` ignore committed media by default. |

## Final Verdict

Website Asset Operating System v1 is ready for internal use on MenuList and Answerlattice assets.

It is implemented as a separate-product-style internal architecture, with no public product launch, no MenuList owner UI, no Answerlattice runtime behavior, and no Firebase cost change.

The current package does not need an architecture or code change for the Answerlattice-adjacent decision. The current operational action is normal AssetOS use: regenerate or relock assets only after source-truth changes are reviewed, then run audit and review before treating public website media as current.
