# Customer Communication Kit

> **Status:** IMPLEMENTED — Feature Flag ON
> **Feature Flag:** `ENABLE_CUSTOMER_COMMUNICATION_KIT`
> **Route:** Section within Use MenuList page (`/use-menulist`) + dedicated mobile screen
> **Mobile:** Integrated into `MobileShareScreen`
> **Source:** ChatGPT Owner Features Session (March 15, 2026) → Cascade Review

> **Launch boundary:** Not current launch certification or deploy approval. This README is source-gated browser-local template evidence only; Customer Communication Kit release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:communication-kit-boundary`, browser/device output QA, WhatsApp/copy/share smoke where release scope requires it, print artifact review for related Menu Kit/printable output, and production-host smoke.

## What It Is

Pre-generated, ready-to-send message templates that owners copy-paste into WhatsApp, SMS, or any messaging app. Each template dynamically combines the menu link with store data (address, hours, name) so the owner never types the same information twice.

**Not** marketing automation. **Not** broadcast messages. **Not** campaigns. Just ready-to-paste responses to common customer questions.

## Why It Matters

Restaurant owners respond to the same questions dozens of times daily:

- "Send menu" → owner types link manually
- "Where are you located?" → owner types address
- "Are you open?" → owner types hours
- "What are today's specials?" → owner types items

The existing Use MenuList page has a basic "Copy Message" that pastes `{sharePrefix}\n{menuLink}`. Customer Communication Kit adds richer templates that combine multiple data points into polished, ready-to-send messages.

## Architecture Principle

**Pure UI + string templates.** Reads existing store data (name, address, hours, menu link) and generates message strings. Zero new collections. Zero new API routes. Zero Firebase cost. Failed copy/share/handoff paths log bounded diagnostics only; raw generated messages and raw public URLs must not be logged.

## Source Gate

Run `npm run verify:communication-kit-boundary` after changes to Customer Communication Kit, Use MenuList sharing, Menu Kit handoffs, printable asset downloads, or the legacy Physical Surfaces boundary. This source gate checks the desktop and mobile template paths, bounded copy/share diagnostics, browser-local Menu Kit and printable output wiring, and the legacy Physical Surfaces launch-boundary docs. Browser/device output QA and print artifact review remain separate release-certification gates.

## Message Templates

| Template | Content | Use Case |
| --- | --- | --- |
| **Quick Reply** | Current link only | Fast WhatsApp reply |
| **Send Menu** | Link + greeting | Customer asks "send menu" |
| **Official Business Page** | Business page, contact, hours | Customer needs the full business page |
| **Menu + Address** | Link + address + hours | Customer asks "where are you?" |
| **Are You Open?** | Today's open/closed status + link | Customer asks about hours |
| **Closed Now / Open Later** | Off-hours reply + link | Staff needs a quick off-hours answer |
| **Business Info** | Name + address + hours + phone + link | Customer asks for business details |
| **Share with Staff** | Current link + team note | Owner shares link with team |
| **Staff Daily Replies** | Link, address, and today's hours in one staff handoff | Staff answers menu, address, and hours questions consistently |
| **All Active Menus** | All active menu links | Multi-menu stores when more than one menu is active |

## Key Files

| File                                                                 | Purpose                       |
| -------------------------------------------------------------------- | ----------------------------- |
| `src/components/templates/main-app/useMenuList/CommunicationKit.tsx` | Message templates section     |
| `src/lib/communication/messageTemplates.ts`                          | Template generation functions |
| `src/components/mobile/components/CommunicationKit.tsx`              | Mobile version                |

## Documents

| Doc                                                                                            | Audience         |
| ---------------------------------------------------------------------------------------------- | ---------------- |
| [customer-communication-kit_spec.md](./customer-communication-kit_spec.md)                     | Product/Business |
| [customer-communication-kit_impl.md](./customer-communication-kit_impl.md)                     | Engineering      |
| [customer-communication-kit_firebase.md](./customer-communication-kit_firebase.md)             | Engineering      |
| [customer-communication-kit_marketing.md](./customer-communication-kit_marketing.md)           | Marketing        |
| [customer-communication-kit_website.md](./customer-communication-kit_website.md)               | Website          |
| [customer-communication-kit_helpdoc.md](./customer-communication-kit_helpdoc.md)               | Help Center      |
| [customer-communication-kit_mobile-support.md](./customer-communication-kit_mobile-support.md) | Mobile           |

## Existing Infrastructure Reused

| System               | File                                     | Reused For                  |
| -------------------- | ---------------------------------------- | --------------------------- |
| Store data           | `PlatformGlobalDataContext`              | Name, address, phone, hours |
| Menu link            | `src/lib/utils/slugify.ts`               | Menu URL generation         |
| OBP link             | `src/lib/obp/generateOBPUrl.ts`          | Official page URL           |
| Business type labels | `src/lib/menu-kit/businessTypeLabels.ts` | Category-aware wording      |
| WhatsApp share       | Use MenuList existing pattern            | `wa.me` deep link           |

---

**Created:** March 15, 2026
**Last Updated:** July 9, 2026
