# Firebase Scale And Cost Closeout - Firebase Notes

**Status:** Source-gated; QA Functions/index releases pending
**Last verified:** July 22, 2026

## Before And After

| Boundary | Before | After |
| --- | --- | --- |
| Store-local scheduler | hourly wake; due stores only | unchanged |
| Platform nightly suite | once in every invocation with a due store; at global scale up to 24 platform-wide passes per UTC day | At most one successful platform-wide suite per UTC day |
| Concurrency | two hourly instances could both begin global work | one transactional lease owner; only the current owner may finalize state |
| Failure recovery | next populated hour retried implicitly | ten-minute lease expiry plus 55-minute retry delay |
| No due stores | early exit skipped all global work | daily owner can run global work without a due store |

The exact saving depends on store timezone distribution and task data volume.
The steady-state trade is up to 24 small lease reads per day and two daily state
writes in exchange for removing repeated full-platform queries, writes,
deletes, and provider-related work.

## Index And Retention Review

- MenuList/shared: 154 composites, 50 overrides, 15 TTL policies.
- Answerlattice: 94 composites, 17 overrides, 13 TTL policies.
- CampaignCue: no composites or overrides; its current exact-workspace queries
  use automatic single-field indexes.
- SignalDesk: 72 composites; retained because its workflow queries are a
  separate product boundary and were source-gated feature by feature.
- TTL fields in maintained manifests have automatic indexes disabled.
- `platformSummary.stores`, `platformSummary.projects`, analytics maps, menu
  intelligence maps, store settings maps, support-ticket payload arrays, and
  public-draft payloads retain explicit index exemptions.

Six exact duplicate MenuList composites and one exact duplicate Answerlattice
composite were removed. One identical definition remains for every affected
query shape, so query capability is unchanged. Firestore rules, Storage rules,
field overrides, and TTL policies did not change in this closeout.

## Required QA Releases

MenuList QA requires the scheduler source and deduplicated index manifest:

```bash
env -u GOOGLE_APPLICATION_CREDENTIALS firebase deploy \
  --project menulist-qa \
  --config firebase.json \
  --only firestore:indexes,functions:computeDecisionBlocksScores \
  --non-interactive
```

Answerlattice QA requires only its deduplicated index manifest:

```bash
env -u GOOGLE_APPLICATION_CREDENTIALS firebase deploy \
  --project answerlattice-qa \
  --config firebase-answerlattice.json \
  --only firestore:indexes \
  --non-interactive
```

Do not run production until QA scheduler logs prove:

- one daily lease completion;
- hourly store-local runs continue;
- later same-day runs show `daily_cadence`;
- a forced failed state respects retry delay; and
- platform task results/failure alerts remain bounded.

The July 22 ownership re-audit added explicit stale-owner emulator cases for
both `_system/decisionBlocksPlatformDaily` and the per-task
`_system/menulistMaintenanceTaskLock_*` documents. A replacement owner retains
its lease and state when an expired predecessor finishes late. Both local
emulators and the Functions build pass; the combined MenuList QA Functions
release remains blocked before upload by unavailable Firebase CLI
authentication.

The current Functions and index worktree contains multiple already-reviewed
feature changes, so a clean, isolated release state and authorized Firebase IAM
are owner/release prerequisites. No deploy is safe from this mixed source state.
