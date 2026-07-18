# Description Generation - Product Specification

**Status:** Implemented source evidence; not current launch certification

**Product:** MenuList
**Last cross-check:** July 15, 2026

> Launch approval requires the active production-readiness audit, External Certification Runbook evidence, target feature-flag/provider review, AI accounting/source gates, provider smoke, authenticated desktop/mobile editor QA, deploy evidence, and production-host smoke.

## Purpose

Help an owner prepare clear menu-item description drafts while preserving owner-written truth, outlet governance, predictable credit behavior, and customer-language consistency.

## Owner outcomes

- Add a first description to eligible named items without consuming content credits.
- Refresh MenuList-generated descriptions with an explicit confirmation and governed enhancement charge.
- Keep manual descriptions unchanged during bulk or single-item refresh.
- Review a single-item result before Save.
- Save a successful bulk result without a second manual save step.
- See the action, compact result count, and credit use in owner Transactions.

## Entry paths

| Flow | First description | Existing description | Persistence |
| --- | --- | --- | --- |
| Desktop bulk modal | `ADD_DESCRIPTION` | confirmed `REWRITE_DESCRIPTION` | auto-saved after full success |
| Mobile bulk sheet | `ADD_DESCRIPTION` | confirmed `REWRITE_DESCRIPTION` | auto-saved after full success |
| Command Center / Repair Menu | adds missing source descriptions after language repair | no bulk rewrite | saved by the parent repair workflow |
| Desktop item editor | `NEW_ITEM_METADATA` for first description and translations | `REWRITE_DESCRIPTION` | draft until Save |
| Mobile item editor | `NEW_ITEM_METADATA` for first description and translations | `REWRITE_DESCRIPTION` | draft until Save |

## Functional requirements

| ID | Requirement |
| --- | --- |
| DG-01 | Use the canonical project source language and all configured target languages. |
| DG-02 | Only named, governance-eligible items participate in bulk counts and payloads. |
| DG-03 | `ADD_DESCRIPTION` includes only empty canonical source copy and never replaces an item carrying any non-empty manual description. |
| DG-04 | `REWRITE_DESCRIPTION` includes existing generated/legacy canonical source copy and excludes every manual item. |
| DG-05 | Professional, Friendly, and Premium tones plus Standard and Detailed lengths use project defaults and owner overrides. |
| DG-06 | The server derives ADD versus REWRITE billing from the submitted existing-description field. |
| DG-06A | `NEW_ITEM_METADATA` accepts only an empty source description; existing source copy must use `REWRITE_DESCRIPTION`. |
| DG-06B | First-description metadata prompts sanitize instruction-like owner text and use provider-only item/attribute IDs restored before output normalization. |
| DG-06C | First-description metadata uses the localized category name, bounded request text, and a generate-only factual prompt based on explicit item context. |
| DG-07 | Every requested item/language must be present after output normalization; otherwise the request fails before accounting. |
| DG-08 | Request text fields are bounded to API limits, then files are processed in sequential batches capped at 100 items, approximately 180 KiB of serialized item payload, and 300 item-language output cells. |
| DG-09 | A failed file/batch stops persistence and success presentation. |
| DG-10 | Bulk persistence updates project truth and invalidates public menu/OBP cache tags. |
| DG-11 | Single-item generated multilingual descriptions survive Save; a later owner edit marks the item manual and clears stale translations. |
| DG-12 | Desktop/mobile direct actions require `canGenerateDescriptions`; server routes require `PERMISSIONS.GENERATE_DESCRIPTIONS`. |
| DG-13 | Linked outlets follow server-owned description policy and client inheritance filtering. |
| DG-14 | Refresh actions disclose the exact current description-refresh credit count before provider work. |
| DG-14A | A multi-request paid refresh sends its total request count on the first request so server capacity admission can refuse an underfunded scope before any provider work; individual requests continue to reserve and settle independently. |
| DG-14B | Description-capacity refusals use enhancement-pack/Billing guidance across desktop and mobile; they are never presented as translation-credit failures. |
| DG-15 | Provider prompts use stable server-created item aliases and restore original project IDs before accounting or client response. |
| DG-16 | Linked-outlet mobile saves compare and persist the full multilingual description map when description overrides are allowed. |
| DG-17 | Transaction history presents prepared/revised counts and credits without retaining generated copy in accounting-only mode. |

## Billing contract

- `ADD_DESCRIPTION`: 0 units per request; provider cost is platform absorbed.
- `NEW_ITEM_METADATA`: 0 units per request; used only for first-item metadata/description preparation.
- `REWRITE_DESCRIPTION`: `CONTENT_CREDIT_OPERATION_COSTS.DESCRIPTION_REWRITE` per API request.
- A bulk file uses one or more requests, each capped at 100 eligible items, approximately 180 KiB of serialized item payload, and 300 item-language output cells. Crossing any boundary creates another request and therefore another rewrite transaction/charge.
- For a multi-request paid refresh, the first request performs quantity-aware admission for the complete current scope. This is an early capacity guard, not a single reservation for the entire scope; every request keeps the existing reservation, settlement, and refund lifecycle.
- Positive-unit requests reserve capacity before provider work, settle after complete valid output, and refund an unsettled reservation on terminal failure.

The runtime values are defined at `src/constants/AI/unitCosts.ts:79` and `src/constants/AI/unitCosts.ts:110`.

## Failure and refusal behavior

| Condition | Result |
| --- | --- |
| Missing/invalid auth, permission, tenant/store/project scope, or malformed project/file/item ID | generic 4xx response; no provider call |
| SAFE_MODE or rate limit | bounded refusal; no provider call |
| Linked-outlet policy denies the action | 403; no provider call |
| Paid capacity unavailable for the complete multi-request refresh at first admission, or for a later request after concurrent balance use | 402; owner is directed to Billing; no provider call for the refused request |
| Provider call, parse, shape, or completeness failure | generic failure; no project save and no success toast |
| Accounting failure | generic failure; no successful response; reservation is recovered/refunded by the accounting boundary |
| Manual description refresh | item skipped in bulk; single-item control is replaced by a protected-state explanation |
| Unnamed item | omitted from bulk scope; single-item action asks for the source-language name |

## Mobile impact

Mobile parity is required. The feature remains inside `MobileShell`, uses large actions, blocks dismissal during active work, confirms paid refresh, reuses the shared orchestrator, and uses the same permission/outlet policy. See [mobile support](./description-generation_mobile-support.md).

## Non-goals

- No background job, queue, or new Firestore collection for ordinary description generation.
- No owner-facing settings beyond existing length/tone defaults.
- No generated text copied into accounting history.
- No shared override-schema change solely to persist AI/manual provenance on inherited outlet overrides.
- No automatic publishing of an unsaved single-item draft.
