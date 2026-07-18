# Temporary Status Layer — Mobile Support Assessment

**Date:** June 29, 2026
**Last Source Gate Update:** July 2, 2026

---

## Source Gate

Mobile parity is source-gated by `npm run verify:temporary-status-boundary`.

The gate checks `MobileTempStatusScreen`, `MobileHoursScreen` Today shortcuts, and `MobileMoreScreen` routing. Dedicated Temporary Status and Today/Hours status shortcuts must call `/api/store/temp-status` through `AUTH_BROWSER_REQUEST_POLICY`, parse through the shared 8KB bounded response helper, keep fixed owner-facing failure copy, log bounded diagnostics, and roll back optimistic state unless `{ success: true }` is confirmed.

## Mobile Relevance Decision: **YES**

| Gate | Answer | Pass? |
|------|--------|-------|
| **Frequency** | Occasional but urgent when needed | ✅ PASS |
| **Speed** | 2 taps to set status | ✅ PASS |
| **Touch** | Toggle buttons, thumb-friendly | ✅ PASS |
| **Value** | Owner is often away when emergencies happen | ✅ PASS |

## Mobile Implementation

- Add "Set Status" quick action on MobileMoreScreen
- antd-mobile ActionSheet for status type selection
- DatePicker for expiry time
- Optimistic update (banner shows immediately, syncs to Firestore after)
- Mobile "Mark Closed for Today" uses Temporary Status instead of changing recurring `workingHours`
- Regular weekday hour edits are labeled as recurring schedule edits, not one-day overrides
- Dedicated Temporary Status and Today/Hours status shortcuts call `/api/store/temp-status` through the shared authenticated browser request policy before response validation.
- Dedicated Temporary Status and Today/Hours status shortcuts use `src/lib/tempStatus/clientResponse.ts` to cap responses at 8KB and require `{ success: true }` before optimistic state remains.
- Failed set/clear writes log bounded mobile owner diagnostics:
  - `mobile_temp_status_set_failed` with rejected responses tagged as `mobile_temp_status_set_rejected`
  - `mobile_temp_status_clear_failed` with rejected responses tagged as `mobile_temp_status_clear_rejected`
  - `mobile_today_close_today_failed`, `mobile_today_temp_status_set_failed`, and `mobile_today_temp_status_clear_failed` for Today/Hours shortcuts
  - `temp_status_response_parse_failed` / `temp_status_response_invalid` for malformed or invalid response envelopes
- Owner-facing failure copy stays fixed, and the optimistic UI rolls back to the previous temporary status on failure.

---

**Last Updated:** July 2, 2026
