# VisualMeta - Core Doctrine

**Status:** Planning doctrine
**Version:** 1.0.0-draft
**Created:** May 31, 2026
**Authority:** Binding for VisualMeta planning until implementation begins

---

## Identity

**Product name:** VisualMeta
**Product code:** `VM`
**Category:** Content Readiness Workspace
**One-sentence definition:** VisualMeta prepares product, menu, catalog, and listing content into human-approved Final Content Kits.

VisualMeta is not a creative suite. It is not a marketing system. It is not a publisher.

VisualMeta exists to answer one question:

> "Is this content ready to approve and hand off?"

## Product Class

VisualMeta belongs beside MenuList and Canonica as a separate product.

| Product | Product code | Center of gravity |
| --- | --- | --- |
| MenuList | `ML` | Public business truth |
| Canonica | `CN` | Support knowledge truth |
| GrowthOS | `GR` | Immediate growth execution |
| VisualMeta | `VM` | Content readiness and handoff |

## Core Doctrine

1. **Final Kit Is The Product**
   VisualMeta's terminal artifact is a Final Content Kit. If a feature does not improve kit readiness, it is suspect.

2. **Humans Approve**
   Generated or edited content is draft until a human approves it. VisualMeta never silently marks output final.

3. **Source Facts Travel With Output**
   Every final asset keeps source snapshot, generation/edit history, and approval metadata.

4. **Preparation Stops Before Publishing**
   VisualMeta exports. Other systems publish.

5. **Content Units Are Atomic**
   A content unit represents one item, offer, product, place, article, or asset subject. Kits are assembled from content units.

6. **Accuracy Beats Creativity**
   Product/menu/catalog details must not be changed for visual appeal.

7. **Review Is A Feature**
   Notes, status, approval, and version history are product value, not overhead.

8. **No Live Truth Ownership**
   VisualMeta may import source snapshots from MenuList, Canonica, files, URLs, or external systems. It does not own or mutate live source truth.

## Architectural Pillars

### Pillar 1 - Source Snapshot Layer

Every project starts with source material:

- source images
- raw text
- menu/product/listing facts
- brand rules
- locale requirements
- reviewer notes

The source snapshot is immutable for a kit version. If source facts change, the content unit becomes stale and must be regenerated or reapproved.

### Pillar 2 - Content Unit Layer

Content units are the core objects. A unit can contain:

- source facts
- visual assets
- text assets
- language variants
- review status
- approval metadata
- export eligibility

Units are not MenuList items, Canonica articles, or GrowthOS actions. They are VisualMeta-owned preparation objects.

### Pillar 3 - Generation And Edit Layer

VisualMeta can use image generation, image editing, copy generation, translation, alt text generation, and format adaptation.

Generation is assistant behavior. It produces candidates, not truth.

### Pillar 4 - Review And Approval Layer

Every final kit requires explicit approval. Approval records:

- approver
- timestamp
- source snapshot hash
- approved assets
- approved text
- rejected variants
- notes

### Pillar 5 - Export Kit Layer

The Final Content Kit is a structured export package. It includes files, text, manifests, and provenance.

The kit is the handoff artifact. It should be usable by websites, marketplaces, MenuList, Canonica, GrowthOS, ad tools, or human operators.

## AI Posture

VisualMeta's AI posture is **Assistant**.

It can:

- suggest
- generate
- edit
- translate
- resize
- organize
- detect missing items
- warn about accuracy risk

It cannot:

- approve
- publish
- decide what is true
- override a reviewer
- alter source product facts
- claim performance outcomes

## Success Metric

Primary metric:

> Approved Kit Completion Rate

Supporting metrics:

- source-to-kit time
- percentage of assets approved without external rework
- stale kit rate
- export success rate
- generation cost per approved kit
- reviewer correction rate

Do not use revenue lift, click-through rate, follower growth, or ad performance as core VisualMeta success metrics.

## Relationship To Existing MenuList Image Pipeline

MenuList's image generation pipeline proves feasibility, but it is not VisualMeta.

VisualMeta may reuse patterns:

- provider wrappers
- image generation prompts after generalization
- batch processing model
- Storage upload patterns
- AI operation accounting
- safety guardrails

VisualMeta must separate:

- data model
- product Firebase project
- product routes
- product billing
- project/workspace UI
- export-kit schema
- review/approval state

## Doctrine Test

Before accepting any VisualMeta feature, ask:

1. Does it improve content readiness?
2. Does it preserve source provenance?
3. Does it keep human approval explicit?
4. Does it stop before publishing?
5. Does it produce or improve a Final Content Kit?

If no, reject or move it to another product.
