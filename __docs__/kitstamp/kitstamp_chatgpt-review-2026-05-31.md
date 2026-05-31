# KitStamp - ChatGPT Conversation Review

**Status:** Accepted decision record
**Created:** May 31, 2026
**Source:** `/Users/danny/.codex/attachments/f254ab83-af04-4c45-ab95-85d4dc669de8/pasted-text.txt`
**Reviewer decision:** ChatGPT suggestions were treated as proposals. This document records the KitStamp decisions after SMB-owner, architecture, cost, and separation review.

---

## 1. Executive Decision

The conversation is useful, but it is too expansive if copied directly into implementation.

Final direction:

> KitStamp should keep the Final Content Kit as the product. The new features are accepted only when they strengthen export readiness, source provenance, and human approval without turning KitStamp into a publisher, PIM, DAM, MenuList module, or integration marketplace.

The strongest near-term SMB-owner wedge is not broad adapters. It is:

1. clear item-level source snapshots
2. fast review and approval
3. simple repeatable exports
4. optional MenuList snapshot import for MenuList clients

## 2. Conversation Coverage

| Source lines | Topic | Review result |
| --- | --- | --- |
| 1-1369 | Export Templates | Accepted with limits. Built-in, versioned templates first. No marketplace, scripting, or custom builder in the first implementation. |
| 1377-2647 | MenuList Snapshot Import | Accepted as the strongest internal source adapter. Snapshot-copy only. No live sync, no write-back, no MenuList billing, no MenuList Storage writes. |
| 2648-3843 | Shopify/PIM/DAM/Feed Export Adapters | Partially accepted. File-based handoff adapters only. No API push, no credentials, no live mutation, no downstream acceptance guarantee. |
| 3910-4337 | Implementation readiness gate | Accepted. Product thinking is sufficient, but implementation must start with a lock document and foundation gate, not generation or integrations. |
| 4380-5356 | Remaining lock pieces | Accepted with modifications. Source snapshots and text variants become first-class v1 collections; advanced adapter collections stay out of v1. |

## 3. Full Flow Cross-Check

The pasted conversation explicitly lists 18 KitStamp layers. Lines 1-25 and 3959-3976 name the full layer map; lines 3910-4337 ask whether the product is ready for implementation. This table is the final cross-check for every listed flow.

| # | ChatGPT flow | Final decision | Implementation placement | Reason |
| --- | --- | --- | --- | --- |
| 1 | Content Unit | Accept | Foundation/core workspace | This is the atomic KitStamp object. Without it, review, export, and source provenance have no stable unit. |
| 2 | Source Snapshot | Accept | Foundation/core workspace | This is required for source truth, stale detection, approval safety, and manifest provenance. It is first-class in the lock. |
| 3 | Candidate Output / Generation & Edit Layer | Modify | Candidate records early; provider calls later | Candidate assets/text are needed early, but provider generation waits until billing/credits and Safe Mode are locked. |
| 4 | Review & Approval Layer | Accept | Core workspace before export | Human approval is mandatory. Generated/imported/edited output never becomes final without review. |
| 5 | Final Content Kit / Export Layer | Accept | First real product milestone | The kit is the product. Export preflight, manifest, immutable kit, and signed downloads are required before advanced features. |
| 6 | Project Readiness Board | Accept | Core workspace | Useful for SMB/operator clarity if it shows simple blockers and readiness, not a complex analytics dashboard. |
| 7 | Source Fact Lock + AI Fact-Diff | Modify | Source locks and stale-source checks early; provider-driven fact-diff later | Locked facts are core. AI comparison can help later, but source facts must not be model-authoritative. |
| 8 | Channel / Destination Readiness Profiles | Defer | After export kit basics | Valid concept, but first implementation should not make SMB owners choose complex destination rules before the base kit works. |
| 9 | Guest Reviewer Links / External Approval Flow | Defer | After internal review is stable | Valuable for agencies, but guest access adds auth, expiry, privacy, and scope complexity. |
| 10 | Annotation & Pinpoint Feedback | Defer | After review events are stable | Useful for image/content correction, but not required for first foundation. Basic request-changes notes come first. |
| 11 | Brand & Style Rules | Defer | After candidate/review flow | Useful for agencies/catalog work, but must not become a design-suite feature. Keep as controlled guidance later. |
| 12 | Translation & Localization Review | Defer but schema-ready | TextVariant supports locales now; deeper review later | Translations are important, but workflow complexity should follow base review and source snapshots. |
| 13 | Provenance Metadata + Content Credentials Direction | Modify | Provenance baseline now; Content Credentials later | Manifest/source hashes/approval metadata are required now. Formal Content Credentials can wait until export pipeline is stable. |
| 14 | Bulk Intake From CSV/XLSX | Defer | After core workspace/export | Useful source adapter, but it needs row limits, validation, and source snapshots first. |
| 15 | Folder Import & Auto-Matching | Defer | After source upload and content units | Useful for asset-heavy workflows, but auto-match must be bounded and explainable. |
| 16 | Export Templates | Accept with limits | After base export | Built-in, versioned templates only. No marketplace, no arbitrary scripting, no custom builder first. |
| 17 | MenuList Snapshot Import | Accept with strict separation | After source snapshots and core workspace | Strongest internal wedge. Snapshot-copy only, manual refresh only, no write-back, no live render dependency. |
| 18 | Shopify/PIM/DAM/Feed Export Adapters | Modify/defer | File-based generic handoff after export templates | Keep as handoff files only. No API push, credentials, sync, or downstream acceptance guarantee. |

