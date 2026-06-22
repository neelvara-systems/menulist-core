# MenuList Marketing Distribution - Post-Launch Follow-Up Board

**Status:** Draft board definition  
**Created:** June 22, 2026  
**Owner:** Founder operates manually first  
**Related action:** MLD-L005  

---

## Purpose

This document defines the manual board MenuList should use after Product Hunt, founder posts, pilot outreach, or partner conversations.

It is not a CRM implementation and does not add code, Firestore collections, email automation, WhatsApp automation, or analytics instrumentation.

---

## Board Principle

The board should measure movement toward activation, not just interest.

Activation means:

```text
published MenuList customer link + two customer surfaces active within seven days
```

---

## Board Columns

| Column | Meaning | Exit condition |
| --- | --- | --- |
| New lead | Useful Product Hunt comment, post reply, intro, outreach reply, or partner lead | Fit checked |
| Fit check | Determine whether the business has a customer-facing list problem | Move to source requested or not fit |
| Source requested | Asked for current menu/service/package/catalog/rate list | Source received or stalled |
| Source received | Source material is available | Preview preparing |
| Preview preparing | MenuList setup or extraction is underway | Preview ready or blocked |
| Preview ready | Owner can review public version | Approved or changes requested |
| Changes requested | Owner requested corrections | Preview ready again |
| Approved | Owner approved public version | Published |
| Published | Customer link exists | One surface active |
| One surface active | Link used on one customer surface | Activated or stalled |
| Activated | Two surfaces active within seven days | Paid plan, partner intro, proof permission, or close |
| Partner lead | Agency/freelancer/setup partner | Partner conversation |
| Multi-location review | Business has multiple locations/branches | Consistency review |
| Stalled | No progress after follow-up limit | Close or future reminder |
| Not fit | No current-list problem or outside product scope | Close |

---

## Required Fields

| Field | Example |
| --- | --- |
| Lead ID | MLD-LEAD-001 |
| Business or partner name | Glow & Blade Studio |
| Category | Salon / spa |
| Lead source | Product Hunt / LinkedIn / founder outreach / partner |
| Current state | Source received |
| Source type | Photo service list |
| Public link | URL or pending |
| Surface 1 | WhatsApp |
| Surface 1 status | Active / pending / blocked |
| Surface 2 | QR |
| Surface 2 status | Active / pending / blocked |
| Next action | Send preview approval |
| Next action owner | Founder / Codex / partner |
| Next action date | 2026-06-25 |
| Proof permission | No / pending / yes |
| Notes | Plain operational notes only |

---

## Daily Review

During launch week, review daily:

1. leads stuck in source requested;
2. previews ready but not approved;
3. published links with only one surface;
4. partner leads awaiting founder response;
5. multi-location leads needing review;
6. objections that should update website, Product Hunt replies, or scripts.

---

## WIP Limits

Use limits to avoid collecting more leads than the setup flow can handle.

| State | Suggested launch-week limit |
| --- | --- |
| Source received | 10 active |
| Preview preparing | 5 active |
| Preview ready | 10 active |
| One surface active | 15 active |
| Partner lead | founder capacity only |
| Multi-location review | founder capacity only |

If limits are hit, pause outreach and finish activation work first.

---

## Board Views

| View | Use |
| --- | --- |
| Activation pipeline | All SMB leads by state |
| Product Hunt leads | Product Hunt comments and profile clicks |
| Partner leads | Agencies, freelancers, consultants |
| Multi-location leads | Branch/outlet opportunities |
| Stalled recovery | Leads with no next action |
| Proof candidates | Activated businesses with permission pending |

---

## Not Yet Automated

Do not build CRM code yet.

Consider runtime instrumentation only after the manual board proves which states matter:

- source submitted;
- preview ready;
- preview opened;
- approved;
- published;
- share link copied;
- QR downloaded;
- Menu Kit downloaded;
- placement checklist completed;
- second surface activated.

