# Git Operations Ledger

**Status:** Active, append-only control-plane ledger
**Authority:** `AGENTS.md` Git Operations Control Plane
**Coverage start:** August 22, 2026 (recent history backfilled from local reflogs)
**Repository:** `/Users/danny/Projects/MenuListAi/menulist-core`

## Purpose

This ledger records Git operations that can change shared release history across
all MenuList repository worktrees. It exists to prevent an agent from reviewing
only the visible worktree, missing a concurrent ref move, misclassifying a
Firebase source change, or claiming local/remote parity without direct evidence.

Git remains the source of truth for commit topology. This file is the operational
review trail: who or what acted, from which worktree, when, what moved, what was
validated, what deployment impact was found, and how the result was read back.

## Mandatory Operator Contract

1. Read this ledger before any commit that moves release history, merge,
   cherry-pick, rebase, pull that moves a ref, push, reset, branch deletion, or
   worktree add/remove/prune.
2. Allocate an operation ID using `GIT-YYYYMMDD-HHMMSS-<short-purpose>`.
3. Record an ISO-8601 timestamp with timezone, actor plus session/thread ID,
   worktree path/ID, branch, full starting SHA, dirty/untracked state, and all
   registered worktrees before mutation.
4. Fetch before comparing refs. Record local and remote `main`/`staging`, unique
   commits on each side, and local branches not reachable from the intended
   destination.
5. Inspect the complete changed-path range since the last verified Firebase
   release. Do not classify deployment need from only the latest commit message
   or final diff summary.
6. Classify infrastructure impact per product and target using exactly one value:
   - `NO_INFRA_CHANGE`
   - `DEPLOY_REQUIRED`
   - `SOURCE_RESTORED_TO_DEPLOYED_BYTES`
   - `DEPLOYED_AND_READ_BACK`
7. `SOURCE_RESTORED_TO_DEPLOYED_BYTES` requires authenticated cloud source or
   hash evidence proving the deployed QA and production copies already match.
8. Ordinary pushes target `staging`. Move `main` only on Danny's explicit current
   instruction; then finish with all four local/remote refs on one verified SHA.
9. After mutation, record exact commands by class (never secret-bearing command
   values), full before/after SHAs, check results, push output classification,
   `git ls-remote` readback, divergence, and final worktree dirtiness.
10. If another process acts, append an `OBSERVED` entry from reflog and direct
    remote evidence. Use actor `unknown` when the identity is unavailable.
11. Never rewrite or delete ledger entries. Correct mistakes with a new
    `CORRECTION` entry that names the superseded operation ID.

## Required Entry Template

```text
### <operation-id>
- Timestamp:
- Record type: PLANNED | PERFORMED | OBSERVED | CORRECTION | AUDIT
- Actor/session/thread ID:
- Worktree path/ID:
- Starting state: branch, HEAD, dirty/untracked summary
- Operation: command class and source -> destination refs
- Before SHAs:
- After SHAs:
- Validation:
- Infrastructure classification: MenuList QA/prod; Answerlattice QA/prod
- Deployment evidence or blocker:
- Remote readback and divergence:
- Final filesystem state:
- Attribution confidence: exact | observed | unknown
- Notes:
```

Do not put credentials, environment values, tokens, webhook payloads, customer
data, or private provider output in this ledger.

## Backfilled Operations

The following entries are reconstructed from repository commits and local branch
or remote-tracking reflogs. Reflogs prove ref movement and timestamps but do not
preserve the originating Codex worktree/session for every historical action.
Those fields are explicitly `unknown` instead of guessed.