Nothing in the 18-flow map is ignored. The decision is not to build all 18 at once; the decision is to preserve the architecture hooks while implementing the stable foundation first.

## 4. SMB Owner Lens

For a non-technical SMB owner, most of the raw ChatGPT feature list is too much.

Owner-safe value:

- "Use my existing menu or product source."
- "Show what needs review."
- "Let me approve or request changes from phone."
- "Give me a clean ZIP/CSV/JSON package."
- "Do not change my live menu or store."

Owner-risky value:

- configuring adapter mappings
- choosing from too many templates
- managing credentials
- understanding Shopify/PIM/DAM schema details
- approving generated content without seeing source facts
- thinking KitStamp will publish or sync automatically

Decision:

> KitStamp must hide complexity behind defaults. Advanced export/adapters are operator or agency controls, not daily SMB-owner controls.

## 5. Decision Matrix

| Proposal | Verdict | Decision | Reason |
| --- | --- | --- | --- |
| Export Templates | Accept | Build as built-in, versioned packaging presets. | Repeatable handoff is core to Final Content Kits. |
| Custom template builder | Reject for first implementation | Keep built-in TypeScript registry first. | Too much complexity, high support cost, low SMB clarity. |
| Template marketplace | Reject | Do not build. | This drifts toward Canva-style creative/template business. |
| Arbitrary template scripting | Reject | Use declarative mappings only. | Security, correctness, and support risk. |
| Template preflight | Accept | Required before export. | Prevents broken kits and owner confusion. |
| Filename collision handling | Accept | Detect and resolve/block server-side. | Handoff fails when files are ambiguous. |
| MenuList Snapshot Import | Accept | First source adapter after core workspace is stable. | Strongest internal wedge and clear MenuList-client value. |
| MenuList live sync | Reject | Manual refresh only. | Live sync would make KitStamp depend on MenuList runtime truth. |
| MenuList write-back | Reject | No write-back path in first implementation. | Violates separate product boundary and owner trust. |
| MenuList image reference only | Modify | Prefer copying/exporting source image into KitStamp Storage when needed. | Review/export should not depend on live MenuList reads. |
| Export Adapters | Accept with limits | File-based handoff packages only. | Useful without becoming downstream system owner. |
| Shopify CSV adapter | Modify | Keep as later file-only adapter behind flag after schema check. | Official CSV rules are real but store-specific behavior varies. |
| Google Merchant adapter | Defer | Do not include in first implementation. | Attribute rules vary by country/category and are high-risk for SMB support. |
| Akeneo/Salsify adapters | Defer | Architecture can support them, but no v1 build. | Enterprise schema mapping is not the first SMB wedge. |
| DAM/Cloudinary packages | Modify | Generic media package only first; no direct upload. | Useful handoff, low credential risk. |
| External API push | Reject for first implementation | No credentials or API write. | Credential, liability, retry, and support burden. |
| Mobile export configuration | Reject | Mobile can view/download kit status only. | Configuration is not phone-friendly. |
| Mobile review | Accept | Required. | SMB owners can approve from phone. |
| Generating missing facts | Reject | Missing source facts block or warn. | KitStamp must not invent SKU, price, GTIN, allergens, availability, or brand truth. |

