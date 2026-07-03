# Menu Presence Monitor

> **Status:** IMPLEMENTED — Embedded in owner desktop/mobile surfaces
> **Feature Flag:** `ENABLE_MENU_PRESENCE_MONITOR`
> **Route:** Embedded panel on Use MenuList (`/use-menulist`) and Business Settings > Search & Discovery
> **Mobile:** Embedded in MobileShareScreen and reachable from More > Search & Discovery
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

**Mostly manual confirmation + partial automatic detection.** Zero new collections for v1. Store-level field (`menuPresence`) on existing store document tracks confirmed surfaces. Starter activation actions use `starterActivationSignals` on the same store document.

Presence confirmations and starter activation signals are owner-local writes. `updateMenuPresence()` and `recordStarterActivationSignal()` must verify the passed store matches the active session store before writing either field.

The monitor now shows an activation-proof summary through the shared `buildStarterActivationSummary()` helper. It separates:

- MenuList-recorded owner actions such as copy, WhatsApp share, QR download, Menu Kit download, or native share;
- owner-confirmed external placements such as Google Business, Instagram Bio, and WhatsApp Profile.

## Surface Checklist

| Surface | Detection Method | Status Values |
|---------|-----------------|---------------|
| Google Business | Manual confirmation | ✓ Added / ⚠ Not added |
| Instagram Bio | Manual confirmation | ✓ Added / ⚠ Not added |
| WhatsApp Profile | Manual confirmation | ✓ Added / ⚠ Not added |
| Table QR | Auto readiness from published menu/share surface | ✓ Ready / ⚠ Not set up |
| Digital Screens | Auto (screen token exists) | ✓ Active / ⚠ Not set up |
| Feedback QR | Auto (feedback enabled) | ✓ Active / ⚠ Not enabled |

## Action-Done Model

| Action class | How MenuList knows | UI label |
| --- | --- | --- |
| Product action | MenuList records the action in `starterActivationSignals.actions.*`. | MenuList recorded |
| External placement | Owner marks the placement in the Presence Monitor; MenuList stores `menuPresence.*`. | Owner confirmed |
| Customer usage | Future scan/source/referrer data may support stronger proof. | Not part of P0 |

## Source Gate

Run `npm run verify:menu-presence-monitor-boundary` after changes to Presence Monitor, Use MenuList output wiring, Business Settings Search & Discovery, Mobile More Search & Discovery, `updateMenuPresence()`, `recordStarterActivationSignal()`, or starter activation proof. This gate checks source/docs parity for active-session store guards, typed write acknowledgement, bounded diagnostics, desktop/mobile route wiring, and mobile bottom-sheet behavior. Browser/device QA and live confirm/remove mutation testing remain separate release gates.

## Key Files

| File | Purpose |
|------|---------|
| `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx` | Presence checklist component |
| `src/components/mobile/components/PresenceMonitor.tsx` | Mobile version (shared logic) |
| `src/database/stores/index.tsx` | `menuPresence` field write and starter activation signal write |
| `src/lib/onboarding/starterActivation.ts` | Shared activation target and action-done evidence summary |

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
**Last Updated:** July 2, 2026
