# KitStamp - Decision Brief

**Status:** Active planning decision
**Decision date:** May 31, 2026
**Recommended path:** Build as a separate product with Answerlattice-grade separation.

---

## Recommendation

Proceed with KitStamp as a separate product, but do not build it as a generic design tool.

The name is locked permanently for active product planning:

- Brand: KitStamp
- Slug: `kitstamp`
- Product code: `KS`
- Primary domain: `kitstamp.com`
- Preferred India legal-name candidate: `KitStamp Technologies Private Limited`

See [Naming Lock](./kitstamp_naming-lock.md) for domain, MCA, trademark, and rejected-name decisions.

The product should be:

> a review-ready content preparation workspace for product, menu, catalog, and listing assets.

The product should not be:

> a Canva competitor, Adobe competitor, social scheduler, live CMS, PIM, or marketing automation tool.

## Why It Is Different From GrowthOS

| Dimension | GrowthOS | KitStamp |
| --- | --- | --- |
| Time horizon | Immediate | Deliberate |
| Owner question | "What can I post or send now?" | "Is this content ready to approve and hand off?" |
| Output | Short action kit | Final Content Kit |
| Review | Minimal | Required |
| Publishing | Manual copy/download | Export only |
| User | SMB owner/operator | Content operator, agency, brand team, catalog owner |

GrowthOS can be an add-on for MenuList. KitStamp should be its own product because it has a different buyer, workflow, data model, billing model, and UI identity.

## Why The Market Still Has A Gap

The market is not empty. It is crowded.

Canva, Adobe, Photoroom, and similar tools already cover broad creation, editing, brand application, and product-photo automation.

The gap is narrower:

- generated content still needs human validation when product accuracy matters
- teams still need source snapshots and approval history
- one item often needs image, description, caption, translation, alt text, and export manifest together
- agencies and operators still hand off files through Drive, WhatsApp, docs, and ad hoc folders
- broad creative suites are powerful but can be too wide for repeated catalog/menu/listing readiness work

KitStamp should own this narrower job:

> turn source material into a controlled, approved content kit.

## Target Buyer

Best-fit buyers:

- content operators at agencies
- restaurant/cafe groups preparing item assets
- e-commerce catalog teams
- marketplaces or listing operators
- franchise/multi-location teams
- small brands that need repeatable asset prep but not enterprise creative ops

Avoid:

- solo hobby creators
- professional designers wanting full canvas control
- large enterprise creative supply-chain teams already using Adobe/Bynder/Aprimo-style stacks
- users who primarily want auto-posting, ads, or analytics

## Wedge

The first wedge should be:

> Final Content Kits for product/menu/catalog items.

Each content unit starts from one item and can produce:

- cleaned/enhanced product image or generated scene
- short description
- marketplace/menu/social caption variants
- translated variants
- alt text
- review notes
- final approved export

This maps well to the existing MenuList image generation pipeline, but must be separated into KitStamp-owned data and billing.

## Architecture Decision

Use Answerlattice as the separation model:

- product code `KS`
- separate Firebase project
- separate Cloud Functions package
- separate product route group
- separate public website
- product-aware billing scope
- optional login bridge through `productAccounts.KS`
- copied source snapshots, not shared MenuList writes

## Build Decision

Docs can be prepared now. Code should start only after:

- product domain is confirmed
- KitStamp Firebase QA/production targets are created
- billing packages are approved
- initial ICP is selected
- export kit schema is frozen
- public claims are reviewed

## Kill Criteria

Pause or redesign if:

- it becomes a design canvas
- it requires direct publishing to feel valuable
- it depends on MenuList internals instead of copied snapshots
- it cannot price above image/provider cost
- users mainly ask for Canva-like editing
- generated output frequently needs heavy manual correction
- source/provenance/approval does not matter to buyers

## Final Decision

Build KitStamp only as:

> separate product, content readiness layer, Final Content Kit output, human approval required.
