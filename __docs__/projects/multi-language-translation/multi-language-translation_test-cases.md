# Multi-Language Translation — Test Cases

**Last updated:** July 15, 2026

## API validation

| ID | Input | Expected |
| --- | --- | --- |
| API-01 | One menu entity key, object target | 200 with `translations` after mocked valid provider response |
| API-02 | Project-public keys, array with one target | Batch prompt/normalizer and `translationsByLanguage` response |
| API-03 | Business-copy keys, no project ID | Schema passes; no project/outlet lookup |
| API-04 | Menu key, no project ID | 400 before provider/capacity |
| API-05 | Unknown key | 400 |
| API-06 | Empty input map | 400 |
| API-07 | More than 1000 keys, overlong key/value/body | 400/413 before provider |
| API-08 | Duplicate target codes | 400 |
| API-09 | Source code also in targets | 400 |
| API-10 | Invalid/fabricated project ID | 400 |
| API-11 | Missing generation permission | 403 before project/capacity/provider/accounting |
| API-12 | Rate limit exceeded | 429 before provider |
| API-13 | SAFE_MODE | Maintenance response before provider |
| API-14 | Unknown language code or mismatched/instruction-like language name | 400 before provider |
| API-15 | More than five batch targets | 400 before provider |

## Provider/output boundary

| ID | Provider result | Expected |
| --- | --- | --- |
| OUT-01 | Valid single JSON | Exact requested keys returned |
| OUT-02 | Valid batch JSON with one target | Batch shape accepted |
| OUT-03 | Fenced JSON | Fence removed and parsed without retry |
| OUT-04 | Text containing one JSON object fragment | Object fragment parsed without retry |
| OUT-05 | Invalid initial JSON, valid retry | Retry result used; provider call count 2 |
| OUT-06 | Invalid initial and retry JSON | Generic failure, reservation refund if unsettled, bounded parse diagnostic |
| OUT-07 | Missing/invalid requested value | Source fallback is bounded in the server projection and coverage record, but clients reject the partial map so it is not saved as translated text; history says the result has gaps |
| OUT-08 | Extra provider keys | Extra keys dropped |
| OUT-09 | Batch missing target-language object | Generic failure; no false client success |
| OUT-10 | Batch language object misses or invalidates one requested key | Shared batch client rejects the entire map before merge |
| OUT-11 | Coverage count or translated-plus-fallback total does not match requested targets/fields | Client rejects the response summary and does not merge |

## Billing/accounting

| ID | Request | Expected |
| --- | --- | --- |
| BILL-01 | One item root, one target, requested item action | `ITEM_TRANSLATION`, 1 unit |
| BILL-02 | One category, one target | `ITEM_TRANSLATION`, 1 unit |
| BILL-03 | Two item roots but requested item action | Upgraded to `LANGUAGE_ADDITION`, 3 units |
| BILL-04 | Any entity with two targets but requested item action | Upgraded to `LANGUAGE_ADDITION`, 3 units |
| BILL-05 | File add plus project-public batch | Separate operation row and units for each request |
| BILL-06 | Capacity rejected | No provider call or operation settlement |
| BILL-07 | Successful provider, accounting persistence fails | Route follows shared accounting error boundary; no unrecorded owner success |
| BILL-08 | New compact history row | `languageSummary`, target codes, coverage/result counts visible; raw text absent |
| BILL-09 | Compact row stores only target code | Desktop/mobile summary resolves the catalog-backed name, for example `French (fr)` |

## Desktop

| ID | Case | Expected |
| --- | --- | --- |
| DESK-01 | Legacy project languages omit English | Modal normalization restores/protects English |
| DESK-02 | Add one language, one file | File and missing public fields translated, project saved |
| DESK-03 | Add multiple languages programmatically | Every target/file pair processed; progress total matches requests |
| DESK-04 | Cancel mid-flow | Completed work saved; partial wording; no full success |
| DESK-05 | Provider failure after earlier success | Completed work saved; failure/partial wording |
| DESK-06 | Remove English attempt | Blocked |
| DESK-07 | Retry file | All non-English targets checked using `LANGUAGE_ADDITION` |
| DESK-08 | Refresh English item tab | Control absent |
| DESK-09 | Refresh target item/category | Draft updated; project changes only after Save |
| DESK-10 | Command Center repair | English source, governed content only, project-public gaps included when permitted |
| DESK-11 | Remove configured customer default | Blocked until another default is selected |
| DESK-12 | Add/retry without generation permission | Owner guidance; no provider request |
| DESK-13 | Share/PDF with a non-English customer default | Export opens in the project/store preferred display language, not the English source merely because English is normalized first |