## 6. External Adapter Source Check

Official docs confirm that downstream adapters are not stable enough to treat as simple universal exports:

| Source | Relevant finding | KitStamp decision |
| --- | --- | --- |
| Shopify CSV docs: https://help.shopify.com/en/manual/products/import-export/using-csv?locale=en-US | Shopify supports product CSV import/export and has required-column behavior that depends on import use. | Shopify support must be file-only and versioned, with no guarantee of acceptance. |
| Google Merchant product data spec: https://support.google.com/merchants/answer/15216925 | Product data requirements vary by attribute, product type, country, destination, and policy context. | Defer Merchant feed support; never invent source facts. |
| Akeneo import docs: https://help.akeneo.com/v7-import-your-data | Akeneo imports CSV/XLSX files and relies on import profiles. | Defer Akeneo-specific support until mapping UX is justified. |
| Salsify SupplierXM upload docs: https://docs.supplierxm.salsify.com/docs/upload-products | SupplierXM upload uses authenticated API flow and category-specific templates/mandatory attributes. | No Salsify API push; future file handoff only if buyer demand exists. |
| Bynder API/support docs: https://api.bynder.com/docs/getting-started and https://support.bynder.com/hc/en-us/articles/24265123462418-Guide-to-Uploading-Assets-in-Bynder | DAM workflows include metadata fields, asset upload choices, and API access. | Use generic DAM handoff packages first, not direct upload. |
| Cloudinary upload docs: https://cloudinary.com/documentation/upload_parameters | Upload supports tags, metadata, access controls, and many parameters. | Create Cloudinary-ready manifests only; no API upload in first implementation. |

## 7. Final Capability Map

Accepted as core or early foundation:

- Content Unit
- Source Snapshot
- Candidate Asset/Text Variant
- Review Event
- Final Content Kit
- Project Readiness Board
- Source hash and stale-source blocking
- Mobile review
- Built-in export package presets

Accepted after core is stable:

- MenuList Snapshot Import
- CSV/XLSX intake
- Folder intake and matching
- Export Templates
- Generic handoff adapters
- Shopify CSV package if buyer demand is real

Deferred until proven:

- Guest reviewer links
- Annotation and pinpoint feedback
- Brand/style rules
- Translation review workflows
- Destination readiness profiles
- Advanced PIM/DAM mappings
- Cloudinary-ready package

Rejected for first implementation:

- live sync
- write-back
- direct publishing
- external API push
- credential storage for downstream systems
- connector marketplace
- arbitrary template scripting
- template marketplace
- mobile adapter configuration
- auto-approval
- generated missing product/menu facts

## 8. Implementation Decision

Do not start implementation with generation, MenuList import, guest review, or adapters.

Start with:

1. flags
2. product constants
3. disabled route skeleton
4. KitStamp Firebase config/rules skeleton
5. types
6. DAL skeleton
7. rules tests
8. workspace/project/source snapshot/content unit CRUD

The first real product milestone is:

> A separated KitStamp workspace where a user can create a project, create content units from source snapshots, review candidate assets/text, approve them, and export an immutable Final Content Kit.

## 9. Readiness Answer From The Conversation

The conversation itself asks whether everything is complete before implementation. The answer is:

- product strategy is complete enough
- architecture direction is complete enough
- every important flow is accounted for
- implementation should begin only with foundation
- advanced flows are intentionally sequenced, not skipped

Ready for implementation foundation:

- flags
- `KS` product constants
- disabled route skeleton
- Firebase config/rules/storage skeleton
- KitStamp Firebase helpers
- types and DAL
- source snapshots
- content units
- asset/text candidates
- review events
- export manifest and immutable kit

Not ready for first implementation:

- provider generation
- MenuList import
- guest reviewer links
- export adapters
- downstream API push
- public launch

## 10. Required Doc Updates

This review requires updates to:

- `kitstamp_spec.md`
- `kitstamp_impl.md`
- `kitstamp_firebase.md`
- `kitstamp_mobile-support.md`
- `kitstamp_marketing.md`
- `kitstamp_website.md`
- `kitstamp_helpdoc.md`
- `kitstamp_test-cases.md`
- `README.md`

Doctrine docs are intentionally not updated in this pass because the current request asked to skip old doctrine and decide from scratch.
