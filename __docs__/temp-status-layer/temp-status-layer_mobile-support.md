# Temporary Status Layer — Mobile Support Assessment

**Date:** June 1, 2026

---

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

---

**Last Updated:** June 1, 2026
