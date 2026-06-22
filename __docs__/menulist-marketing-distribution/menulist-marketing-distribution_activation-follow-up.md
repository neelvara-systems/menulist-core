# MenuList Marketing Distribution - Activation and Follow-Up

**Status:** Active operating plan  
**Created:** June 22, 2026  
**Owner:** Codex drafts, founder uses during pilot  
**Related actions:** MLD-F004, MLD-F005, MLD-A008  

---

## Purpose

This document defines how MenuList should track launch activation and follow up with owners after they enter the funnel.

It is docs-first. It does not add analytics code, CRM code, email automation, WhatsApp automation, Firestore writes, or external setup.

---

## Activation Definition

A launch business is activated when:

```text
published MenuList customer link + two customer surfaces activated within seven days
```

This keeps launch measurement practical. A public link alone is not enough; the link must reach customers where they actually look.

---

## Customer Surfaces

Count a surface only when the owner confirms it was actually used, placed, sent, or downloaded.

| Surface | Counts when | Evidence |
| --- | --- | --- |
| QR code | QR is printed, placed, downloaded, or tested by owner | Screenshot/photo/checklist note |
| WhatsApp | Link is sent in WhatsApp reply, group, status, or saved template | Owner confirmation or screenshot |
| Instagram | Link is placed in bio, story highlight, caption, or DM reply | Screenshot or owner confirmation |
| Google Business Profile | Menu/website link placement is completed or owner marks it done | Checklist note; no Google refresh promise |
| Website | MenuList link is added to business website/link page | Screenshot or URL |
| Print / counter material | Menu Kit/table/counter/poster asset is downloaded or placed | Download or owner photo |
| Staff replies | Staff start using the MenuList link instead of old screenshots/PDFs | Owner confirmation |
| Saved customer shortcut | Customer shortcut/customer app access is shared | Owner confirmation |
| Digital screen | Screen link/output is used in-store | Owner confirmation |

Do not count:

- planned placement;
- owner says "will do later";
- internal preview only;
- a link copied by Codex but not used by the business;
- external platform refresh that MenuList cannot verify.

---

## Funnel States

Use these states for pilot tracking, Product Hunt follow-up, partner leads, and assisted setup.

| State | Meaning | Next action |
| --- | --- | --- |
| Lead captured | Owner, partner, or commenter expressed interest | Ask for current list or route to `/create-menu` |
| Source requested | We asked for menu/service list/price list | Wait for source; send one reminder |
| Source received | Current list is available | Prepare or verify preview path |
| Preview preparing | MenuList is processing or setup is underway | Monitor for errors; do not promise exact timing |
| Preview ready | Owner can review public version | Ask for approval or corrections |
| Changes requested | Owner wants corrections | Apply corrections or route to owner review |
| Approved | Owner approved the public version | Publish or guide publish |
| Published | Customer link exists | Start two-surface checklist |
| One surface active | Link is used on one customer surface | Ask for second placement |
| Activated | Two surfaces active within seven days | Ask for paid plan, partner intro, or permissioned proof |
| Stalled | No progress after expected next step | Send plain recovery message; stop after sensible limit |
| Not fit | Business does not have a public list need | Close without forcing |

---

## Tracking Sheet Columns

Use a simple sheet or board first. Do not build a CRM until the process is proven.

| Column | Example |
| --- | --- |
| Business name | Glow & Blade Studio |
| Category | Salon / spa |
| Source type | Service list photo |
| Lead source | Founder outreach / Product Hunt / partner |
| Funnel state | Preview ready |
| Public link | URL or pending |
| Surface 1 | WhatsApp |
| Surface 1 status | Active / pending / blocked |
| Surface 2 | Instagram |
| Surface 2 status | Active / pending / blocked |
| Activation date | 2026-06-25 |
| Blocker | Needs owner approval |
| Next action | Send approval nudge |
| Next action date | 2026-06-26 |
| Proof permission | No / pending / yes |
| Notes | Keep plain; no sensitive data |

---

## Follow-Up Rules

1. Keep messages short and owner-readable.
2. Do not send bulk outreach without consent and compliance review.
3. Do not use pressure language or fake urgency.
4. Do not mention ranking, revenue, Google refresh, AI citations, or guaranteed customer growth.
5. Stop follow-up when the owner says no, asks to stop, or clearly is not a fit.
6. Ask for one next action at a time.

---

## Follow-Up Templates

### Source Requested

```text
Please send the current menu, service list, package list, catalog, or price list you want customers to see.

We will use that as the source for your public customer link.
```

### Source Received

```text
Got it. We will prepare the customer-facing version from this source and send it back for review before anything is treated as public.
```

### Preview Ready

```text
Your preview is ready to review.

Please check prices, names, services/items, hours, and customer actions. If anything is wrong, send the corrections before publishing.
```

### Changes Requested

```text
Understood. We will update the preview from your corrections and keep the public version on hold until you approve it.
```

### Approved / Publish Next

```text
Approved. The next step is to publish the customer link and place it where customers already look.

Recommended first two surfaces: WhatsApp and QR, or Instagram and QR.
```

### One Surface Active

```text
The link is active on one customer surface.

To complete setup, place the same link on one more surface: QR, WhatsApp, Instagram, Google profile, website, print material, or staff replies.
```

### Activated

```text
Your public customer link is now live on two customer surfaces.

Keep using the same link when the list changes, so customers are not sent old PDFs, screenshots, or rate cards.
```

### Stalled Preview

```text
Quick check: do you want to continue with this MenuList preview?

If yes, send the corrections or approval. If not, we can close this setup.
```

### Partner Lead

```text
MenuList can help you turn client menus, service lists, catalogs, and price lists into approved public links, QR assets, and rollout material.

The first fit check is simple: does the client have a current list customers need to see before calling, visiting, booking, ordering, or sharing?
```

### Multi-Location Lead

```text
For multiple locations, the first useful check is whether each branch is showing the same current list, or whether prices, names, hours, and actions differ across public links.

We can review the current public list setup before changing anything.
```

---

## Product Hunt Follow-Up Routing

| Product Hunt signal | Route |
| --- | --- |
| SMB owner asks "Can I use this?" | Ask for current list or route to `/create-menu` |
| Agency/consultant asks about clients | Send partner lead template |
| Multi-location operator asks about branches | Send multi-location lead template |
| SEO/AI question | Use claim-boundary reply from Product Hunt asset pack |
| Feature comparison question | Answer factual scope; do not attack competitors |
| Investor/press question | Founder handles |
| Generic praise only | Thank and invite specific feedback |
| Off-topic / not fit | Close politely |

---

## Runtime Instrumentation Later

If the manual process proves useful, code instrumentation can be considered later for:

- source submitted;
- preview ready;
- preview opened;
- approved;
- published;
- QR downloaded;
- share link copied;
- Menu Kit downloaded;
- placement checklist completed;
- second surface activated.

Do not add these events until the exact manual workflow is stable enough to justify code.

---

## Done Criteria

This document completes the docs-first version of:

- MLD-F004: two-surface activation tracking;
- MLD-F005: follow-up states;
- MLD-A008: follow-up templates.

Runtime tracking, automation, CRM setup, and actual follow-up execution are not done.
