# Description Generation - Firebase and Cost Contract

**Status:** Firebase cost evidence; not current launch certification
**Last cross-check:** July 15, 2026

> This is source-backed Firebase/cost evidence. Release approval still requires current production-readiness evidence, External Certification Runbook evidence, AI accounting/source gates, target provider smoke, authenticated desktop/mobile QA, deploy evidence, and production-host smoke.

## Storage model

Description Generation adds no collection and no per-item operation document.

| Data | Existing authority | Write behavior |
| --- | --- | --- |
| Item descriptions and `descriptionSource` | existing project document | one project save after successful bulk scope, or existing item Save flow |
| Owner-visible AI activity | `menulistAiOperations/{tId}/{sId}/{operationId}` | one compact row per successful API request/batch |
| Credit balance and reservation | existing subscription/accounting documents | paid rewrite reserve, settle, or refund transaction |
| Public menu cache | existing tagged cache | invalidated by project DAL after save |

The `/api/descriptions` and `/api/new-item-metadata` routes do not re-read project item content to derive first-pass eligibility. The authenticated client already has project/file/item context; server-owned boundaries validate identity shape, permission, outlet policy, capacity, and output. The shared outlet-policy helper reads the scoped project and, when linked, the master-store policy.

## Operation costs

| Action | Owner credits | Request scope |
| --- | ---: | --- |
| `ADD_DESCRIPTION` | 0 | up to 100 eligible items, approximately 180 KiB item payload, and 300 item-language output cells per batch |
| `NEW_ITEM_METADATA` | 0 | one item |
| `REWRITE_DESCRIPTION` | 1 current description-rewrite credit | up to 100 eligible items, approximately 180 KiB item payload, and 300 item-language output cells per batch |

Current values are source-controlled in `src/constants/AI/unitCosts.ts:79`, `src/constants/AI/unitCosts.ts:80`, and `src/constants/AI/unitCosts.ts:110`. The public credit label/rate authority is `src/data/shared/contentCreditPolicy.ts`.

The free metadata action accepts only an empty canonical source description. A direct request carrying existing source copy fails schema validation before provider work or accounting; rewrites use `REWRITE_DESCRIPTION`.

The metadata provider prompt receives the localized category name, sanitized bounded owner text, and request-local item/attribute aliases. It only generates a first description from explicit context. Original attribute IDs are restored server-side before output projection; price and source-language identity still come from the validated request rather than provider output.

Large files are split sequentially when the 100-item cap, approximately 180 KiB serialized-item payload cap, or 300 item-language output-cell cap is reached. A paid refresh of 101 ordinary eligible items in one-to-three languages therefore produces at least two requests, two settled operation rows, and two rewrite-credit charges; unusually large item text or more languages can cause an earlier split. Before provider work, desktop and mobile compute that final batch count through the same payload/chunk helper and show the exact current credit count. When that count is greater than one, the first request also uses it for server-side whole-scope capacity admission. The request then reserves only its own normal unit, preserving the existing operation-row and refund contract.

## Read/write path

```text
client project already loaded
  -> API permission/policy checks
  -> first paid batch admits the complete request count against current capacity
  -> optional paid capacity reservation transaction
  -> provider-only item ID aliases and provider call
  -> alias-key allowlisting, original-ID restoration, complete output validation
  -> accounting settlement and compact owner operation row
  -> client merges full selected scope
  -> one project DAL save
  -> public menu/OBP cache invalidation
```

If a batch fails before settlement, its paid reservation is safely refunded by `src/app/api/descriptions/route.ts:733`. Earlier independently successful batches remain valid operation rows, but the orchestrator does not save a partial project.

The whole-scope admission reuses the first request's existing subscription capacity check and adds no API round trip, collection, operation row, or project read. It is not a durable reservation for all future requests. Concurrent credit use, a later provider failure, or final project-save failure can still occur after an earlier request settles; solving that would require a job-level accounting architecture that is intentionally outside the current synchronous flow.

## Cost controls

- 256 KiB request-body limit.
- Client request fields are bounded to the route schema, then batches are capped at 100 unique items, approximately 180 KiB of serialized item payload, and 300 item-language output cells; the API allows at most 100 unique items and 20 unique target languages per call.
- Shared AI rate limit before provider work.
- Quantity-aware admission on the first multi-request paid refresh; per-request reservations remain exact and recoverable.
- SAFE_MODE before provider work.
- No duplicate project read inside the description route.
- No per-description Firestore writes.
- No generated text duplicated into accounting-only history.
- No project item ID is sent as a provider output key; stable request-local aliases are restored before accounting and response.
- Browser batch accumulation uses a null-prototype map and own-key merge checks for imported item-ID safety.
- Sequential file/batch processing avoids uncontrolled client concurrency.
- Project save invalidates public truth once after the successful bulk scope.

Provider parse failures use `description_provider_response_parse_failed` and the fixed `return_description_generation_failed` policy. That failure path makes no extra provider calls, performs no AI accounting writes or credit consumption, and does not save the project.

## Security rules and infrastructure

No Firestore rule, index, Storage rule, or Cloud Function change is required for this feature pass. Owner operation rows remain server-written; browser writes are denied by the existing accounting boundary. There is no Firebase deploy requirement because no Firebase infrastructure changed. The app-route/UI source still needs an explicit owner-authorized Vercel deploy action before it can change a target runtime; this pass does not run one.

## External evidence still pending

- provider smoke against the target model/environment;
- authenticated desktop and mobile browser/device QA;
- target deployment evidence;
- production-host cache and Transactions smoke.

These are environment checks, not missing source implementation.
