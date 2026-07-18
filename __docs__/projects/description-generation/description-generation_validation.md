# Description Generation - Docs and Code Validation

**Cross-check date:** July 15, 2026
**Authority:** current codebase, then active docs

## Parity result

| Contract | Code | Docs | Result |
| --- | --- | --- | --- |
| Desktop/mobile bulk add and refresh | shared orchestrator plus both UIs | spec/impl/mobile/help | aligned |
| Repair Menu and Command Center | shared ADD flow with parent persistence | spec/impl/mobile | aligned |
| Single-item first generation | `NEW_ITEM_METADATA`, free | spec/impl/help | aligned |
| Single-item existing refresh | `REWRITE_DESCRIPTION`, paid | spec/impl/help | aligned |
| Free metadata boundary | non-empty source copy rejected by server schema | spec/impl/firebase/audit | aligned |
| Metadata prompt/identity boundary | sanitized prompt text plus request-local item/attribute aliases | spec/impl/firebase/tests | aligned |
| Single-item request context | shared rewrite bounds plus localized category name and generate-only first-description prompt | spec/impl/mobile/tests | aligned |
| Manual protection and provenance | payload filters, draft provenance, stale-translation options | spec/impl/mobile | aligned |
| Permission and outlet policy | client guards plus server checks | spec/impl/mobile | aligned |
| Partial output refusal | complete item/language server check | spec/impl/audit | aligned |
| Imported/project item IDs | request-local provider aliases restored server-side | spec/impl/firebase/audit | aligned |
| Prototype-named item IDs | null-prototype batch map plus own-key merge | impl/firebase/tests | aligned |
| Large/multilingual files | sequential chunks capped by 100 items, approximately 180 KiB serialized item payload, and 300 item-language cells | spec/impl/firebase | aligned |
| Multi-request paid-capacity admission | total request count travels only on the first request; server admits the scope but reserves/settles each request independently | spec/impl/firebase/tests | aligned |
| Mobile capacity presentation | bulk, single-item, and Repair Menu description failures use enhancement-pack/Billing guidance rather than translation-credit wording | mobile/help/tests | aligned |
| Linked-outlet multilingual override | complete description-map comparison on mobile Save | spec/impl/mobile/audit | aligned |
| Persistence and cache | existing project DAL invalidation | impl/firebase | aligned |
| Transaction counts/credits/privacy | compact accounting row and owner summaries | spec/impl/help | aligned |
| Tone/length | Professional/Friendly/Premium; Standard/Detailed | spec/impl/help | aligned |

## Stale claims removed

- desktop-only behavior;
- a Professional-only tone;
- universal auto-save for single-item drafts;
- source-route project reads that do not occur;
- free metadata regeneration of existing descriptions;
- every-language readiness as first-description eligibility;
- partial provider output as an acceptable success;
- fixed speed, item coverage, or publish-readiness claims.

Historical audits and replaced active documents are preserved under `_archive/`.

## Remaining non-source evidence

Provider smoke, authenticated browser/device QA, target deploy evidence, and production-host smoke remain outside this local docs/code parity result.