| Operation ID | Timestamp | Record | Worktree / actor | Ref movement | Evidence and review |
| --- | --- | --- | --- | --- | --- |
| `GIT-20260822-121919-readiness-merge` | `2026-08-22T12:19:19+05:30` | `PERFORMED` | `/Users/danny/Projects/MenuListAi/menulist-core`; Codex thread `019e3e73-7d6a-7142-9c09-24bce20e1c65` | Reconciliation commit `cf98f2769fe43d2b4dae3dd918102cb25a06d537` merged remote release `b6c0c31235340c407ff53f04d4653b3622e66445` as `1f67f90050433d439cf6771823ed1b73b4a845dd` | Remote history and current dirty work were preserved; no force push. |
| `GIT-20260822-122930-dual-promotion` | `2026-08-22T12:29:53+05:30` | `PERFORMED` | Same worktree/thread as above | `origin/main` and `origin/staging`: `b6c0c31235340c407ff53f04d4653b3622e66445` -> `52faf50e7334cf6aab5e3c589db5d72e38ab1def` | One atomic push; TypeScript, lint, focused pricing policy test, zero divergence, and clean worktrees were verified. |
| `GIT-20260823-131649-commercial-merge` | `2026-08-23T13:16:49+05:30` | `OBSERVED` | Worktree/session `unknown` (reflog backfill) | Merge `43d68c737a733e81bad51cc621d807f85f8440b5` into staging as `7a2afad7e9513c341c72589a9552dc7a73bc9865` | Non-fast-forward merge recorded by commit topology. Actor identity unavailable. |
| `GIT-20260823-142739-staging-sync` | `2026-08-23T14:27:39+05:30` | `OBSERVED` | Worktree/session `unknown` | `origin/staging` -> `064c3fe32ca38b0f1c363781b3c2b12716014069` | Remote-tracking reflog reports `update by push`. |
| `GIT-20260823-143231-main-sync` | `2026-08-23T14:32:31+05:30` | `OBSERVED` | Worktree/session `unknown` | `origin/main` -> `064c3fe32ca38b0f1c363781b3c2b12716014069` | Remote-tracking reflog reports `update by push`; staging/main aligned at this checkpoint. |
| `GIT-20260823-163725-answerlattice-merge` | `2026-08-23T16:37:25+05:30` | `OBSERVED` | Worktree/session `unknown` | `490f7d5f34af70311921b7dc3f96a20de12f37c8` + `1141f8fd6b535abf8306b9126d24194c6b7b78d5` -> merge `f9a56e8787111fbb8ba5aa1a4a0b16666689a1cc` | Commit topology records `Merge branch 'main' into staging`. |
| `GIT-20260823-164306-main-push` | `2026-08-23T16:43:06+05:30` | `OBSERVED` | Worktree/session `unknown` | `origin/main` -> `f9a56e8787111fbb8ba5aa1a4a0b16666689a1cc` | Remote-tracking reflog reports `update by push`. |
| `GIT-20260823-165228-ticket-staging` | `2026-08-23T16:52:28+05:30` | `OBSERVED` | Worktree/session `unknown` | `origin/staging` -> `e30e90cd30d742c3f4c326746a4e0a2bcfc02f21` | Remote-tracking reflog reports `update by push`. |
| `GIT-20260823-165740-ticket-main` | `2026-08-23T16:57:40+05:30` | `OBSERVED` | Worktree/session `unknown` | `origin/main` -> `e30e90cd30d742c3f4c326746a4e0a2bcfc02f21` | Main was fast-forwarded to staging; TypeScript/lint validation and zero divergence were verified in the active review session. |
| `GIT-20260823-172354-firebase-evidence-promotion` | `2026-08-23T17:23:54+05:30` | `OBSERVED` | Worktree/session `unknown` | Both remote branches reached `aeb0fc2e34e20f182dd8758db9fc7e97105aba4d` | Includes Firebase release evidence: MenuList and Answerlattice QA/prod approved rules/Functions inventories were deployed/read back; exact details remain in product deployment ledgers. |
| `GIT-20260823-195334-compiled-context-staging` | `2026-08-23T19:53:34+05:30` | `OBSERVED` | `/Users/danny/Projects/MenuListAi/menulist-core`; session `unknown` | `origin/staging` -> `e0bf57fd0ac42ccc6a7c7e434de22b2296d534b9` | Infrastructure classification: Answerlattice QA/prod `SOURCE_RESTORED_TO_DEPLOYED_BYTES`; authenticated deployed archives and SHA-256 parity prove no Functions redeploy was required. Vercel QA application release was separate. |
| `GIT-20260823-195919-compiled-context-evidence` | `2026-08-23T19:59:19+05:30` | `OBSERVED` | Same repository; session `unknown` | `origin/staging` -> `d534e64822eb8aea8fc4b4ecd0f17a45090afed8` | Documentation commit records Vercel QA readback; production Vercel remained unchanged. Firebase parity remained current. |
| `GIT-20260823-200742-compiled-context-main` | `2026-08-23T20:07:42+05:30` | `OBSERVED` | Worktree/session `unknown` | `origin/main` -> `d534e64822eb8aea8fc4b4ecd0f17a45090afed8` | Local main reflog records fast-forward from staging at `20:07:39`; remote reflog records push at `20:07:42`. Both branches aligned. |
| `GIT-20260823-202101-observed-worktree-removal` | Observed `2026-08-23T20:21:01+05:30`; operation time unknown | `OBSERVED` | Actor/session `unknown` | Former linked worktree IDs `menulist-answerlattice-prod-release` and `menulist-answerlattice-qa-release`, under `/private/tmp/`, are no longer registered | Earlier inspection found stale registrations pointing to deleted directories; the current worktree registry contains only the primary checkout. Git retains no operation timestamp or actor for this prune/removal, so neither is inferred. The former branch commits remain reachable from promoted history. |

