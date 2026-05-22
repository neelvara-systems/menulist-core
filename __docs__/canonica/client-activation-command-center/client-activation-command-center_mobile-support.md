# Client Activation Command Center Mobile Support

The activation screen uses the Canonica dashboard shell and Ant Design responsive grid.

## Mobile Behavior

- Header remains sticky through `CanonicaHeader`.
- Primary action stacks below the title.
- KPI cards collapse into one-column/two-column rows.
- Content Control workbench stacks each owner action vertically with full-width action buttons.
- Test-as-Customer checklist stacks each customer-path check with full-width action buttons.
- Surface Readiness cards stack with count tags and route tags kept inside each card.
- Ticket detail Knowledge Loop card appears above the conversation in the mobile drawer for operator view only.
- Checklist actions use icon-only buttons on mobile with accessible labels.
- Bottom padding keeps content clear of mobile browser controls.

## Required Checks

- `/canonica/activation` at mobile width
- Step action buttons
- Refresh button
- Content Control workbench actions
- Test-as-Customer checklist actions
- Surface Readiness matrix actions
- Ticket detail Knowledge Loop card in `/canonica/tickets`
- Widget runtime card
- Navigation drawer link for Activation
