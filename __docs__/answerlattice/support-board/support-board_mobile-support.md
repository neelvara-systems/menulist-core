# Support Board Mobile Support

> **Last verified:** July 19, 2026

## Assessment

Support Board is owner/staff operational UI. It must remain usable from a mobile device because small SaaS founders often triage support from phones.

## Current Mobile Behavior

- Answerlattice mobile shell opens sidebar in a drawer.
- Support Board uses responsive Ant Design grid breakpoints.
- Board columns stack to one column on mobile.
- Buttons keep 44px minimum height through Answerlattice dashboard mobile shell rules.
- Modals use the existing dashboard safe-area rules.
- Source-detail removal uses an explicit confirmation and remains available without drag interaction.

## Mobile Constraints

- No drag-and-drop dependency in the first version.
- Status movement uses buttons/select controls.
- Long card text is clamped in cards and full text is available in modal.
- Board avoids dense tables.

## Follow-Up

The current mobile view still loads the newest 120 cards without pagination. If board volume grows, add cursor pagination and mobile filters for status, priority, assignee, and source type before adding drag interactions. Authenticated physical-device evidence remains separate from local responsive source review.