## Current Control-Plane Audit

### GIT-20260823-202101-ledger-control-plane

- Timestamp: `2026-08-23T20:21:01+05:30`
- Record type: `AUDIT`
- Actor/session/thread ID: Codex active conversation; externally visible thread ID unavailable
- Worktree path/ID: `/Users/danny/Projects/MenuListAi/menulist-core`; primary worktree
- Starting state: branch `staging`; HEAD `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`
- Operation: repository rule and ledger creation only; no commit, merge, push,
  branch movement, worktree lifecycle action, Firebase deploy, or Vercel deploy
- Before SHAs: local/remote `main` and `staging` all at `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`
- After SHAs: unchanged
- Validation: source/reflog audit and scoped diff review; code checks are not
  applicable to documentation/rule-only control-plane changes
- Infrastructure classification: all four targets `NO_INFRA_CHANGE` for this
  control-plane edit
- Deployment evidence or blocker: none required
- Remote readback and divergence: prior direct readback showed both remote refs
  at the same full SHA; no remote mutation performed in this operation
- Final filesystem state: pre-existing founder-presence documentation edits are
  preserved and excluded from this operation; this ledger/rule work is local
- Attribution confidence: exact for this audit; observed/unknown where marked in
  backfilled entries
- Notes: supersedes the unsafe practice of classifying deployment impact from
  only the latest commit message. Future corrections append a new entry.

### GIT-20260824-002637-staging-local-changes

- Timestamp: `2026-08-24T00:26:37+05:30`
- Record type: `PLANNED`
- Actor/session/thread ID: Codex thread
  `019e3e73-7d6a-7142-9c09-24bce20e1c65`
- Worktree path/ID: `/Users/danny/Projects/MenuListAi/menulist-core`;
  primary and only registered worktree
- Starting state: branch `staging`; HEAD
  `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`; 28 tracked files modified
  and one untracked ledger file; no generated build output or environment file
  is in the candidate set
- Operation: commit the stable local snapshot on `staging`, then perform one
  non-force push from local `staging` to `origin/staging`; leave `main`
  untouched
- Before SHAs: local `staging`, `origin/staging`, local `main`, and
  `origin/main` all at `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`;
  both local/remote divergence counts are `0 0`
- After SHAs: pending validation, commit, push, and direct remote readback
- Validation: planned `npm run typecheck`, `npm run lint`, `git diff --check`,
  and `git diff --cached --check`; no build requested
- Infrastructure classification: MenuList QA `NO_INFRA_CHANGE`; MenuList
  production `NO_INFRA_CHANGE`; Answerlattice QA
  `SOURCE_RESTORED_TO_DEPLOYED_BYTES`; Answerlattice production
  `SOURCE_RESTORED_TO_DEPLOYED_BYTES`
