# Social Content (Today Screen) — Mobile Support

**Last Updated:** February 16, 2026 (v2 — MobileTodayScreen implemented)
**Decision:** ✅ FULL MOBILE SUPPORT — "What should I do today?" is the most mobile-native feature

---

## Feature Admission Test (Re-evaluated)

| Gate          | Result  | Reasoning                                         |
| ------------- | ------- | ------------------------------------------------- |
| **Frequency** | ✅ PASS | Daily — owner checks every day                    |
| **Speed**     | ✅ PASS | One-tap share to WhatsApp <3s                     |
| **Touch**     | ✅ PASS | Big primary button, skip below                    |
| **Value**     | ✅ PASS | Phone-only owner needs daily campaigns from phone |

---

## Mobile Implementation

| Feature                       | Mobile Component                         | Status |
| ----------------------------- | ---------------------------------------- | ------ |
| Primary campaign card         | `MobileTodayScreen`                      | ✅     |
| WhatsApp share action         | `MobileTodayScreen` → `completeCampaign` | ✅     |
| Skip campaign                 | `MobileTodayScreen` → `skipCampaign`     | ✅     |
| Staff prompt (read-only)      | `MobileTodayScreen`                      | ✅     |
| Operational campaigns (max 2) | `MobileTodayScreen`                      | ✅     |
| Post-action feedback          | `MobileTodayScreen` (2s auto-dismiss)    | ✅     |
| Empty state                   | `MobileTodayScreen`                      | ✅     |
| Feature flag gate             | `FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED`   | ✅     |

## DAL Parity

- Uses same `getTodayCampaigns` from `@database/campaigns`
- Same `completeCampaign`, `skipCampaign` DAL functions
- Same `ACTION_TITLES`, `CONTEXT_TEMPLATES`, `SURFACE_BUTTON_COPY` constants
- Same `TodayCampaignSummary` type
