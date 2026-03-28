# Customer Communication Kit

> **Status:** ✅ IMPLEMENTED — Feature Flag OFF by Default
> **Feature Flag:** `ENABLE_CUSTOMER_COMMUNICATION_KIT`
> **Route:** Section within Use MenuList page (`/use-menulist`) + dedicated mobile screen
> **Mobile:** MobileShareScreen enhancement or new MobileCommunicationScreen
> **Source:** ChatGPT Owner Features Session (March 15, 2026) → Cascade Review

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

**Pure UI + string templates.** Reads existing store data (name, address, hours, menu link) and generates message strings. Zero new collections. Zero new API routes. Zero Firebase cost.

## Message Templates (v1 — 5 Templates)

| Template             | Content                                    | Use Case                                      |
| -------------------- | ------------------------------------------ | --------------------------------------------- |
| **Send Menu**        | Menu link + greeting                       | Customer asks "send menu"                     |
| **Menu + Location**  | Menu link + address + hours                | Customer asks "where are you?"                |
| **Quick Menu Reply** | Just the link (minimal)                    | Quick WhatsApp reply                          |
| **Business Info**    | Name + address + hours + phone + menu link | Customer asks "tell me about your restaurant" |
| **Share with Staff** | Menu link + note for staff to use          | Owner shares link with team                   |

## Key Files (Planned)

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
**Last Updated:** March 15, 2026
