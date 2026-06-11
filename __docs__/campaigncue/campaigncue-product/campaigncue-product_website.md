# CampaignCue Product — Website Content

## Hero Section

- **Headline:** CampaignCue
- **Subheadline:** Campaign packs from real business data. Start with menus, services, photos, offers, source links, and local signals, then prepare channel-ready work with checks before use.
- **Primary CTA Text:** View product loop
- **Primary CTA Link:** `#workspace`
- **Secondary CTA Text:** See implementation boundary
- **Secondary CTA Link:** `#foundation`

## Implemented Public Shell

| Route | Purpose |
| --- | --- |
| `/__campaigncue` locally | CampaignCue public shell through product dev prefix. |
| `campaigncue.menulist.online` preview target | Preview host in deployment matrix; DNS/Vercel mapping still external. |
| `campaigncue.ai` production target | Production host in deployment matrix; domain purchase/DNS/Vercel mapping still external. |
| `/robots.txt` on product host | Static robots output for CampaignCue. |
| `/sitemap.xml` on product host | Static sitemap for the CampaignCue homepage. |

The shell is intentionally source-backed and product-loop oriented. It shows a campaign board preview, cue queue, output channels, trust checks, product loop, campaign studio scope, and implementation boundary. It does not expose real signup, billing, data connection, provider generation, or publishing actions yet.

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

CampaignCue starts with the business. It prepares a campaign pack from menu items, services, offers, photos, local context, and source inputs, then checks the pack before export, handoff, or any connected action.

## Benefits

| Benefit | Description | Visual |
| --- | --- | --- |
| Know what to promote | The home screen shows practical cues such as top item, open slots, new service, missing photo, stale price, or festival campaign. | Cue cards for restaurant and salon. |
| One campaign, many outputs | Generate WhatsApp, story, Google post, script, video, and ad handoff from one brief. | Channel output grid. |
| Source-checked before use | Price, offer, consent, source freshness, and claim issues appear before export, handoff, or any connected action. | Trust check panel. |
| Works without direct integrations | Copy, download, ZIP export, and manual posting stay available when Google, WhatsApp, or ad accounts are not connected. | Manual mode export sheet. |

## How It Works

1. **Add business data** — Connect MenuList, upload a menu or service list, or enter details manually.
2. **Choose a campaign cue** — Promote an item, fill booking slots, create a weekend offer, or prepare a local update.
3. **Use the campaign pack** — Review, fix trust issues, copy, download, schedule a manual task, hand off, or send for approval.

## FAQ

**Q:** Is CampaignCue part of MenuList?
**A:** No. CampaignCue is a separate product. MenuList can be used as a read-only source for restaurant data.

**Q:** Can salons use it?
**A:** Yes. Salons can upload service lists, add booking/WhatsApp details, and create booking campaigns without MenuList.

**Q:** Does it publish directly?
**A:** The current runtime is manual/export-first. Direct publishing stays disabled until provider credentials, capability checks, and policy controls are configured.

**Q:** Does it guarantee sales or ranking?
**A:** No. Reports separate campaign usage, channel execution, connected performance, and owner-reported outcomes.

## SEO Meta

- **Page Title:** CampaignCue | Local business campaign packs
- **Meta Description:** Create WhatsApp, social, Google, video, and ad campaign packs from real restaurant and salon business data.
- **OG Title:** CampaignCue
- **OG Description:** Campaign packs from real business data, checked before use.
- **Target Keywords:** local business campaigns, restaurant marketing content, salon marketing content, WhatsApp campaign pack, Google Business Profile posts