- Deployment evidence or blocker: the current working batch has no Firebase
  rules, indexes, Storage rules, or Functions path. The complete path review
  from infrastructure release `aeb0fc2e34e20f182dd8758db9fc7e97105aba4d`
  found only the previously audited Answerlattice context-bundle source
  restoration in `e0bf57fd0ac42ccc6a7c7e434de22b2296d534b9`; operation
  `GIT-20260823-195334-compiled-context-staging` records authenticated QA and
  production deployed-byte parity. No Firebase or Vercel deployment is part of
  this operation.
- Remote readback and divergence: pending
- Final filesystem state: pending
- Attribution confidence: exact
- Notes: fetch completed before comparison; no registered concurrent worktree,
  no branch with commits unmerged into `staging`, and the tracked diff hash was
  stable across the review window.

### GIT-20260824-003007-staging-snapshot-correction

- Timestamp: `2026-08-24T00:30:07+05:30`
- Record type: `CORRECTION`
- Actor/session/thread ID: Codex thread
  `019e3e73-7d6a-7142-9c09-24bce20e1c65`; concurrent file writer `unknown`
- Worktree path/ID: `/Users/danny/Projects/MenuListAi/menulist-core`;
  primary and only registered worktree
- Starting state: corrects operation
  `GIT-20260824-002637-staging-local-changes`; the candidate snapshot expanded
  during validation to 46 tracked modified files plus this untracked ledger,
  while branch HEAD remained
  `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`
- Operation: preserve the expanded local snapshot, wait for a stable cutoff,
  rerun validation, commit on `staging`, and perform one non-force push to
  `origin/staging`; leave `main` untouched
- Before SHAs: local `staging`, `origin/staging`, local `main`, and
  `origin/main` remain at `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`
- After SHAs: pending validation, commit, push, and direct remote readback
- Validation: the first TypeScript and lint passes completed successfully but
  are not release evidence because the snapshot expanded during that window;
  both checks will be rerun against the stable 47-file candidate
- Infrastructure classification: MenuList QA `NO_INFRA_CHANGE`; MenuList
  production `NO_INFRA_CHANGE`; Answerlattice QA
  `SOURCE_RESTORED_TO_DEPLOYED_BYTES`; Answerlattice production
  `SOURCE_RESTORED_TO_DEPLOYED_BYTES`
- Deployment evidence or blocker: the expanded files change Answerlattice plan,
  onboarding, public-site, tests, and documentation only. No Firebase rules,
  indexes, Storage rules, or Functions path was added. Prior authenticated
  deployed-byte evidence cited by the corrected operation remains applicable;
  no deployment is required or authorized.
- Remote readback and divergence: pending
- Final filesystem state: pending
- Attribution confidence: exact for observed filesystem and refs; concurrent
  writer identity `unknown`
- Notes: no file was staged while the snapshot was moving. The expanded tracked
  diff and status hashes remained identical for 15 seconds before review
  resumed.

### GIT-20260824-003445-staging-snapshot-final-correction

- Timestamp: `2026-08-24T00:34:45+05:30`
- Record type: `CORRECTION`
- Actor/session/thread ID: Codex thread
  `019e3e73-7d6a-7142-9c09-24bce20e1c65`; concurrent file writer `unknown`
- Worktree path/ID: `/Users/danny/Projects/MenuListAi/menulist-core`;
  primary and only registered worktree
- Starting state: corrects operations
  `GIT-20260824-002637-staging-local-changes` and
  `GIT-20260824-003007-staging-snapshot-correction`; the final candidate grew
  to 55 changed paths, including the completed Answerlattice commercial-system
  and shared tax-policy work, while branch HEAD remained
  `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`
- Operation: include the complete stable local snapshot in one `staging` commit
  and perform one non-force push to `origin/staging`; leave `main` untouched
- Before SHAs: local `staging`, `origin/staging`, local `main`, and
  `origin/main` remain at `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`
- After SHAs: pending final validation, commit, push, and direct remote readback
- Validation: TypeScript and lint must be rerun after the late commercial-system
  files; staged and unstaged whitespace/secret checks must pass on the combined
  final index