## Mobile

| ID | Case | Expected |
| --- | --- | --- |
| MOB-01 | Default language Marathi, source English | Marathi opens first; translation request source is English |
| MOB-02 | English is not display default | English row shows Source and cannot be removed |
| MOB-03 | Add below cap | Per-file/public work completes and project persistence finishes before success |
| MOB-04 | Add at cap | Controls disabled; no request |
| MOB-05 | Repair one/all | Default remains unchanged; saved project visible after reopen |
| MOB-06 | Item inherited from master | Refresh absent |
| MOB-07 | Category inherited from master | Parent blocks generation and shows connected message |
| MOB-08 | Category partial failure | Completed target names retained with partial warning |
| MOB-09 | No permission | Add/repair unavailable; default/removal management remains usable |
| MOB-10 | Transactions item translation | Green language action with source and target details |
| MOB-11 | Later file fails after one add/repair request succeeds | Last completed project snapshot persisted; partial/stopped message |
| MOB-12 | Repair-all fails inside a later language | Earlier language plus completed files in current language retained; failed file clearing absent |

## Linked outlets

| ID | Case | Expected |
| --- | --- | --- |
| OUTLET-01 | Client accidentally includes inherited item ID | Server 403 before capacity/provider |
| OUTLET-02 | Repair issue scan includes inherited/local items | Only local-only issue count returned |
| OUTLET-03 | Repair clears target content | Only local-only fields cleared |
| OUTLET-04 | Local item ID with valid linked project | Allowed when permission/capacity pass |
| OUTLET-05 | Project belongs to another store/tenant | Project-not-found/store-access response before provider |
| OUTLET-06 | Business-copy request without project entities | Uses authenticated store scope and skips outlet entity check |

## Project/business/special menu

| ID | Case | Expected |
| --- | --- | --- |
| COPY-01 | One missing project-public language | Array-of-one batch merges only missing fields |
| COPY-02 | Existing target project field | Existing text preserved |
| COPY-03 | Store business copy, one target | Batch response accepted without project ID |
| COPY-04 | Missing business-copy repair | Only missing target fields filled |
| COPY-05 | Desktop special-menu create | Real base project ID passes validation |
| COPY-06 | Mobile special-menu create | Base/default base project ID passes validation |

## Extraction and public output

| ID | Case | Expected |
| --- | --- | --- |
| EXT-01 | Request omits English | Stored job languages include English first |
| EXT-02 | Request contains duplicate/unknown codes | Duplicates/unknowns removed |
| EXT-03 | Request contains more than six known codes | First six normalized codes retained |
| EXT-04 | Customer requests available language | Requested language renders |
| EXT-05 | Requested field missing | English content fallback before another available value |
| EXT-06 | Invalid requested language | Configured default/render fallback used |
| EXT-07 | Arabic/Hebrew | RTL direction and layout correct on real mobile/desktop browsers |

## Documentation/locales

| ID | Case | Expected |
| --- | --- | --- |
| DOC-01 | Active docs scan | No current 90+/93/one-click/first-language-source claim |
| DOC-02 | Website CTA | Uses existing `/features/menu-content-prep` route |
| DOC-03 | All active locale JSON | Parses successfully |
| DOC-04 | Language management copy | English source and default customer language are distinct |
| DOC-05 | Billing example | Explains request-level units, including multi-file add |
| DOC-06 | Active public website locale overrides | No one-click, universal completion, or no-review translation claim overrides the source-backed website boundary |

## Automated commands

```bash
npx tsx scripts/verification/test-translation-output-boundary.ts
npx tsx scripts/verification/test-ai-operation-history-query.ts
npm run verify:ai-accounting
npm run verify:dependency-freeze
npm run docs:check-links
npx tsc --noEmit
git diff --check
```
