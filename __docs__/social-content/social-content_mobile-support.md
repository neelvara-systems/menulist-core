# Social Content (Today Screen) — Mobile Support

**Last Updated:** May 31, 2026 (v4 - MobileHoursScreen is the live Today tab; Weekly Growth Pack paused)
**Decision:** Full mobile support for Today actions. Weekly Growth Pack mobile UI exists behind a disabled flag and is not rollout-ready.

---

## Feature Admission Test (Re-evaluated)

| Gate          | Result  | Reasoning                                         |
| ------------- | ------- | ------------------------------------------------- |
| **Frequency** | ✅ PASS | Daily — owner checks every day                    |
| **Speed**     | ✅ PASS | One-tap share to WhatsApp <3s                     |
| **Touch**     | ✅ PASS | Big primary button, skip below                    |
| **Value**     | ✅ PASS for Today actions; HOLD for weekly pack | Daily truth/actions matter on phone. Weekly copy-pack need is not proven enough to roll out. |

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
| Feature flag gate             | `SOCIAL_CONTENT_ENABLED`, `ENABLE_TODAY_WEEKLY_GROWTH_PACK` | Done |

`MobileTodayScreen` remains in the codebase, but the current bottom-nav Today tab renders `MobileHoursScreen`. New Today work should target `MobileHoursScreen` unless the mobile shell changes.

## DAL Parity

- Uses same `getTodayCampaigns` from `@database/campaigns`
- Same `completeCampaign`, `skipCampaign` DAL functions
- Same `ACTION_TITLES`, `CONTEXT_TEMPLATES`, `SURFACE_BUTTON_COPY` constants
- Same `TodayCampaignSummary` type
- Weekly Growth Pack uses `src/lib/today/weeklyGrowthPack.ts`, shared with desktop.

## Product Pause

Do not surface the weekly pack on mobile until owner pilots prove it is useful. Mobile Today should remain focused on immediate truth and operations first: current hours, store status, public link, campaign/action status, and critical fixes.

If revived, the mobile pack should appear as a compact optional action, not a long default card.

## Cost Impact

Firebase cost impact: `$0.00`. The weekly pack is client-side, deterministic, and uses data already loaded by the Today tab.