- Infrastructure classification: MenuList QA `NO_INFRA_CHANGE`; MenuList
  production `NO_INFRA_CHANGE`; Answerlattice QA
  `SOURCE_RESTORED_TO_DEPLOYED_BYTES`; Answerlattice production
  `SOURCE_RESTORED_TO_DEPLOYED_BYTES`
- Deployment evidence or blocker: the late files add product-scoped billing tax
  policy, environment-name readers, types, and documentation only. They add no
  Firebase rules, indexes, Storage rules, or Functions path. No Firebase or
  Vercel deployment is required or authorized.
- Remote readback and divergence: pending
- Final filesystem state: pending
- Attribution confidence: exact for observed filesystem and refs; concurrent
  writer identity `unknown`
- Notes: the combined cached and worktree diff/status hashes remained unchanged
  for 30 seconds before final review resumed. The only manual content adjustment
  was removal of three Markdown whitespace defects reported by
  `git diff --cached --check`.

### GIT-20260824-004247-staging-snapshot-release-cutoff

- Timestamp: `2026-08-24T00:42:47+05:30`
- Record type: `CORRECTION`
- Actor/session/thread ID: Codex thread
  `019e3e73-7d6a-7142-9c09-24bce20e1c65`; concurrent file writer `unknown`
- Worktree path/ID: `/Users/danny/Projects/MenuListAi/menulist-core`;
  primary and only registered worktree
- Starting state: final correction to operation
  `GIT-20260824-002637-staging-local-changes`; the completed candidate contains
  65 changed paths after Answerlattice billing-document policy, PDF, server, and
  API route files arrived; branch HEAD remains
  `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`
- Operation: certify and commit the complete stable snapshot on `staging`, then
  perform one non-force push to `origin/staging`; leave `main` untouched
- Before SHAs: local `staging`, `origin/staging`, local `main`, and
  `origin/main` remain at `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`;
  final pre-commit fetch confirmed `HEAD...origin/staging` divergence `0 0`
- After SHAs: pending definitive validation, commit, push, and direct remote
  readback
- Validation: definitive TypeScript, lint, staged whitespace, secret-pattern,
  and clean-index checks must run after all 65 paths are staged
- Infrastructure classification: MenuList QA `NO_INFRA_CHANGE`; MenuList
  production `NO_INFRA_CHANGE`; Answerlattice QA
  `SOURCE_RESTORED_TO_DEPLOYED_BYTES`; Answerlattice production
  `SOURCE_RESTORED_TO_DEPLOYED_BYTES`
- Deployment evidence or blocker: the completed billing-document work is in
  Next.js routes and shared server libraries, not Firebase rules, indexes,
  Storage rules, or Cloud Functions. Prior authenticated deployed-byte evidence
  remains applicable. No Firebase or Vercel deployment is required or
  authorized.
- Remote readback and divergence: pending
- Final filesystem state: pending
- Attribution confidence: exact for observed filesystem and refs; concurrent
  writer identity `unknown`
- Notes: the entire staged, unstaged, and untracked snapshot remained byte-for-
  byte unchanged for 60 seconds before this release cutoff. No commit or push
  occurred during the moving-snapshot window.

### GIT-20260824-011129-staging-final-infrastructure-cutoff

- Timestamp: `2026-08-24T01:11:29+05:30`
- Record type: `CORRECTION`
- Actor/session/thread ID: Codex thread
  `019e3e73-7d6a-7142-9c09-24bce20e1c65`; concurrent file writer `unknown`
- Worktree path/ID: `/Users/danny/Projects/MenuListAi/menulist-core`;
  primary and only registered worktree
- Starting state: final correction to operation
  `GIT-20260824-002637-staging-local-changes`; the completed candidate contains
  116 changed paths after the Answerlattice commercial-readiness task finished
  source, tests, Firebase policy, public copy, and required documentation;
  branch HEAD remains `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`
- Operation: validate the complete stable snapshot, commit it on `staging`,
  perform one non-force push to `origin/staging`, and execute only the Firebase
  infrastructure publications required by the changed source; leave `main` and
  Vercel untouched
- Before SHAs: local `staging`, `origin/staging`, local `main`, and
  `origin/main` remain at `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`;
  the final pre-commit fetch confirmed `HEAD...origin/staging` divergence `0 0`
