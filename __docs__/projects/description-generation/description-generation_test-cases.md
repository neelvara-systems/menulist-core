# Description Generation - Test Cases

**Last updated:** July 15, 2026

## Automated source cases

| ID | Case | Expected |
| --- | --- | --- |
| DG-T01 | forged ADD payload carries existing description | server derives REWRITE billing action |
| DG-T02 | forged free metadata payload carries existing source description | Zod rejects before provider work |
| DG-T03 | provider includes unknown item/language keys | unknown scope is dropped |
| DG-T04 | provider omits one requested item or language | completeness check fails |
| DG-T05 | 205 eligible items | client chunks 100/100/5 |
| DG-T06 | 100 items with unusually large serialized text | client splits before the approximately 180 KiB item-payload cap |
| DG-T07 | 100 items across 20 target languages | client chunks into at most 300 item-language cells per request |
| DG-T08 | duplicate item ID or target language | Zod rejects request |
| DG-T09 | unnamed item | omitted from bulk payload |
| DG-T10 | non-empty manual description in source or secondary language | protected from ADD and REWRITE |
| DG-T11 | short but non-empty generated/legacy source description | excluded from free ADD and eligible for paid REWRITE |
| DG-T12 | valid imported item ID contains punctuation or exceeds the prompt's ID limit | provider receives a stable alias and the server restores the exact original ID |
| DG-T13 | imported item ID is `__proto__` | generated copy merges as an own item key without prototype mutation |
| DG-T14 | stored item text exceeds route field limits in bulk or single-item rewrite | both paths use the shared bounded payload before batching/validation |
| DG-T15 | metadata item text contains prompt-closing backticks and instruction-like wording | prompt input removes the injection phrase and delimiter text |
| DG-T16 | metadata attribute ID contains punctuation or exceeds provider-safe context | provider receives an alias and server restores the exact ID |
| DG-T17 | generated multilingual description saved after source changes | target translations preserved |
| DG-T18 | manual source edit saved after source changes | stale target translations cleared |
| DG-T19 | metadata output attempts to change source identity/price | owner source/name/attribute identity and price preserved |
| DG-T20 | manual item passes through metadata merge | manual provenance preserved |
| DG-T21 | single-item first generation has a category ID plus localized category name | provider request receives the bounded localized category name, not the opaque ID |
| DG-T22 | first-description metadata prompt is inspected | obsolete existing-copy translation and promotional directions are absent |
| DG-T23 | multi-batch rewrite request shape | optional total request count is accepted only for REWRITE and only from 2 through 1,000 |
| DG-T24 | 101-item paid rewrite executes two batches | only the first request carries `operationRequestCount: 2`; the second request keeps the normal request shape |
| DG-T25 | second provider batch fails after the first succeeds | shared orchestrator rejects and does not publish a local project update |
| DG-T26 | provider batches succeed but project persistence throws | shared orchestrator rejects and does not publish a local project update |
| DG-T27 | single-request REWRITE or multi-request free ADD | admission count remains absent and the established request shape is unchanged |
| DG-T28 | first multi-request paid call returns capacity exhaustion | only one request is attempted, Billing-capacity error propagates, and no local project update is published |
| DG-T29 | mobile bulk, single-item, or Repair Menu description work reaches capacity refusal | owner sees enhancement-pack/Billing guidance, not translation-credit copy |

DG-T01, DG-T03-DG-T14, and DG-T23-DG-T28 run in `test:description-output-boundary`. DG-T02 and DG-T15-DG-T22 run in `test:new-item-metadata-output-boundary`. DG-T29 is source-gated by `verify:ai-accounting` across every active MenuList mobile locale.

## Authenticated browser/device cases

| ID | Flow | Expected |
| --- | --- | --- |
| DG-B01 | desktop bulk add | counts eligible named source gaps; saves after full success |
| DG-B02 | mobile bulk add | same project result as desktop; sheet closes after save |
| DG-B03 | desktop/mobile bulk refresh cancel | no provider request and no charge |
| DG-B04 | desktop/mobile bulk refresh confirm | generated items refresh; manual items remain; Transactions shows revised count/credits |
| DG-B05 | one file's later batch fails | no project/local partial success and generic error shown |
| DG-B06 | single item first generation, then Save | first description/translations persist; no credits used row |
| DG-B07 | single item existing refresh, then Save | actual source description changes; rewrite credit row shown |
| DG-B08 | single item refresh, then Cancel | project remains unchanged; successful operation row remains |
| DG-B09 | manual single item | refresh control absent; direct edit remains possible |
| DG-B10 | role lacks generation permission | direct controls hidden/guarded, Repair Menu omits description work, and API returns 403 if invoked |
| DG-B11 | linked outlet policy denies description action | calm refusal; no provider call |
| DG-B12 | linked local-only item allowed | description saves to outlet project and public cache invalidates |
| DG-B13 | linked outlet override changes only a target-language description | complete multilingual override persists even when source wording is unchanged |
| DG-B14 | provider partial/malformed response | no success, save, or settled paid charge |
| DG-B15 | complete paid refresh needs more capacity than currently available | first request returns Billing guidance before provider work; no generated output |
| DG-B15A | capacity changes concurrently after first admission | later refused request shows Billing guidance; no project/local partial success |
| DG-B16 | public menu reload after save | current description visible without stale cached output |
| DG-B17 | desktop/mobile Transactions | Add/Rewrite labels, counts, and credit/no-credit state match operation |

## Stop rules

Do not approve release if any success toast appears after a failed request, manual description text in any language is overwritten, generated translations disappear on Save, owner credits are deducted for ADD, a rewrite avoids the paid action, or public output remains stale after a successful save.
