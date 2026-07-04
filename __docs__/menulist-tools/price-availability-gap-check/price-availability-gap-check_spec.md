# Price Availability Gap Check - Specification

**Status:** Implemented V0 public tool and V1 owner readiness module
**Last Updated:** July 4, 2026
**Route:** `/tools/price-availability-gap-check`
**Local Source Gate:** `npm run verify:price-availability-gap-check`

## Owner Job

An SMB owner wants to know:

> Can customers understand what things cost, what is available, what is unavailable, and how to ask when pricing is quote-based?

This matters for restaurants, salons, clinics, repair shops, bakeries, rental businesses, tutors, service providers, and catalog-style SMBs. Customers often stop when prices are missing, variants are unclear, unavailable items are not marked, or the quote path is hidden.

## Product Fit

Price Availability Gap Check belongs inside MenuList Tools because it reveals a public truth/setup gap and routes the fix into one current MenuList customer source.

It should stay framed as source clarity, not pricing intelligence.

## V0 Public Free Tool

V0 accepts:

- business name
- city or area
- source type
- pasted menu, service list, catalog, package, rate-card, or price-list text
- pricing mode
- availability mode
- owner-selected clarity facts
- optional current customer link

V0 returns:

- overall status
- 3-9 check rows
- explicit evidence text
- one next action
- copy/download report
- optional consented follow-up through the existing contact route

Every row includes `evidenceText` that says what was checked.

V0 does not open links, verify external prices, check live inventory, inspect POS systems, inspect ordering providers, call AI providers, scan search results, or update external platforms.

## V1 Logged-In Owner Check

V1 uses actual MenuList store/project truth:

- selected/default project items
- item prices
- variant or attribute prices
- item availability flags
- current customer link readiness

It appears as an owner readiness module:

> Price and availability clarity

The module stays inside existing Business Health / Public Discovery surfaces and links to the menu editor. It does not create a new dashboard.

## V2 Paid Add-On Lane

V2 is justified only when recurrence, history, reporting, or multi-location operations create real value:

- monthly price and availability clarity report
- saved history
- multi-location price and availability consistency report
- agency/client export
- owner-approved managed repair

V2 must not become automated price scraping, competitive pricing, POS mutation, or inventory synchronization without a separate approved integration spec.

## Check Rows

| Check | V0 Evidence Source |
| --- | --- |
| Source material | Pasted owner text only |
| Price clarity | Pasted price/rate/cost/fee/starting-price hints and owner pricing mode |
| Currency or unit context | Pasted currency/unit/per-person/serving hints and owner selection |
| Variant or package prices | Pasted variant/package/size/combo hints and owner selection |
| Availability clarity | Pasted availability wording and owner availability mode |
| Unavailable items marked | Pasted sold-out/unavailable/seasonal/limited wording and owner availability mode |
| Quote or contact path | Pasted quote/contact/call/WhatsApp/booking/inquiry words and owner selection |
| Current customer link | Local URL-format check only |
| External price and availability inspection | Always not checked in V0 |

## Non-Goals

- no SEO score
- no AI visibility score
- no price competitiveness claim
- no external price verification
- no live inventory check
- no POS check
- no ordering-provider check
- no external platform mutation
- no report storage in V0
- no upload or file parsing in V0
