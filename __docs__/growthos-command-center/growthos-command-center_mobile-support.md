# GrowthOS Command Center - Mobile Support

**Status:** Candidate assessment for separate GrowthOS. MenuList Today wedge implemented but paused behind a disabled flag.  
**Decision:** Partial mobile support for future GrowthOS. Today Weekly Growth Pack mobile UI exists, but rollout is paused until owner value is proven.

---

## Mobile Relevance Decision

GrowthOS Command Center is partially mobile-relevant.

Mobile should support short, thumb-friendly actions:

- see this week's ready actions
- approve
- ignore
- copy/export text
- confirm a simple freshness fix

Mobile should not support heavy setup, brand memory editing, visual asset editing, routing configuration, or multi-surface publishing.

## Implemented Mobile Wedge

The first implementation lives in the existing owner mobile Today tab, not a GrowthOS mobile route.

| Item | Current truth |
| --- | --- |
| Mobile host | `src/components/mobile/screens/MobileHoursScreen.tsx` |
| Card | `src/components/mobile/components/TodayWeeklyGrowthPackCard.tsx` |
| Shared logic | `src/lib/today/weeklyGrowthPack.ts` |
| Flag | `FEATURE_FLAGS.ENABLE_TODAY_WEEKLY_GROWTH_PACK` defaults to `false` and remains paused |

`MobileTodayScreen` exists in the repo, but the live bottom-nav Today tab currently renders `MobileHoursScreen`.

Product pause: keep this mobile card hidden. The owner-value concern is not whether the code works; it is whether a non-technical owner will actually use the pack often enough for it to matter. Mobile Today should prioritize current hours, store status, menu/public link readiness, and critical fixes.

## Feature Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Weekly queue and quick exports can become recurring owner behavior. |
| Speed | Partial | Approve/copy can complete under 5 seconds; generation and editing cannot. |
| Touch | Pass for queue triage | Approve/ignore/export works with large touch targets. Asset editing is desktop only. |
| Value | Hold | Owners may need WhatsApp/Google copy, but the need is not proven enough to roll out. |

## Mobile Scope

| Mobile action | Status |
| --- | --- |
| View top 3-7 actions | In scope if approved. |
| Approve low-risk action | In scope if approved. |
| Ignore/archive action | In scope if approved. |
| Copy WhatsApp message | In scope if approved. |
| Export simple text assets | In scope if approved. |
| Confirm simple hours/freshness item | In scope only if routed through MenuList-owned write path. |
| Generate full media pack | Desktop-first; mobile can trigger but not edit deeply. |
| Edit brand memory/style | Desktop only. |
| Configure integrations | Desktop only. |
| Direct publish to platforms | Out of scope. |

## Mobile Architecture

If built:

1. DAL first in `src/database/growthos/index.ts`.
2. Shared hook in `src/hooks/useGrowthosCommandCenter.ts`.
3. Desktop UI in `src/components/templates/growthos/commandCenter/`.
4. Mobile UI in `src/components/templates/mobile/growthos/`.

Mobile must use the same DAL and hooks as desktop. No mobile-specific database logic.

The implemented Today wedge has no DAL because it does not read or write new data. It uses existing Today/store/project data already loaded by the host screen.

## UI Rules

| Rule | Requirement |
| --- | --- |
| Touch target | Minimum 44px for actions. |
| Navigation depth | Maximum two levels from mobile navigation. |
| Component model | `antd-mobile` + Tailwind, not desktop Ant Design. |
| Icons | `react-icons/lu` only. |
| Feedback | Optimistic status updates for approve/ignore/export. |
| Copy | Plain owner language. No "AI-powered", "smart", or "dynamic". |
| Errors | Non-blocking retry/toast pattern. |

## Mobile Screens

| Screen | Purpose |
| --- | --- |
| Action Queue | Top actions grouped by critical fixes, growth moves, trust moves. |
| Action Detail Sheet | Evidence label, output preview, approve/ignore/export actions. |
| Copy/Export Sheet | Copy WhatsApp text, save image/file if generated. |
| Retry State | Restore failed approve/export action without blocking the queue. |

## Desktop-Only Screens

- first-time setup
- brand memory/profile editing
- route/domain/admin configuration
- multi-location review
- full media preview/editing
- integration setup

## Cost Impact

Firebase cost impact: `$0.00` for the implemented Today wedge. No new reads, writes, listeners, functions, or schedulers.
