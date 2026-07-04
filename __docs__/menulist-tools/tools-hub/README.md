# Tools Hub - Documentation Hub

> **Feature:** MenuList Tools Hub
> **Route:** `/tools`
> **Status:** Implemented static website index
> **Last Updated:** July 4, 2026

---

## Purpose

Tools Hub is the public index for MenuList-owned free tools. It helps SMB owners choose the right public business truth check without turning MenuList into a generic SEO, ranking, reputation, or engagement toolbox.

The route groups current tools by owner job:

- Public Truth
- Menu / Service Clarity
- Customer Action Readiness
- Print & Share Assets
- Trust / Setup

The hub does not run a report. It routes owners to the individual tool routes that already preserve their own evidence text, source policy, and report boundary.

---

## End-User Access

End users can reach the public Tools Hub without logging in through:

- direct public route: `/tools`
- desktop header: Resources dropdown -> MenuList Tools
- mobile header: hamburger menu -> Resources -> MenuList Tools
- footer: Start column -> MenuList Tools

`npm run verify:public-truth-tools` protects these access points so the hub cannot drift out of desktop navigation, mobile hamburger navigation, or footer navigation silently.

---

## Version Ladder

| Lane | Shape | Tools Hub role |
| --- | --- | --- |
| V0 | Public free tool / lead magnet | Indexes free browser-local tools and routes owners to a specific check |
| V1 | Logged-in MenuList owner check | Points the same problems toward Business Health, Public Discovery, OBP readiness, QR/share readiness, or setup paths |
| V2 | Paid add-on behavior | Can later surface recurring monitor, history, multi-location, and agency report packaging after those modules exist |

Tools Hub is V0 public website infrastructure. It is not a paid add-on by itself.

---

## Current Tool Groups

| Group | Tools |
| --- | --- |
| Public Truth | Public Truth Check, Business Facts Copy Pack, Customer Question Coverage Check, Customer FAQ Reply Pack, One Customer Link Preview, Social Bio Link Consistency Check, Google Profile Basics Checklist |
| Menu / Service Clarity | Menu Readability Check, Price Availability Gap Check, Menu PDF Cleanup Check |
| Customer Action Readiness | QR Link Health Check, Booking Inquiry Readiness Check, WhatsApp Action Link Check, WhatsApp Reply Pack, Hours Check |
| Print & Share Assets | QR Poster Maker, WhatsApp Menu Status Maker, Holiday Hours Poster Maker, Customer Link Card Maker, Feedback QR Card Maker |
| Trust / Setup | Photo Gap Check |

---

## Boundary

Tools Hub is a static index:

- no report builder
- no external fetch
- no crawler
- no Google/social/profile inspection
- no AI/search provider call
- no report storage
- no contact handoff form
- no Firebase read/write
- no ranking, citation, or external-platform update promise

Individual tools keep their own V0/V1/V2 contracts.

---

## Source Gate

```bash
npm run verify:tools-hub
```

The aggregate family gate also includes it:

```bash
npm run verify:public-truth-tools
```
