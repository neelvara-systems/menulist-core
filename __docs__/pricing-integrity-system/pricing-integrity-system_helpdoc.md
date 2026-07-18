# Pricing Integrity System - Help

**Status:** Source-backed owner guidance, not current launch certification
**Last updated:** July 16, 2026

## Add or change a price

Open the menu item, enter the price as customers should see it, and save. You can use a number, a price range, or wording such as `Market Price`. Options such as Small/Large can each have their own price.

MenuList rejects unsafe or unusually long input. If a price is not accepted, remove emoji or formatting markup and keep the value within 40 characters.

## Bulk price changes

Percentage and add/reduce actions work only on items with one clear numeric price. Text prices, ranges, and missing prices are left unchanged so MenuList does not guess. Use the fixed-price action only when you intentionally want to replace those values.

## What customers see

- A normal item shows its saved price.
- An item with priced options shows the active option range or labels.
- Hidden/inactive options do not appear as current price choices.
- Customer links use saved menu truth after the normal cache refresh.
- Configured Digital Screens receive the existing refresh signal after a successful save.

## PDF downloads

Generate a new PDF after changing prices. The new file uses the current menu data. MenuList does not currently run a background PDF regeneration job after every price edit. A PDF already shared outside MenuList cannot update itself.

## If a saved price does not match

1. Confirm the save completed.
2. Reopen the customer link after the brief cache-refresh window.
3. Confirm the option is active if it is an option price.
4. Allow a configured screen to refresh.
5. Generate a new PDF.
6. Contact support if the saved value still differs.

This help page is not current launch certification. Release approval requires the production-readiness audit, External Certification Runbook evidence, `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, authenticated desktop/MobileShell QA, public menu and PDF artifact QA, configured-screen QA, target deploy evidence, and production-host smoke.
