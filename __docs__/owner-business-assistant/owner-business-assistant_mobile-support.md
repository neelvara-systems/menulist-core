# Owner Business Assistant Mobile Support

**Owner-Facing Name:** Business Health
**Status:** MobileShell read-only screen
**Last Updated:** July 9, 2026

## Mobile Boundary

Mobile Business Health is a `MobileShell` sub-screen. It shows health state, analytics, checks, questions, and grounded answers. It does not perform actions.

Owner operations from mobile belong to Menu Manager and must use Menu Manager cards, approvals, and existing operation paths.

## Owner Business Health boundary source gate

`npm run verify:owner-business-health-boundary` verifies the MobileShell read-only screen boundary, selected store/project context, answer/read-model request policy, absence of Business Health action sheets, and absence of desktop route bypass through `window.location`. Asking for a mutation does not mutate truth and does not open an action sheet.

## Required Mobile Behavior

- Entry remains inside `MobileShell`.
- Back navigation returns to the previous shell screen.
- `/business-health` deep links map into shell state where supported.
- Composer remains usable with the keyboard open.
- Cards and checks do not hide behind the composer.
- Touch targets are at least 44px where controls exist.
- Project selector keeps selected-menu context.
- Store context follows the current mobile shell store.
- Official customer source fix-list buttons route through `MobileShell` callbacks, not desktop URLs.

## Removed Mobile Behavior

Business Health mobile must not include:

- operation bottom sheet
- Open/Reviewed/Dismiss operation controls
- generated-image action controls
- direct publish/external handoff controls
- desktop route bypass through `window.location` for Business Health actions

## Supported Mobile Content

- current health card
- analytics strip
- source/freshness notes
- priority checks as read-only cards
- official customer source fix list from MenuList store/project truth
- suggested questions
- typed owner question input
- read-only answers and artifacts
- unsupported-domain explanations

## Mobile QA

Verify:

1. Mobile More opens Business Health inside `MobileShell`.
2. The screen keeps selected project/store context.
3. Suggested questions and typed answers work.
4. Priority checks render without action buttons.
5. Official customer source fix-list buttons open the Menu tab, Share tab, or More sub-screens through shell callbacks.
6. Asking for a mutation does not mutate truth and does not open an action sheet.
7. The screen stays usable with keyboard open.
8. Account, billing, reseller, platform, and Answerlattice surfaces are not directly mutable from Business Health.

## Direct-Entry Permission Boundary

`MobileShell` replaces the guarded desktop page on handheld devices, so it owns the mobile defense for direct routes and hashes. A loaded role without `VIEW_ANALYTICS` is reset from `today/dashboard` or `more/businessHealth` to the safe main screen. While permissions are still loading, the analytics screen does not mount. The Business Health opener also requires the feature flag and `VIEW_ANALYTICS`. Mobile More retains the same gate for in-shell navigation.
