# Owner Action Layer Implementation

## Architecture

The implementation is a shared pure helper plus two UI mounts.

```text
storeDetails + selected project
  -> buildOwnerActionLayer()
  -> desktop OwnerDashboard card
  -> mobile MobileDashboardScreen card
  -> existing route or MobileShell destination
```

## Files

| File | Change |
| --- | --- |
| `src/lib/ownerActions/buildOwnerActionLayer.ts` | New pure helper. Builds primary action, supporting actions, and placement proof from current store/project data. |
| `src/config/features.ts` | Adds `ENABLE_OWNER_ACTION_LAYER`. |
| `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx` | Renders one desktop "Next owner action" card for open required work and routes to the existing destination. |
| `src/lib/projects/projectPublicationEvents.ts` | Emits a bounded same-origin publication event after acknowledged publish and revalidates only matching open dashboard tabs. |
| `src/components/mobile/screens/MobileDashboardScreen.tsx` | Renders the same single mobile action and routes through `MobileShell` callbacks. |
| `scripts/verification/verify-owner-action-layer.js` | Source gate for helper, flag, desktop, mobile, docs, and boundary copy. |
| `scripts/verification/test-owner-action-layer-boundary.ts` | Behavior regression for current publication, links, hours, and placement timestamps. |

## Data Inputs

| Input | Source |
| --- | --- |
| Selected project | Existing dashboard/mobile selected-menu data |
| `lastPublishedAt` | Existing project data |
| `active` | Existing project summary/data |
| `workingHours` | Existing store data |
| `subdomain` / `customDomain` | Existing store data |
| `feedbackEnabled` | Existing store data |
| `menuPresence` | Existing store data |

## Action Destinations

| Action | Desktop | Mobile |
| --- | --- | --- |
| Set customer link | `/business-settings?section=search-discovery&focus=customer-link` | More -> Domain settings |
| Set hours | `/business-settings?section=hours&focus=working-hours` | More -> Hours edit |
| Publish menu | `/projects` | Menu tab |
| Place customer link | `/use-menulist` | More -> Presence Monitor |
| Open private feedback | `/feedback` | More -> Feedback |
| Tell MenuList what changed | `/menu-manager` | More -> Menu Manager |
| Set today status | `/business-settings?section=hours&focus=temp-status` | More -> Today status |
| Prepare staff handoff | `/use-menulist` | Share tab |
| Update prices | `/menu-manager` | More -> Menu Manager |

Desktop Business Settings deep links derive stable `section` and `focus`
scalars from the query string. Because asynchronously mounted settings above a
target can change page height after first paint, the page re-aligns the target
at bounded 100 ms, 600 ms, and 1,600 ms checkpoints and clears every pending
timer on route/effect cleanup. This keeps Working Hours and customer-link
controls visibly reachable without polling, animation, data reads, or writes.

## Placement Proof

The helper reads existing `storeDetails.menuPresence.googleBusiness`, `instagramBio`, and `whatsappProfile` timestamps. It shows:

- confirmed count
- latest confirmed age
- missing labels
- stale state after 45 days

Only normalized valid timestamps count as confirmed. Publication uses the same
current-project contract as menu presence readiness: the project needs a
non-empty ID, a valid publish timestamp, and must not be inactive or
soft-deleted. Customer links and hours are admitted only from non-empty string
values, so malformed legacy maps cannot suppress the next corrective action.

No screenshot, external fetch, or verification storage is added in this slice.

## Cross-tab publication convergence

`publishProject()` emits a bounded event only after the authoritative publish
has committed and public cache revalidation has run. The event contains the
canonical tenant, store, and project identifiers plus a timestamp—never menu,
owner, customer, or credential data. The desktop dashboard listens only for its
exact selected scope and then reuses its existing project fetcher once. Other
tenants, stores, projects, malformed browser values, draft saves, and ordinary
focus changes do not cause a read.

## Failure Behavior

If project data is still loading, desktop does not render the action layer. Mobile waits for project selection data. When the helper reports `Stable`, both dashboards suppress the action card instead of presenting routine work. The layer does not block dashboard rendering, and no mutation depends on it. If browser storage is unavailable, same-tab convergence still works and other tabs converge on their next authoritative refresh. Business Settings query objects are not effect dependencies; only their normalized scalar values can restart deep-link settlement.