- After SHAs: pending definitive validation, commit, one push, Firebase
  publication/readback, and direct Git remote readback
- Validation: definitive TypeScript, lint, Answerlattice commercial-readiness,
  both Functions builds, staged whitespace, secret-pattern, and clean-index
  checks are required after all 116 paths are staged
- Infrastructure classification: MenuList QA `DEPLOY_REQUIRED`; MenuList
  production `DEPLOY_REQUIRED`; Answerlattice QA `DEPLOY_REQUIRED`;
  Answerlattice production `DEPLOY_REQUIRED`
- Deployment evidence or blocker: Answerlattice changes now include
  `firestore-answerlattice.rules`, `firestore-answerlattice.indexes.json`, and
  `functions-answerlattice/`; MenuList Functions shared notification data also
  changed under `functions/`. Repository policy requires QA-first publication
  and production parity after successful validation, with exact rules and index
  readback. No Vercel deployment is authorized.
- Remote readback and divergence: pending
- Final filesystem state: pending
- Attribution confidence: exact for observed filesystem and refs; concurrent
  writer identity `unknown`
- Notes: the external task's
  `npm run verify:answerlattice-commercial-readiness` process exited before the
  cutoff, then the complete staged, unstaged, and untracked snapshot remained
  byte-for-byte unchanged for 60 seconds. This session will rerun validation
  independently rather than relying on another process's unobserved exit code.

### GIT-20260824-012019-git-only-staging-cutoff

- Timestamp: `2026-08-24T01:20:19+05:30`
- Record type: `CORRECTION`
- Actor/session/thread ID: Codex thread
  `019e3e73-7d6a-7142-9c09-24bce20e1c65`; concurrent file writer `unknown`
- Worktree path/ID: `/Users/danny/Projects/MenuListAi/menulist-core`;
  primary and only registered worktree
- Starting state: corrects operation
  `GIT-20260824-011129-staging-final-infrastructure-cutoff` after the user
  explicitly restricted this operator to Git management only. The stable
  candidate contains 116 staged paths, no unstaged files, and no untracked
  files; branch HEAD remains
  `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`.
- Operation: commit the complete stable snapshot on `staging` and perform one
  non-force push to `origin/staging`; do not move `main` and do not perform any
  further deployment
- Branch state before operation: local `staging` and `origin/staging` at
  `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`; local `main` and `origin/main`
  independently at `d534e64822eb8aea8fc4b4ecd0f17a45090afed8`
- Branch state after operation: pending commit, single push, and direct remote
  readback; `main` must remain unchanged
- Validation already completed before the Git-only restriction: root
  TypeScript, root lint, Answerlattice commercial readiness, MenuList Functions
  build, Answerlattice Functions build, staged whitespace, and secret-pattern
  checks passed. No additional validation or build is authorized for this
  operation.
- Infrastructure classification: MenuList QA `DEPLOY_REQUIRED`; MenuList
  production `DEPLOY_REQUIRED`; Answerlattice QA `DEPLOY_REQUIRED`;
  Answerlattice production `DEPLOY_REQUIRED`
- Deployment evidence or blocker: before the Git-only restriction, one
  Answerlattice QA Firestore rules-only deployment completed for local source
  byte count `115461` and SHA-256
  `461bf3a20a5bf5259653f6f7e99e2fee3305ed0b1e0d774f3720ff63e358f31a`.
  Exact active-release readback was not completed, and Answerlattice indexes
  and Functions remain pending. No Answerlattice production, MenuList QA or
  production, or Vercel deployment occurred. This operator will perform no
  further deployment.
- Remote readback and divergence: pending single Git push and direct readback
- Final filesystem state: pending commit and push
- Attribution confidence: exact for this session's observed Git state and the
  completed QA rules command; concurrent writer identity `unknown`
- Notes: staged snapshot SHA-256 before this correction was
  `372be54d199592fb560a4f4a25531346adc358198e2524a49a5d576f450b6d14`.
  Deployment state is recorded only for audit continuity and does not expand
  this operation beyond Git management.
