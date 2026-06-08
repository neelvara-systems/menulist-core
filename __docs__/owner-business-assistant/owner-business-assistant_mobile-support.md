# Owner Business Assistant Mobile Support

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Implemented behind feature flags
**Last Updated:** June 8, 2026

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
4. Compact location summary for multi-store tenants only.
5. Priority checks, max 3 visible.
6. Suggested questions, 4-6 chips max only when source-backed health is ready.
7. Answer panel.
8. Actions as bottom sheet.
9. Source/freshness disclosure.

Mobile data should use the same scheduler-day cache behavior as desktop. Opening Business Health from `MobileShell` should render cached current/analytics packets first and fetch only when missing, stale, or after an explicit refresh.

Bounded chat history uses the same shared thread hook as desktop, but only when `ENABLE_OWNER_BUSINESS_HEALTH_THREADS` is enabled. When the flag is off, mobile shows only the latest answer and writes no thread. When the flag is on, messages are embedded in the single thread doc, not stored as separate message docs.

The first mobile ask must create or reuse the local thread ID before calling `/answer`. Mobile then renders the pending owner question and latest answer immediately from hook state while the one-doc thread history refreshes. Once the thread doc returns, duplicate pending/answer bubbles are suppressed by question text and answer ID.

When Business Health is not source-backed yet, the mobile screen hides the Ask input and suggested questions. It shows large navigation shortcuts to Dashboard, Menu, Share, and Settings instead of presenting a disabled chat surface.

Multi-location mobile summary reads `/api/owner-business-assistant/locations`, which returns one compact tenant summary doc filtered by `storesSummary` active state and mapped store access. It must not load every outlet's detailed Business Health packet.

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
- Owner and Business Health messages use distinct bubbles, labels, and alignment.
- Follow-up question buttons stay inside the latest Business Health response area and keep 44px touch targets.
- Pending owner question and latest answer appear immediately after send, even before the Firestore thread read catches up.

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

When there is no current source-backed doc, mobile must not show the green "No action needed" tag, suggested questions must be disabled, and the free-text Ask control must stay disabled until a generated check with `sourceRefs` is available.

When a source-backed doc exists, mobile must show a plain freshness line such as `Uses data through 7 Jun 2026. Today may not be complete yet.` so owners do not assume the answers are realtime.

## Mobile QA Checklist

- `/business-health` opens inside `MobileShell`.
- Cached Business Health packet renders before any new network read when still valid.
- Back returns to previous mobile tab/sub-screen.
- Branch selector respects permissions.
- Stable state shows "No action needed".
- Not-ready state does not show "No action needed" and does not allow Ask submission.
- Not-ready state uses neutral/info treatment and shows large navigation shortcuts instead of a disabled Ask panel.
- Multi-store tenants see a compact location summary with outlet status/top reason; single-store tenants do not see the section.
- Data coverage note is visible near the Business Health summary.
- Priority checks are tappable with 44px targets, and review/dismiss hides the check locally for the current business date after the server audit write succeeds.
- Suggested questions wrap cleanly at 320px width.
- First ask from a fresh install supplies a thread ID in the same `/answer` request when thread history is enabled.
- Latest answer renders immediately and does not duplicate after thread history catches up.
- Action bottom sheet traps focus and closes with cancel/back.
- Action bottom sheet is not reachable when Action Support is disabled.
- Public-truth action cannot be confirmed with one accidental tap.
- Freshness/source text is visible on narrow screens.
- Platform admins can open `Business Health Monitor` from Mobile More -> Platform Monitoring, and it renders inside `MobilePlatformInternalScreen` instead of forcing a desktop route.
- `/platform/owner-business-assistant` maps into the same mobile platform monitor wrapper on mobile devices.
- Public `/client/*` routes are unaffected.

## Implementation Verdict

Mobile support is required by the implementation contract. A desktop-only Business Health card/page is not acceptable.
