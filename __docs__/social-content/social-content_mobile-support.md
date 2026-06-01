# Social Content (Today Screen) — Mobile Support

**Last Updated:** June 1, 2026 (v5 - MobileHoursScreen is the live Today tab; legacy owner generation retired)
**Decision:** Mobile supports existing Today actions, staff prompt, and physical-surface cards. The old `Generate Today Action` prompt is retired; GrowthOS / `Today's Sales Pack` owns new generated actions.

---

## Feature Admission Test (Re-evaluated)

| Gate          | Result  | Reasoning                                         |
| ------------- | ------- | ------------------------------------------------- |
| **Frequency** | ✅ PASS | Daily — owner checks every day                    |
| **Speed**     | ✅ PASS | One-tap share to WhatsApp <3s                     |
| **Touch**     | ✅ PASS | Big primary button, skip below                    |
| **Value**     | ✅ PASS for prepared Today actions; HOLD for owner generation and weekly pack | Existing prepared actions matter on phone. Asking owners to generate weak actions is now retired in favor of GrowthOS Sales Pack. |

---

## Mobile Implementation

| Feature                       | Mobile Component                                      | Status |
| ----------------------------- | ----------------------------------------------------- | ------ |
| Live Today tab shell          | `MobileShell` -> `MobileHoursScreen`                  | Done   |
| Today's hours and status      | `MobileHoursScreen`                                   | Done   |
| Primary campaign card         | `MobileHoursScreen`                                   | Done   |
| WhatsApp share action         | `MobileHoursScreen` -> `completeCampaign`             | Done   |
| Skip campaign                 | `MobileHoursScreen` -> `skipCampaign`                 | Done   |
| Staff prompt (read-only)      | `MobileHoursScreen`                                   | Done   |
| Operational campaigns (max 2) | `MobileHoursScreen`                                   | Done   |
| Weekly Growth Pack            | `TodayWeeklyGrowthPackCard` behind feature flag       | Paused, default off |
| Legacy owner generation       | Deleted from active code                              | Removed |
| Feature flag gate             | `SOCIAL_CONTENT_ENABLED`, `ENABLE_TODAY_WEEKLY_GROWTH_PACK` | Done |

`MobileTodayScreen` has been removed from active code. The current bottom-nav Today tab renders `MobileHoursScreen`; new Today work should target `MobileHoursScreen` unless the mobile shell changes.

## DAL Parity

- Uses same `getTodayCampaigns` from `@database/campaigns`
- Same `completeCampaign`, `skipCampaign` DAL functions
- Same `ACTION_TITLES`, `CONTEXT_TEMPLATES`, `SURFACE_BUTTON_COPY` constants
- Same `TodayCampaignSummary` type
- Weekly Growth Pack uses `src/lib/today/weeklyGrowthPack.ts`, shared with desktop.

## Product Pause

Do not surface the weekly pack on mobile until owner pilots prove it is useful. Mobile Today should remain focused on immediate truth and operations first: current hours, store status, public link, campaign/action status, and critical fixes.

Do not bring back the old `No today action yet` / `Generate Today Action` card. If there is no prepared action and no GrowthOS trigger, Today should stay quiet.

If revived, the mobile pack should appear as a compact optional action, not a long default card.

## Cost Impact

Firebase cost impact: `$0.00` incremental for the retired weekly pack. The active Today/GrowthOS path reads only when the Today surface loads; the old global sidebar polling provider has been removed.
