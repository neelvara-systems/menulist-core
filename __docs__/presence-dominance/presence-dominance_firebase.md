# Presence Dominance — Firebase Cost Tracking

**Date:** February 19, 2026  
**Audience:** Founder, Cost Control  
**Pillar:** 1 of 6

---

## Cost Summary

**Monthly Additional Cost: ₹0 (Zero)**

This pillar adds NO new Firebase operations. All behavioral adoption components are client-side only.

---

## Operations Breakdown

### New Operations Added: NONE

The behavioral adoption layer consists of:
- **Copy to clipboard:** Browser API (0 Firebase ops)
- **QR download:** Existing generation (already counted in physical surfaces)
- **Web Share API:** Browser native (0 Firebase ops)
- **Share modal:** Static content (0 Firebase ops)
- **Post-publish nudge:** localStorage flag (0 Firebase ops)

Failed Owner Dashboard behavior-nudge dismiss load/save and link-copy diagnostics are browser-local secure logs with bounded metadata only. They do not add Firestore reads/writes. The Google listing "Done" action continues to use the existing store update path documented under Official Business Page.

### Existing Operations (Already Counted)

| Operation | Source | Reads/Day | Writes/Day |
|-----------|--------|-----------|------------|
| OBP page load | `unstable_cache` (60s TTL) | 0 on cache hit, 4 on miss | 0 |
| OBP analytics | `OBPAnalytics.tsx` | 1 (daily doc check) | 1 (increment view) |
| OBP action clicks | `OBPActions.tsx` | 0 | 1 per click |

These are already documented in `__docs__/official-business-page/official-business-page_firebase.md`.

---

## Cost Impact per 100 Stores

| Component | Reads/month | Writes/month | Cost/month |
|-----------|------------|-------------|------------|
| Share guidance card | 0 | 0 | ₹0 |
| Post-publish nudge | 0 | 0 | ₹0 |
| Mobile share button | 0 | 0 | ₹0 |
| Platform instructions | 0 | 0 | ₹0 |
| **Total** | **0** | **0** | **₹0** |

---

**Last Updated:** February 19, 2026
