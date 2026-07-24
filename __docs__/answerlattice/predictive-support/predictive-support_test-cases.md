# Predictive Support And Known Issues Test Cases

**Last verified:** July 21, 2026

## Contract tests

| Case | Expected result |
| --- | --- |
| Valid manual predictive trigger with exact page | Accepted |
| Active trigger without page | Rejected |
| Unknown condition or action field | Rejected |
| Invalid priority, cooldown, ID, scope, kind/action pair, or timestamp | Rejected |
| Private or non-HTTPS known-issue status URL | Rejected |
| Malformed stored trigger | Omitted from runtime summary |
| Summary with more than 200 entries | Entire summary rejected/fails closed |
| Valid known issue outside active window | Not delivered |
| Valid known issue while an ordinary prompt cooldown exists | Delivered while its active window remains valid |
| Two concurrent ordinary requests for one workspace/session/trigger | One Redis `SET NX EX` claim succeeds; at most one prompt is delivered |
| Same session/trigger identity under another tenant or store | Uses a distinct cooldown key |
| Redis missing or cooldown claim fails for an ordinary prompt | Fails closed and emits bounded failure diagnostics |
| Context mismatch | Not delivered |
| Equal priority | Deterministic trigger ID tie-break |
| Runtime trigger projection | Private/advisory fields omitted |
| Public suggestion over 32 KiB or malformed procedure | Discarded |

## API admission tests

| Case | Expected result |
| --- | --- |
| Missing/invalid widget key | No predictive result |
| Rate-limit provider unavailable | Fail closed |
| Wrong product, purpose, or scope | Rejected |
| Disallowed origin or invalid runtime token | Rejected |
| Body over 4 KiB or extra fields | Rejected |
| Missing bounded session ID | Rejected |
| Interaction for inactive, expired, or context-mismatched trigger | Rejected |
| Interaction while signal mutation disabled | Success with `recorded: false` |
| Valid shown/opened/dismissed interaction | At most one governed signal |

## Owner and rule tests

| Case | Expected result |
| --- | --- |
| Manual active create with exact page | Allowed |
| Browser create with `friction_auto` or `system` source | Rejected |
| Client supplies resolved suggestion, friction evidence, or effectiveness | Rejected |
| Cross-workspace mutation | Rejected |
| Owner switches workspace before the next effect | Previous trigger rows synchronously hidden |
| Slower prior-workspace request resolves last | Ignored by request generation |
| Trigger source write succeeds | Matching audit row commits in the same Firestore batch |
| Trigger/audit commit succeeds but summary rebuild fails | Mutation remains successful, fixed synchronization warning shown, authoritative list refreshed |
| Summary commit succeeds but authenticated `predictive` tag revalidation fails | Mutation remains successful with `summarySynchronized: false` and fixed synchronization warning |
| Interaction arrives after a trigger was disabled | Fresh summary read rejects the stale trigger; no signal write |
| Empty/populated public summary cached before owner mutation | Exact-workspace `predictive` tag invalidated after the rebuilt summary commits |
| Same browser context is requested again after delivery | Loader does not replay a cached suggestion; server cooldown/current summary remains authoritative |
| Context changes while an earlier request is in flight | Older response is ignored and cannot replace current-context public truth |
| Suggested-trigger list query | One exact `status == suggested` predicate; no duplicated filter |
| Change trigger kind | Rejected |
| Legacy record missing kind updated with action-derived kind | Allowed once |
| Activate suggested trigger without page | Rejected |
| Review suggested trigger, assign page, save, activate | Allowed |

## Nightly state tests

| Case | Expected result |
| --- | --- |
| Two concurrent runs see the same uncovered friction entity | One deterministic suggestion exists; generated counts total one |
| Malformed friction snapshot | Task throws and no suggestion is created |
| Foreign-product signal shares numeric scope and trigger ID | Excluded by `pId: AL` query partition |
| Engagement rows exceed the complete-window cap | Task fails; partial evidence is not written |
| Prior evidence ages beyond 30 days | Advisory counts reset to zero |
| Summary content changes | Summary, source version, and stale manifest commit atomically |
| Summary source hash is unchanged after a marked rebuild | Summary and source-version increment are skipped |

## Loader behavior tests

| Case | Expected result |
| --- | --- |
| `context.page` absent but normalized `contextKey` present | Context key used as page |
| Context changes | Previous suggestion cleared |
| Predictive capability disabled after config refresh | Suggestion cleared |
| Capability becomes enabled after config refresh | Request scheduled |
| Runtime token changes | In-flight request invalidated and current context retried |
| Widget hidden or runtime denied | Suggestion cleared |
| Show/open/dismiss | Correct bounded interaction event attempted |
| Visitor/customer ID configured | Cooldown still uses non-PII predictive session ID |

## Commands

```bash
npm run test:answerlattice-predictive-support
npm run test:answerlattice-predictive-cooldown
npm run test:answerlattice-predictive-cache-invalidation
npm run test:answerlattice-predictive-sync-state:emulator
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-predictive:rules
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-predictive:shared-rules
npm run test:answerlattice-runtime-summary-contracts
node scripts/verification/verify-answerlattice-runtime-truth.js
env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth
npx tsc --noEmit --pretty false
npm --prefix functions-answerlattice run build
npm run verify:dependency-freeze
git diff --check
```

## External tests

Local tests do not replace hosted allowed-origin proof, real Redis cooldown behavior, authenticated owner management, production Firebase rule deployment, physical mobile browsers, or measured resolution/task-completion outcomes.
