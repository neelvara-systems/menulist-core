# Menu Presence Monitor

> **Status:** DOCUMENTED — Implementation pending
> **Feature Flag:** `ENABLE_MENU_PRESENCE_MONITOR`
> **Route:** Embedded panel on Use MenuList page (`/use-menulist`)
> **Mobile:** Embedded in MobileShareScreen
> **Source:** ChatGPT Owner Features Session (March 15, 2026) → Cascade Review

## What It Is

A simple status checklist that answers one question for the owner: **"Is my menu visible everywhere customers look?"**

Shows deployment status across key surfaces — Google Business, Instagram, WhatsApp, QR, Screens — using manual confirmation (owner marks "I added it") plus automatic detection where possible.

**Not** analytics. **Not** a dashboard. **Not** marketing. Just simple status signals: ✓ Active / ⚠ Missing.

## Why It Matters

Owners set up menu links once and forget. They often miss key surfaces:
- Never added menu to Google Business Profile
- Instagram bio still has old PDF link
- WhatsApp profile has no menu link
- QR cards not yet printed

Menu Presence Monitor gently surfaces these gaps without overwhelming the owner.

## Architecture Principle

**Mostly manual confirmation + partial automatic detection.** Zero new collections for v1. Store-level field (`menuPresence`) on existing store document tracks confirmed surfaces. Automatic detection for QR (Menu Kit downloaded) and Screens (screen token exists).

## Surface Checklist

| Surface | Detection Method | Status Values |
|---------|-----------------|---------------|
| Google Business | Manual confirmation | ✓ Added / ⚠ Not added |
| Instagram Bio | Manual confirmation | ✓ Added / ⚠ Not added |
| WhatsApp Profile | Manual confirmation | ✓ Added / ⚠ Not added |
| Table QR | Auto (Menu Kit downloaded) | ✓ Installed / ⚠ Not set up |
| Digital Screens | Auto (screen token exists) | ✓ Active / ⚠ Not set up |
| Feedback QR | Auto (feedback enabled) | ✓ Active / ⚠ Not enabled |

## Key Files (Planned)

| File | Purpose |
|------|---------|
| `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx` | Presence checklist component |
| `src/components/mobile/components/PresenceMonitor.tsx` | Mobile version (shared logic) |
| `src/database/stores/index.ts` | Add `menuPresence` field read/write |

## Documents

| Doc | Audience |
|-----|----------|
| [menu-presence-monitor_spec.md](./menu-presence-monitor_spec.md) | Product/Business |
| [menu-presence-monitor_impl.md](./menu-presence-monitor_impl.md) | Engineering |
| [menu-presence-monitor_firebase.md](./menu-presence-monitor_firebase.md) | Engineering |
| [menu-presence-monitor_marketing.md](./menu-presence-monitor_marketing.md) | Marketing |
| [menu-presence-monitor_website.md](./menu-presence-monitor_website.md) | Website |
| [menu-presence-monitor_helpdoc.md](./menu-presence-monitor_helpdoc.md) | Help Center |
| [menu-presence-monitor_mobile-support.md](./menu-presence-monitor_mobile-support.md) | Mobile |

## Existing Infrastructure Reused

| System | File | Reused For |
|--------|------|-----------|
| Screen State | `src/database/campaigns/index.ts` | Auto-detect screen presence |
| Menu Kit state | Use MenuList data loader | Auto-detect QR deployment |
| Feedback setting | Store `feedbackEnabled` field | Auto-detect feedback QR |
| Store DAL | `src/database/stores/index.ts` | Persist manual confirmations |

---

**Created:** March 15, 2026
**Last Updated:** March 15, 2026
