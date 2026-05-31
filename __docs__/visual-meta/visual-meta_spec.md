# VisualMeta - Product Specification

**Status:** Stage 1 planning specification
**Created:** May 31, 2026
**Product code:** `VM`
**Runtime status:** Not implemented. No routes, Firebase targets, functions, or billing plans are active.

---

## 1. Product Decision

VisualMeta is planned as a separate product, not a MenuList feature and not a GrowthOS module.

The product is:

> A content readiness workspace that turns source images, text, translations, and review notes into human-approved Final Content Kits.

The product is not:

> A design canvas, social scheduler, live CMS, PIM, DAM, menu manager, ad platform, or analytics system.

## 2. Market Read

The market is already strong in broad creation and image automation:

| Market signal | Product implication |
| --- | --- |
| Canva is moving into conversational, layered, editable, on-brand, multi-channel creative work. | Do not compete as a general creative suite. |
| Canva Visual Suite joins many work formats into one broad workspace. | VisualMeta must stay narrower than all-format design. |
| Adobe Firefly Services focuses on enterprise content production, APIs, custom models, and batch creative workflows. | Do not chase enterprise creative supply-chain automation. |
| Photoroom focuses on product-photo APIs, background workflows, and e-commerce image automation. | Do not become only an image API. |
| Product/menu/catalog content still needs human validation when accuracy matters. | VisualMeta should make review and source provenance central, not optional. |

The gap is operational readiness:

> Teams can create assets in many places, but still struggle to package accurate, approved, reusable content around one product, menu item, listing, or offer.

## 3. Target Users

Primary users:

- agency content operators preparing repeated client assets
- restaurant, cafe, and retail groups preparing item-level content
- small e-commerce catalog teams
- marketplace/listing operators
- franchise or multi-location teams
- founder-led brands that need controlled content handoff without enterprise tooling

Secondary users:

- MenuList customers who need approved menu-item media/copy kits
- GrowthOS users who want deliberate content preparation before quick actions
- external consultants who prepare assets for clients

Not target users:

- professional designers seeking a full canvas
- solo hobby creators
- enterprise teams already committed to Adobe-class creative operations
- users whose main need is publishing, scheduling, ads, or analytics

## 4. Core Problem

Source material is scattered:

- original photos
- generated or edited images
- raw descriptions
- corrected descriptions
- translations
- alt text
- client notes
- approval comments
- final files

Without a dedicated readiness workspace, operators lose accuracy and approval context during handoff.

VisualMeta solves this by binding source facts, generated candidates, review decisions, and exports into a single auditable kit.

## 5. Core Objects

| Object | Definition |
| --- | --- |
| Workspace | Product tenant/scope for one team or client group. |
| Project | A bounded content preparation job, such as "Summer menu items" or "Marketplace launch set." |
| Source Snapshot | Immutable source facts and files used for one version of a project or content unit. |
| Content Unit | Atomic subject, such as one menu item, product, offer, venue, article, or listing. |
| Asset | Source, generated, edited, or approved media file metadata. |
| Text Variant | Description, caption, alt text, translation, usage note, or channel-specific text. |
| Review Event | Note, approval, rejection, stale marker, or correction. |
| Final Content Kit | Export package containing approved files, text, manifest, and provenance. |

## 6. Required Workflow

1. **Create project**
   User creates a VisualMeta project with client/team, goal, source type, due date, locale, and output needs.

2. **Import source**
   User uploads files or imports copied snapshots from approved sources. MenuList can be a source, but VisualMeta does not read live MenuList truth at render time.

3. **Create content units**
   Each item/product/listing becomes a VisualMeta content unit with its own facts, files, and readiness state.

4. **Generate or edit candidates**
   VisualMeta prepares image, copy, translation, alt text, and format candidates after validation and cost checks.

5. **Review**
   Human reviewer accepts, rejects, comments, or requests correction. Generated output remains draft until approved.

6. **Assemble kit**
   Approved content units become a Final Content Kit with files, text blocks, manifest, source summary, and approval metadata.

7. **Export**
   User downloads or sends the kit to another tool. VisualMeta stops before publishing.

## 7. V1 Scope

Required scope for first implementation:

- VisualMeta product flag and disabled product-domain gate
- VisualMeta public website candidate behind flag
- VisualMeta workspace and project shell
- source upload and copied-source import contract
- content unit creation and status tracking
- image generation/editing candidates using VisualMeta billing scope
- description, caption, translation, and alt text candidate generation
- human review events
- approved Final Content Kit export
- immutable export manifest
- VisualMeta Firebase rules, indexes, Storage rules, and cost docs
- product-aware billing for `VM`
- product-scoped AI operation ledger
- desktop workspace
- mobile review and approval surface

## 8. Explicitly Out Of Scope

VisualMeta does not include:

- direct publishing
- social scheduling
- ad creation or ad management
- ROI reporting
- campaign optimization
- live website hosting
- live MenuList write-back
- CMS/PIM/DAM ownership
- template marketplace
- full canvas editor
- auto-approval
- unreviewed public output

## 9. Final Content Kit Contract

A Final Content Kit must include:

- `manifest.json`
- approved image files
- approved text variants
- approved translations where requested
- alt text where requested
- usage notes
- source snapshot summary
- approval metadata
- export timestamp
- version number

The manifest must be immutable after export. A correction creates a new kit version.

## 10. Product Metrics

Primary metric:

- Approved Kit Completion Rate

Supporting metrics:

- source-to-kit time
- approval correction rate
- stale kit rate
- export success rate
- generation cost per approved kit
- percent of content units approved without external rework
- review cycle count per kit

Do not use follower growth, clicks, ad performance, or revenue lift as VisualMeta product metrics.

## 11. Pricing And Packaging Assumptions

VisualMeta should be priced around prepared kits and generation usage, not MenuList AI enhancement packs.

Candidate packaging:

| Package | Fit |
| --- | --- |
| Workspace subscription | Base access, team seats, projects, review history, export kits. |
| Kit quota | Number of Final Content Kits or content units per month. |
| Credit packs | Generation/edit/translation usage with hard cost checks. |
| Agency tier | Multiple client workspaces, branded export, higher batch limits. |

Exact pricing is not frozen in this doc. Implementation must prove margin above provider, Storage, function, and support cost.

## 12. Acceptance Criteria

VisualMeta is ready to enter implementation only when:

- product domain is confirmed
- Firebase QA and production targets are confirmed
- billing scope for `VM` is defined
- feature flags are named and default off
- source import rules are approved
- export manifest schema is frozen
- direct publishing remains absent
- MenuList write-back remains absent
- public website copy is approved
- Firebase cost model is reviewed
- mobile review scope is approved

## 13. Failure Criteria

Pause or redesign if:

- users expect Canva-like canvas editing
- the product only feels useful with auto-posting
- generation cost cannot be priced safely
- approval/provenance is not valued by buyers
- source facts are frequently changed by generated output
- MenuList becomes the hidden required runtime
- exports cannot be made clear enough for handoff

## 14. Documentation Cost

This specification creates no runtime cost. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, or deploys.
