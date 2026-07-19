# Predictive Support And Known Issues Test Cases

**Last verified:** July 18, 2026

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
| Change trigger kind | Rejected |
| Legacy record missing kind updated with action-derived kind | Allowed once |
| Activate suggested trigger without page | Rejected |
| Review suggested trigger, assign page, save, activate | Allowed |

## Loader behavior tests

| Case | Expected result |
| --- | --- |
| `context.page` absent but normalized `contextKey` present | Context key used as page |
| Context changes | Previous suggestion cleared |
| Predictive capability disabled after config refresh | Suggestion cleared |
| Capability becomes enabled after config refresh | Request scheduled |
| Runtime token changes | Negative cache cleared and request retried |
| Widget hidden or runtime denied | Suggestion cleared |
| Show/open/dismiss | Correct bounded interaction event attempted |
| Visitor/customer ID configured | Cooldown still uses non-PII predictive session ID |

## Commands

```bash
npm run test:answerlattice-predictive-support
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
