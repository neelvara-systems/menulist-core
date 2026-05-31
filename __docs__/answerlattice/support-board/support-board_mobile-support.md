# Support Board Mobile Support

## Assessment

Support Board is owner/staff operational UI. It must remain usable from a mobile device because small SaaS founders often triage support from phones.

## Current Mobile Behavior

- Answerlattice mobile shell opens sidebar in a drawer.
- Support Board uses responsive Ant Design grid breakpoints.
- Board columns stack to one column on mobile.
- Buttons keep 44px minimum height through Answerlattice dashboard mobile shell rules.
- Modals use the existing dashboard safe-area rules.

## Mobile Constraints

- No drag-and-drop dependency in the first version.
- Status movement uses buttons/select controls.
- Long card text is clamped in cards and full text is available in modal.
- Board avoids dense tables.

## Follow-Up

If board volume grows, add mobile filters for status, priority, assignee, and source type before adding drag interactions.
