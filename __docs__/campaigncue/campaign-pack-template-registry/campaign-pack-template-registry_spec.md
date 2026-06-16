# Campaign Pack Template Registry - Spec

## Executive Summary

CampaignCue needs reusable campaign pack starting points, but it should not become a template marketplace. The registry will keep a small, high-quality set of platform campaign pack templates for each canonical business category, plus owner-saved workspace templates that are created only by explicit action.

The registry should help an SMB owner start from a useful campaign structure:

- "Promote a lunch offer"
- "Fill weekend appointment slots"
- "Share a Diwali offer"
- "Reuse an old poster"
- "Prepare a Google visibility update"

It must then rehydrate current business facts, run missing-input/trust checks, and keep manual delivery instructions inside the campaign pack.

## Product Role

The registry supports the CampaignCue loop:

```text
Business Brain -> Campaign Decision Engine -> Daily Campaign Desk -> Campaign Pack Template -> Campaign Pack Output -> Trust Check -> Export -> Result Memory
```

The template is not the product center. The Daily Campaign Desk remains the owner starting point. Templates are used only when they reduce owner work for a relevant cue or reusable pack.

## Business Category Decision

CampaignCue platform templates must be grouped by the shared business category model from `src/data/shared/businessTypes.ts`.

Active categories:

| Category value | Owner-facing meaning | Template focus |
| --- | --- | --- |
| `food` | Food and beverage | Menus, specials, delivery, table/counter, lunch, weekend, festival offers. |
| `service` | Service businesses | Appointments, packages, bookings, reminders, before/after, local availability. |
| `retail` | Retail businesses | New arrival, sale, seasonal display, product highlight, store visit. |
| `professional` | Professional services | Consultation, event, advisory, booking, trust-building, lead handoff. |
| `creative` | Creative businesses | Portfolio, event, booking, showcase, workshop, custom order. |
| `health` | Health and wellness | Appointment, package, class, checkup, local availability, consent-aware visuals. |
| `specialty` | Fallback and mixed businesses | General local-business update, offer, event, review, asset reuse. |

Category resolution must follow existing shared helpers. Stored `businessCategory` wins; `businessType` derivation is fallback; unknown businesses fall back to `specialty`.

## Template Types

| Type | Purpose |
| --- | --- |
| Campaign pack template | Produces a full CampaignCue output pack shape: decision, copy, handoff fields, trust checks, result prompt, and optional editor document references. |
| Editor layout template | Opens a neutral `CreativeEditorDocument` for one visual output inside a pack. |
| Handoff template | Provides channel-specific copy and manual-use checklist for WhatsApp, Google, Instagram, print, staff, email/SMS, or ads handoff. |
| Reuse asset template | Starts from a CueLayers-safe old poster or reusable owner asset. |

## Platform Template Rules

1. Each platform catalog doc is keyed by business category.
2. Each category doc contains only summary metadata and search tags.
3. Full payloads live in Storage.
4. Shared festival/event templates may appear in multiple category docs as duplicated metadata summaries.
5. Duplicated metadata is intentional because it prevents an extra generic/shared catalog read.
6. Template count must stay curated and small.
7. Search/filtering happens in memory after one category doc read.
8. Overflow docs are allowed only as explicit second-read surfaces.

## Owner-Saved Template Rules

Owner-saved templates are workspace-scoped. They are created only when an owner chooses to save a campaign pack or edited design for reuse.

Owner-saved templates must not persist stale facts as truth. They may store:

- fact slot requirements,
- protected fact references,
- editor document references,
- channel handoff shape,
- trust checks,
- result memory references,
- owner-friendly labels.

When reopened, the template must rehydrate from current Business Brain/source facts and show missing inputs before export. If the template includes an editor document reference, it must open in the shared editor with Campaign Pack context visible: task-based editing, protected facts, output formats, Trust Center status, manual delivery, result memory, and mobile review/download scope.

## Search and Tags

The platform category doc includes enough metadata for local search:

- category,
- business types,
- campaign recipes,
- event tags such as `diwali`, `christmas`, `new_year`, `birthday`, `anniversary`,
- owner goals,
- channels,
- required facts,
- style tags,
- output types,
- search tokens,
- priority.

No server-side full-text search is required for the curated catalog.

## Owner Flows

### Use recommended template

1. Owner opens Daily Campaign Desk.
2. CampaignCue resolves business category from existing business truth.
3. CampaignCue reads one matching platform template catalog.
4. Daily Desk suggests a relevant template only when it supports the current cue.
5. Owner sees what the template will prepare and what facts are missing.
6. Owner confirms missing details.
7. Creative Studio creates or opens the pack.
8. Trust Center checks facts.
9. Owner exports/copies manually and records result.

### Search event templates

1. Owner opens templates from a campaign pack or Creative Studio.
2. Search filters the already-loaded category doc.
3. Owner selects an event tag such as Diwali or New Year.
4. CampaignCue shows only category-relevant campaign pack templates.
5. Current facts are applied before the pack can be used.

### Save a pack for reuse

1. Owner creates or edits a campaign pack.
2. Owner chooses "Save as reusable pack."
3. CampaignCue saves metadata to the workspace template index and the full payload to Storage.
4. If the owner is editing a non-CueLayers Campaign Pack layout, CampaignCue saves the current neutral editor document as the optional template layout artifact.
5. Reopening the saved pack refreshes current facts and checks stale price/date/contact values.

## Required Behavior

| Requirement | Decision |
| --- | --- |
| Category source | Use `BUSINESS_CATEGORIES` and resolver helpers from `src/data/shared/businessTypes.ts`. |
| Default read | Read exactly one platform category doc for the normal template surface. |
| Shared templates | Duplicate small summary metadata into relevant category docs to avoid a shared-doc read. |
| Full payload | Store in Firebase Storage. |
| Editor truth | Store neutral `CreativeEditorDocument`, not Fabric JSON. |
| Business facts | Rehydrate current facts before use or export. |
| Protected text | Price, date, phone, location, business name, offer, and CTA stay protected. |
| Direct posting | Not supported. Export/download/copy remains the active delivery boundary. |
| Template count | Curated. Quality matters more than breadth. |

## Out of Scope

- Generic template marketplace.
- Public community templates.
- Direct posting or scheduling.
- Paid provider generation during template browsing.
- Template rankings based only on visual style.
- Persisting signed URLs, base64 previews, or generated binaries in Firestore.
- Reading all category docs for search.

## Risks

| Risk | Mitigation |
| --- | --- |
| Category docs grow too large | Enforce soft byte/count limits in seed/admin tooling and use explicit overflow docs only on owner action. |
| Shared festival templates duplicate metadata | Accept small metadata duplication to preserve one-read category loading. Storage payloads can still be shared. |
| Stale facts in saved templates | Save fact slots and refs; rehydrate current facts before use; block export when required facts are missing. |
| Product drifts into template marketplace | Keep Daily Desk and campaign pack outcome as primary entry; templates are supporting surfaces only. |
| Search gets too broad | Use curated tags and in-memory filters; no full catalog scan. |

## Open Questions Before Implementation

| Question | Current Decision |
| --- | --- |
| Should platform seed data live in repo? | Yes, as reviewed seed fixtures plus an admin upload script, so platform catalogs remain reproducible. |
| Should owners see templates on mobile? | Yes for choosing/reusing packs; precise editor layout work remains desktop-preferred. |
| Should `generic` be a platform doc? | No separate generic category exists in current shared data. The fallback category is `specialty`. Shared templates are copied into category docs. |
| Should overflow docs auto-load? | No. They require explicit owner action such as "More templates". |
