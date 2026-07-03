# Social Content (Today Screen) — Mobile Support

**Last Updated:** June 29, 2026 (v7 - MobileHoursScreen is the live Today tab; legacy owner generation retired; shared campaign and weekly-pack copy diagnostics bounded)
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

## Diagnostic Boundary

The June 27 diagnostic pass added bounded internal logging for failed Mobile Today mutations and downloads without changing `MobileHoursScreen` UI behavior, navigation, reads, writes, or mobile copy.

Shared Today/campaign failures now route through `src/lib/campaigns/campaignDiagnostics.ts` where applicable. Mobile owner mutation/download failures route through `src/components/mobile/utils/mobileOwnerDiagnostics.ts`.

The paused Weekly Growth Pack mobile card also uses the shared campaign diagnostic boundary for failed browser-local copy actions. Failed copy logs `today_weekly_growth_pack_copy_failed` with bounded asset/copy/primary-subject presence-length metadata, clipboard/fallback support booleans, and a controlled failure stage only. The mobile card must not log raw generated copy, menu links, owner-entered text, or browser exception payloads.

Guarded Mobile Today failure codes:

- `mobile_today_close_today_failed`
- `mobile_today_campaign_complete_failed`
- `mobile_today_campaign_skip_failed`
- `mobile_today_hours_update_failed`
- `mobile_today_temp_status_set_failed`
- `mobile_today_temp_status_clear_failed`
- `mobile_today_tent_card_download_failed`
- `mobile_today_sticker_download_failed`

Diagnostics record normalized failure codes and bounded presence/length metadata only. Mobile Today must not add direct `console.*` logging for campaign IDs, project IDs, item names, menu links, image URLs, captions, owner-entered text, status messages, hours payloads, or provider/browser exception objects.

`npm run verify:public-business-truth` guards the shared Today/campaign diagnostic contract.

## Product Pause

Do not surface the weekly pack on mobile until owner pilots prove it is useful. Mobile Today should remain focused on immediate truth and operations first: current hours, store status, public link, campaign/action status, and critical fixes.

Do not bring back the old `No today action yet` / `Generate Today Action` card. If there is no prepared action and no GrowthOS trigger, Today should stay quiet.

If revived, the mobile pack should appear as a compact optional action, not a long default card.

## Cost Impact

Firebase cost impact: `$0.00` incremental for the retired weekly pack. The active Today/GrowthOS path reads only when the Today surface loads; the old global sidebar polling provider has been removed.
