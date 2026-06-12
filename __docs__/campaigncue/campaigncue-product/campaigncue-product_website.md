# CampaignCue Product — Website Content

## Hero Section

- **Headline:** CampaignCue
- **Subheadline:** Campaign packs from real business data. Start with menus, services, photos, offers, source links, and local signals, then prepare channel-ready work with checks before use.
- **Primary CTA Text:** View product loop
- **Primary CTA Link:** `#workspace`
- **Secondary CTA Text:** See safety boundary
- **Secondary CTA Link:** `#safety`

## Implemented Public Shell

| Route | Purpose |
| --- | --- |
| `/__campaigncue` locally | CampaignCue public shell through product dev prefix. |
| `campaigncue.menulist.online` preview target | Preview host in deployment matrix; DNS/Vercel mapping still external. |
| `campaigncue.ai` production target | Production host in deployment matrix; domain purchase/DNS/Vercel mapping still external. |
| `/robots.txt` on product host | Static robots output for CampaignCue. |
| `/sitemap.xml` on product host | Static sitemap for the CampaignCue homepage. |

The shell is intentionally source-backed and product-loop oriented. It shows a campaign board preview, cue queue, output channels, trust checks, product loop, campaign studio scope, and safety boundary. It does not expose real signup, billing, data connection, provider generation, or publishing actions yet.

Public website copy must stay owner-facing. Do not expose internal repo details, deployment target names, local routes, Firebase project ids, or implementation status tables on the product homepage.

## Branding Boundary

| Surface | CampaignCue-specific asset/state |
| --- | --- |
| Metadata | CampaignCue title, description, canonical, theme color, app name, and icon. |
| PWA manifest | `public/campaigncue.webmanifest`. |
| Browser icon | `public/campaigncue-icon.svg`. |
| Server loading state | CampaignCue loader mark and `CampaignCue is loading` label. |
| Client global loader | CampaignCue route/host detection and CampaignCue loader mark. |

## Problem Statement

Local businesses need regular posts, WhatsApp messages, Google updates, and ads, but most owners do not know what to promote today. Generic content tools still ask them to start with a blank prompt, choose formats, write copy, resize assets, and check every detail.

## Solution Statement

CampaignCue starts with the business. It prepares a campaign pack from menu items, services, offers, photos, local context, and source inputs, then checks the pack before export or handoff.

## Benefits

| Benefit | Description | Visual |
| --- | --- | --- |
| Know what to promote | The home screen shows practical cues such as top item, open slots, new service, missing photo, stale price, or festival campaign. | Cue cards for restaurant and salon. |
| One campaign, many outputs | Generate WhatsApp, story, Google post, script, video, and ad handoff from one brief. | Channel output grid. |
| Source-checked before use | Price, offer, consent, source freshness, and claim issues appear before export or handoff. | Trust check panel. |
| Export/download first | Text download, full-pack download, approval, scheduling, and manual posting stay available without connecting Google, WhatsApp, or ad accounts. | Export sheet. |

## How It Works

1. **Add business data** — Connect MenuList, upload a menu or service list, or enter details manually.
2. **Choose a campaign cue** — Promote an item, fill booking slots, create a weekend offer, or prepare a local update.
3. **Use the campaign pack** — Review, fix trust issues, download, schedule a manual task, hand off, or send for approval.

## FAQ

**Q:** Is CampaignCue part of MenuList?
**A:** No. CampaignCue is a separate product. MenuList can be used as a read-only source for restaurant data.

**Q:** Can salons use it?
**A:** Yes. Salons can upload service lists, add booking/WhatsApp details, and create booking campaigns without MenuList.

**Q:** Does it publish directly?
**A:** The current runtime is export/download-first. Direct publishing and social account connection are not active product flows; they require a separate future provider layer with credentials, capability checks, consent, quotas, and policy controls.

**Q:** Does it guarantee sales or ranking?
**A:** No. Reports separate campaign usage, manual channel execution, and owner-reported outcomes. Future provider metrics must be labeled separately when that layer exists.

## SEO Meta

- **Page Title:** CampaignCue | Local business campaign packs
- **Meta Description:** Create WhatsApp, social, Google, video, and ad campaign packs from real restaurant and salon business data.
- **OG Title:** CampaignCue
- **OG Description:** Campaign packs from real business data, checked before use.
- **Target Keywords:** local business campaigns, restaurant marketing content, salon marketing content, WhatsApp campaign pack, Google Business Profile posts
