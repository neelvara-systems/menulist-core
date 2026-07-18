# Decision Intelligence and CMI — End-to-End Verification

**Date:** July 16, 2026
**Verdict:** Local source complete. Firebase QA deployment and live owner/customer evidence remain pending.

## Scope reviewed

- current project catalog, aliases, active/available state, duration, price, owner boost, and bestseller metadata;
- compact 7-day analytics production and consumption boundary;
- Decision Block scoring, eligibility, TTL, project projection, and public cache invalidation;
- owner desktop and MobileShell Featured section controls;
- public route, customer runtime filters, stale behavior, translations, and website claims;
- CMI confidence, time observations, suppression observations, calibration, priority, audit context, state persistence, DAL, and Firestore rules;
- scheduled and manual recovery authorization, scope, response size, cost, and monitoring behavior; and
- maintained specification, implementation, Firebase, mobile, help, marketing, website, tracker, and historical verification docs.

## Correctness fixes

1. **Catalog authority:** Both DI and CMI use one catalog-first extractor. Stale analytics-only IDs are excluded; current item aliases merge prior analytics.
2. **Shared configuration:** App and Functions copies of duration thresholds and enabled blocks are byte-identical. Specialty/creative/retail drift is removed.
3. **Explicit duration:** Duration `0` remains valid. Quick candidates require an explicit duration no greater than the shared category threshold; no default duration is presented as item truth.
4. **Public evidence:** Automatic popular candidates need at least three per-item behavioral clicks and use neutral `Popular choice` wording instead of inferred favorites, bookings, ratings, orders, or trends.
5. **Value boundary:** The average uses priced items only, and automatic Value candidates must be at or below that average.
6. **Summary read cost:** A valid empty `platformSummary/projects_{sId}` stops without scanning the nested project collection.
7. **CMI map pruning:** The complete scheduler-owned document is replaced, preventing deleted nested item keys from accumulating.
8. **Distinct-date maturity:** Same-settled-date manual recovery does not advance confidence, stable/top-item days, or calibration. `lastAnalyticsDate` records progression.
9. **Reachable fatigue:** A falling day uses the preceding stable streak, so the fatigue condition is logically reachable.
10. **Time correctness:** Time eligibility enforces its documented 10% threshold. Stored nightly priority no longer applies the Cloud Function runtime hour as if it were store-local presentation time.
11. **Concurrency:** Audit correlation context is request-local rather than mutable module-global state.
12. **Stale DAL:** Disabled, absent, or expired CMI returns neutral/empty presentation output.

## Security, scale, and cost fixes

- `triggerDecisionBlocksScoring` and `triggerStoreNightlyScheduler` re-read `users/{uid}` and require current active platform authority.
- Callable document IDs, canonical active store tenant scope, and active project state are validated before scoped writes.
- Platform-wide manual Decision Block fan-out is rejected; one project or one store is the maximum callable scope.
- Manual responses return bounded counts/status instead of the generated projection or per-project result arrays.
- Functions flags independently gate Decision Block projection writes and CMI private-state writes without disabling shared analytics settlement.
- Backend projection writes trigger one public-cache revalidation attempt per affected store, including scheduled, manual-project, and manual-store paths.
- No collection, listener, query fan-out, index, Firestore rule, Storage rule, dependency, scheduler, queue, or owner setting was added.

## Owner, mobile, public, and docs parity

- Desktop and MobileShell Featured section entry/actions are gated by `ENABLE_DECISION_BLOCKS` and use the same settings helpers.
- Public rendering remains gated and continues to apply lifecycle, TTL, availability, category time, duplicate-item, price-display, and minimum-block checks.
- Owner copy no longer guarantees that an unavailable selection always has a replacement and no longer explains internal scoring signals.
- Website owner-control copy states that current eligibility, availability, and menu safety decide whether a selected item appears.
- CMI is documented as private infrastructure with no owner/mobile/public screen or standalone marketing claim.
- Stale maintained docs were archived under each feature's `_archive/pre-2026-07-16/` folder. Historical logic/validation reports are explicitly superseded rather than presented as current proof.

## Verification evidence

Passed on the current worktree:

- `npm run verify:decision-intelligence-boundary`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:analytics-write-boundary`
- `npm run verify:public-business-truth`
- `npm run verify:public-customer-delivery`
- `npm run verify:working-hours-boundary`
- `npm run verify:menu-project-editor-boundary`
- `npm run verify:mobile-shell-route-map`
- `npm run verify:dependency-freeze`
- `npx tsc --noEmit --incremental false --pretty false`
- focused root ESLint for all touched app/test sources
- `npm --prefix functions run build`
- `npm --prefix functions run lint` (passes with the existing Functions Next-pages warning)
- `npm run docs:check-links` (0 broken links; 27 pre-existing video filename warnings)
- locale JSON parsing, shared-config byte comparison, and `git diff --check`

The first analytics emulator attempt inherited a deleted local service-account path and failed before test execution. The exact gate passed when rerun with `GOOGLE_APPLICATION_CREDENTIALS` unset, which is the intended emulator boundary.

The root production build was not run, in line with repository build discipline.

## Firebase QA deployment

Attempted:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler --non-interactive
```

Result:

- Functions predeploy lint passed.
- Functions predeploy TypeScript build passed.
- Cloud Resource Manager returned HTTP 403: caller does not have permission.
- No Function was uploaded.

## Pending owner/release work

1. Repeat the exact scoped QA Functions deploy with an authorized Google account.
2. Release the app through the approved Next.js/Vercel process; no Vercel deploy was run here.
3. Verify one low-data menu, one stable menu, owner-selected available/unavailable items, prices hidden, duration coverage, category time slots, stale TTL, and cache refresh on authenticated desktop and MobileShell plus customer devices.
4. Confirm Scheduler Monitor/manual store recovery and next due-store scheduled run in QA.
5. Run production-host smoke and current release certification before production approval.

These tasks remain pending and do not reopen local source completion.
