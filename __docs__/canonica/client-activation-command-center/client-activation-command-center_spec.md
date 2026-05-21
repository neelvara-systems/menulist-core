# Client Activation Command Center Spec

## Product Goal

Give Canonica clients one operational home for launch readiness: license, widget key, allowed origins, knowledge, product surfaces, route context, release notes, and ticket signal loop.

The screen is organized around Canonica's three client modes:

- Launch Setup: workspace, product details, knowledge import, product surfaces, widget install, generated entity candidates, and generated canonical answer drafts.
- Support Control: help center, docs, knowledge base, changelog, tickets, conversations, and widget operations.
- Knowledge Governance: coverage, drift, entities, canonical answers, signal-to-knowledge queue, and trust metrics.

## User

Canonica client owner or admin. This is not a MenuList platform-owner surface.

## Functional Requirements

- Show current activation score from required launch steps.
- Show the next incomplete required action.
- Link directly to the relevant Canonica management surface.
- Show widget runtime status from sanitized last-seen telemetry.
- Show content counts from the product-surface context summary.
- Show license status from the store subscription summary.
- Show whether the help center has published content.
- Show whether product entities and active canonical answers exist, using trust summary counts.
- Avoid reading source KB, changelog, ticket, and signal collections.
- Keep Firebase/cache implementation details out of the client-facing UI.

## Non-Goals

- No billing checkout redesign.
- No replacement for governance dashboard metrics.
- No per-event analytics collection.
- No MenuList-specific hardcoding.

## Readiness Steps

- Workspace created
- License active
- Knowledge imported
- Help center ready
- Product entities reviewed
- Canonical answers reviewed
- Product surfaces mapped
- Widget key ready
- Allowed origins locked
- Widget seen in product
- Page context received
- Changelog published
- Support signal loop tested
