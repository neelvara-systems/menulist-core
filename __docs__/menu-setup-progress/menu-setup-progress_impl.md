# Menu Setup Progress - Implementation

**Status:** Local source complete
**Last reviewed:** July 16, 2026

## Authority

`src/lib/menuSetupProgress/buildMenuSetupProgress.ts` is the single computation. Inputs are current selected project, optional precomputed quality signals, and current store details. Output contains phase, required/optional steps, exact next action, compact copy, percentage, and `shouldShow`. The percentage remains an internal compatibility field; owner cards do not render it as a score.

## Defensive derivation

- `project.files` and extracted item lists must be arrays; malformed values become empty.
- Source requires trimmed `project.projectId`; `onboardingSource` is not project proof.
- Active item count requires a non-empty item ID plus localized/string name and
  excludes `active === false`; arbitrary persisted objects are not menu items.
- Publish uses `normalizeStarterActivationTimestamp()` rather than truthiness
  and current `active !== false` / `deleted !== true` project state remains
  authoritative over an old publish timestamp.
- Activation summary counts only allowlisted signals with valid timestamps.
- Public-link/photo optional checks accept direct non-empty link/map values and
  valid photo arrays rather than arbitrary truthy or nested metadata objects.

## Rendering

- `OwnerDashboard` uses one SWR selected-project load and passes the same result to Menu Setup Progress and Menu Quality.
- `MobileMenuScreen` and `MobileShareScreen` use selected project data from `MobileProjectsProvider`.
- `MobileMoreScreen` waits for project-provider loading, computes the same summary, checks destination permission, and calls Menu/Share/Official Page shell callbacks.
- Desktop and mobile cards show only the current next step, its plain-language explanation, and one destination action. They do not render percentages, completed-step pills, or optional-work checklists.

## Activation acknowledgement

Sharing writes return a typed acknowledgement with store, signal, and `recordedAt`. Desktop Use MenuList and Mobile Share update the loaded store context only after the acknowledgement and only if the store still matches. Presence confirm/remove does the same. This updates the progress/banner immediately without another Firestore read.

No new route or backend artifact exists under `api/menu-setup-progress` or `functions/src/menuSetupProgress`.
