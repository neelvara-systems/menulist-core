# Client Activation Command Center Mobile Support

The activation screen uses the Answerlattice dashboard shell and Ant Design responsive grid.

## Mobile Behavior

- Header remains sticky through `AnswerlatticeHeader`.
- Primary action stacks below the title.
- The four owner-goal groups render as a single-column accordion with one group open at a time.
- The first incomplete group opens by default; completed groups stay collapsed but remain reviewable.
- Group labels wrap without hiding the numbered step or status, and every group action remains at least 44px high and full width where needed.
- The primary launch path shows one factual complete/total count. The separate setup-readiness percentage is available only after opening technical details.
- First-client launch proof card stacks status, progress, and proof actions vertically.
- KPI cards collapse into one-column/two-column rows.
- Readiness alert copy can wrap across mobile width and uses launch proof, not the setup percentage, for success state.
- Content Control workbench stacks each owner action vertically with full-width action buttons.
- Test-as-Customer checklist stacks each customer-path check with full-width 44px action buttons and labels prerequisites as ready to test rather than resolved.
- Surface Readiness cards stack with count tags and route tags kept inside each card.
- Ticket detail Knowledge Loop card appears above the conversation in the mobile drawer for operator view only.
- Launch/checklist actions that collapse to icons retain accessible labels and a 44px square target; labelled customer-path and surface actions remain at least 44px high.
- Bottom padding keeps content clear of mobile browser controls.
- Technical evidence and setup details remain collapsed by default so widget, scheduler, context, notification, license, and evidence panels do not overwhelm first use.
- First-value evidence uses a wrapping one-column/two-column grid inside technical details; labels and first-observed timestamps must not overflow narrow screens.
- The navigation drawer shows the same grouped owner toolset as desktop. All tools expands the complete authorized advanced list without closing the drawer; selecting a real destination closes it through the existing callback.
- Install Support and Copy coding-agent install remain explicit text actions with at least 44px target height; the owner is not expected to reconstruct the widget setup manually on mobile.

## Required Checks

- `/answerlattice/activation` at mobile width
- Four-group accordion labels, expansion, current action, and first-incomplete default state
- Technical evidence disclosure remains collapsed on initial render
- Step action buttons
- Refresh button
- First-client launch proof card and proof item actions
- First-value evidence labels, timestamps, and Not observed yet states
- Content Control workbench actions
- Test-as-Customer checklist actions
- Surface Readiness matrix actions
- Ticket detail Knowledge Loop card in `/answerlattice/tickets`
- Widget runtime card
- Navigation drawer link for Activation
- Navigation drawer grouped sections, global All tools / Show fewer tools behavior, and direct access to an active advanced route
- Install Support coding-agent handoff at mobile width
