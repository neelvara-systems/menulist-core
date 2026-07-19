# Client Activation Command Center Mobile Support

The activation screen uses the Answerlattice dashboard shell and Ant Design responsive grid.

## Mobile Behavior

- Header remains sticky through `AnswerlatticeHeader`.
- Primary action stacks below the title.
- First-client launch proof card stacks status, progress, and proof actions vertically.
- KPI cards collapse into one-column/two-column rows.
- Readiness alert copy can wrap across mobile width and uses launch proof, not the setup percentage, for success state.
- Content Control workbench stacks each owner action vertically with full-width action buttons.
- Test-as-Customer checklist stacks each customer-path check with full-width 44px action buttons and labels prerequisites as ready to test rather than resolved.
- Surface Readiness cards stack with count tags and route tags kept inside each card.
- Ticket detail Knowledge Loop card appears above the conversation in the mobile drawer for operator view only.
- Launch/checklist actions that collapse to icons retain accessible labels and a 44px square target; labelled customer-path and surface actions remain at least 44px high.
- Bottom padding keeps content clear of mobile browser controls.

## Required Checks

- `/answerlattice/activation` at mobile width
- Step action buttons
- Refresh button
- First-client launch proof card and proof item actions
- Content Control workbench actions
- Test-as-Customer checklist actions
- Surface Readiness matrix actions
- Ticket detail Knowledge Loop card in `/answerlattice/tickets`
- Widget runtime card
- Navigation drawer link for Activation
