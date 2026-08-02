# Contextual State Illustration Rules

**Status:** Mandatory
**Scope:** MenuList, Answerlattice, CampaignCue, SignalDesk, MyCodex

## Purpose

Use contextual state illustrations to help a person understand a meaningful blank, first-use, recovery, or completion state. They are decorative spot illustrations, not interface icons and not generic decoration.

## Shared implementation

- Use `src/components/atoms/contextualStateIllustration/index.tsx` and its reviewed, locally bundled SVG allowlist.
- Keep the SVG source private to the application bundle. Do not hotlink it, expose a public illustration library, or make it independently downloadable.
- Continue using `react-icons/lu` for buttons, navigation, toolbars, form affordances, statuses, and other interactive icons.
- Do not paste one-off SVG markup into a screen. Add a reviewed variant to the shared component only when no existing variant accurately fits.
- Illustrations remain decorative and hidden from assistive technology. The heading, description, and action must communicate the state without the artwork.

## Eligible states

An illustration may be used when the state is the main message of a region or screen and is one of the following:

1. A first-use state with a clear next action.
2. A configuration-required state that blocks useful output.
3. A page-level analytics or reporting state before data exists.
4. A significant recovery/result state such as 403, 404, 500, failed processing, or successful completion.
5. A meaningful onboarding or setup completion state.

## States that stay plain

Do not add an illustration to:

- healthy operational states such as no incidents, no drift, no actions, no warnings, or an empty review queue;
- search, filter, or table zero-match results;
- loading states, feature-disabled notices, toasts, alerts, validation messages, or compact cells;
- repeated widgets on one dashboard or every missing-image row;
- customer menu output or a missing customer-facing item image;
- a CampaignCue creative editor, canvas, Asset Library, generated pack, preview, export, or downloadable artifact;
- interactive upload controls, buttons, navigation, statuses, or toolbar controls.

Use at most one contextual illustration per meaningful state region. If several adjacent panels are empty, prioritize the page-level explanation instead of decorating every panel.

## Color, treatment, and size

- Positive, first-use, configuration, and analytics states may use the active product `token.colorPrimary` with `treatment="softHalo"`.
- Error, warning, access-denied, and other recovery states use a restrained neutral or semantic token with `treatment="plain"`.
- The SVG geometry must inherit `currentColor`; do not hardcode a product color or bake a gradient into the SVG paths.
- The soft halo is theme-aware presentation around the artwork, not a rewritten illustration asset.
- Typical sizes are 72-96 px for compact/mobile regions and 96-152 px for page-level desktop states.

## Product boundaries

### MenuList

- Use illustrations in the authenticated owner app, owner mobile shell, first menu/project setup, contextual media onboarding, page-level analytics, staff/role setup, schedules, and global recovery pages.
- Keep customer menus, public feedback output, search misses, healthy summaries, and repeated missing-photo rows plain.

### Answerlattice

- Preserve its governed-infrastructure tone. Good fits include initial knowledge intake, canonical-answer/FAQ setup, Answer Tests setup, product-surface configuration, team/role setup, and page-level usage/readiness analytics.
- Keep healthy governance queues, no drift, no known issues, no proposals, no incidents, filtered results, and nested operational tables plain.

### CampaignCue

- Use illustrations only in shell-level first-use states such as no campaign pack, no owner input, no saved example, no schedule, or no eligible video output.
- Never place shared illustrations inside the creative/editor workspace, generated content, preview, Asset Library, export surface, or downloaded file.

### SignalDesk

- Consider illustrations only for first target, first market search, first mission, or required configuration.
- Keep no incidents, no kill switches, no current outcomes, no anomalies, and other healthy operational states plain.

### MyCodex

- Good fits are first-use favorites, queue, or document-library states when a clear next action exists.
- Keep search/filter zero matches and compact reader metadata plain. Illustration adoption must not introduce a database, public domain, or new runtime dependency.

## Required workflow for a new state

1. Classify the state as first-use, configuration, analytics, recovery, completion, healthy, filter-miss, loading, or editor/output.
2. Confirm the state is eligible under this rule and that the illustration accurately matches the copy.
3. Reuse the shared component and an existing variant wherever possible.
4. Check desktop/mobile parity for shared owner workflows without forcing artwork into a surface where it does not fit.
5. Update the reviewed consumer and empty-state inventory in `scripts/verification/verify-contextual-state-illustrations.js`.
6. Run `npm run verify:contextual-state-illustrations`, `npx tsc --noEmit`, and focused lint for changed files.
7. Confirm that no external provider reference, hotlink, public asset directory, or independently downloadable illustration was introduced.
