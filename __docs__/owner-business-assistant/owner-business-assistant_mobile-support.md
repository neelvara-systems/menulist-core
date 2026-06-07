# Owner Business Assistant Mobile Support

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Planning complete, implementation not started
**Last Updated:** June 7, 2026

---

## Mobile Admission Decision

Business Health is admitted to owner mobile.

Reason: the highest-value use case is a non-technical owner checking from a phone whether anything needs attention. A desktop-only assistant would violate the owner workflow and would make the feature less useful than the existing mobile dashboard.

## Existing Mobile Contract

Business Health must stay inside `MobileShell`.

Evidence:

- `src/components/mobile/MobileShell.tsx:34-55` maps owner routes to mobile tab/sub-screen state.
- `src/components/mobile/MobileShell.tsx:217-260` manages mobile hash state and selected-project eager loading.
- `src/components/mobile/MobileShell.tsx:448-520` renders Today, Share, More, and Menu screens inside shared providers.
- `src/components/mobile/screens/MobileMoreScreen.tsx:146-182` defines allowed More sub-screens.
- `src/components/mobile/screens/MobileMoreScreen.tsx:786-812` shows the More screen list/card pattern.

## Route Strategy

Desktop route:

```text
/business-health
```

Mobile mapping option A, preferred:

```ts
'/business-health': { tab: 'today', todayScreen: 'dashboard', moreScreen: 'main' }
```

Use this if Business Health is placed as a Today/Dashboard experience.

Mobile mapping option B:

```ts
'/business-health': { tab: 'more', todayScreen: 'main', moreScreen: 'businessHealth' }
```

Use this if Business Health is kept as a More workspace.

Do not navigate mobile owners into a desktop route reload from Today, More, Share, or Menu.

## Required Mobile Files

```text
src/components/mobile/screens/MobileBusinessHealthScreen.tsx
src/components/mobile/sheets/MobileBusinessHealthActionSheet.tsx
src/components/mobile/sheets/MobileBusinessHealthSourceSheet.tsx
src/components/mobile/components/MobileBusinessHealthCard.tsx
```

Add to existing mobile registry:

- `MobileShell.tsx`
- `MobileMoreScreen.tsx` if using More sub-screen
- `MobileTodayScreen`/`MobileHoursScreen` path if using Today entry

## Layout Contract

Mobile order:

1. Header: Business Health, branch selector if needed, status, last checked.
2. Summary card.
3. Compact analytics periods: Today, This week, This month.
4. Priority checks, max 3 visible.
5. Suggested questions, 4-6 chips max.
6. Answer panel.
7. Actions as bottom sheet.
8. Source/freshness disclosure.

Mobile data should use the same scheduler-day cache behavior as desktop. Opening Business Health from `MobileShell` should render cached current/analytics packets first and fetch only when missing, stale, or after an explicit refresh.

Do not use:

- Floating chat bubble.
- Split desktop columns.
- Tiny side panel.
- Multi-tab route stack for the owner-facing launch surface.
- Long chat-first screen.

## Touch and Readability

Requirements:

- Every action target at least 44px high.
- Primary action visible without horizontal scrolling.
- Bottom sheet buttons have explicit labels.
- Chips wrap instead of shrinking text.
- Status labels include visible text, not color only.
- Freshness text is visible, not tooltip-only.
- Error/refusal text is short and retry-safe.

Preferred loading copy:

> Checking latest MenuList facts...

Avoid:

> AI is thinking...

## Mobile Action Rules

Action Support is part of the day-one mobile contract. If `ENABLE_OWNER_BUSINESS_ACTION_SUPPORT` is off, the mobile screen remains read-only and hides draft/confirm controls while keeping Business Health available.

Navigate:

- Can switch tabs/sub-screens inside `MobileShell`.
- Should not use `window.location`.

Prepare draft:

- Use bottom sheet to show what will be prepared.
- Confirm preparation if it creates a stored draft.
- For price, description, and image changes, show the target item/business surface and the proposed value before any save.
- Store image drafts as media references only, not base64 or chat attachments.

Confirm write:

- Use a high-clarity bottom sheet.
- Show affected public surface when applicable.
- Require explicit tap.
- Disable while saving.
- Show result and next screen.
- If the server detects that the target changed since the draft was prepared, require the owner to review again.

Public-truth publish:

- Prefer opening existing publish screen until public-truth publish-in-assistant has full QA.
- If in-assistant publish is enabled, require owner/admin permission and explicit affected-surface copy.

## Multi-Location Mobile

The selector must support:

- Single store: no noisy selector.
- Multi-location owner: branch selector sheet.
- Manager: assigned stores only.
- Staff: assigned scope only.
- Reseller/internal: setup/support context only.

Do not fetch every outlet on open if a compact location summary is already available.

## Offline and Stale States

Mobile should render:

| State | Copy |
| --- | --- |
| No current doc | Latest check is not ready yet. |
| Stale doc | Latest check is delayed. Showing the last available check. |
| Offline | Showing the last loaded check on this device. |
| Unsupported question | MenuList does not have enough data for that yet. |

## Mobile QA Checklist

- `/business-health` opens inside `MobileShell`.
- Cached Business Health packet renders before any new network read when still valid.
- Back returns to previous mobile tab/sub-screen.
- Branch selector respects permissions.
- Stable state shows "No action needed".
- Priority checks are tappable with 44px targets.
- Suggested questions wrap cleanly at 320px width.
- Action bottom sheet traps focus and closes with cancel/back.
- Action bottom sheet is not reachable when Action Support is disabled.
- Public-truth action cannot be confirmed with one accidental tap.
- Freshness/source text is visible on narrow screens.
- Public `/client/*` routes are unaffected.

## Implementation Verdict

Mobile support is required by the implementation contract. A desktop-only Business Health card/page is not acceptable.
