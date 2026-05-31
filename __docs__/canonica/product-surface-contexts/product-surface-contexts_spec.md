# Product Surface Contexts Spec

## Problem

Software owners need product help to be relevant to the page their users are viewing. Billing articles, billing release notes, and billing tickets should be connected without requiring the owner to remember loose tags or duplicate setup across every content type.

## Decision

Canonica uses a first-class Product Surface map. A surface represents a semantic product location such as `Billing / Invoices`, not just a URL.

Each surface stores:

- route patterns used by the customer app
- semantic context: feature, page, workflow
- entity hints and entity IDs
- tags
- visibility targets

Articles, changelogs, and tickets can reference the same surface key. Runtime support can then resolve the current page to related content.

## Invariants

- Route patterns are input mapping only. Knowledge attaches to semantic context.
- Tags remain secondary labels, not the source of truth.
- Context payloads are transient and sanitized.
- Tickets are signal sources. Public widget output must not expose ticket details.
- Feedback can be assigned to a surface by owners after submission; the end-user feedback form does not require surface selection.
- Runtime lookup must use a compact summary/read model, not broad collection scans.
- Documents are Canonica-owned and use `pId: "CN"`, `tId`, and `sId`.

## Owner Flow

1. Owner opens Canonica Product Surfaces.
2. Owner creates a surface such as `Billing / Invoices`.
3. Owner adds route patterns such as `/billing`, `/billing/*`.
4. Owner sets feature/page/workflow and optional entities/tags.
5. Owner links articles, changelogs, tickets, and reviewed feedback to the surface from their edit/review screens.
6. Owner rebuilds or refreshes the context summary.
7. Widget and Help Center use the summary to show relevant help.

## End-User Flow

1. Customer app passes sanitized context while mounting Canonica.
2. Canonica resolves the matching product surface.
3. Search and widget responses include related articles and release notes.
4. If the answer fails, escalation tickets and negative-feedback signals keep compact surface context for later knowledge improvement.

## Non-Goals

- Not a full documentation CMS.
- Not a helpdesk replacement.
- Not a route analytics system.
- Not an automatic rewrite engine.
- Not a public ticket browser.
