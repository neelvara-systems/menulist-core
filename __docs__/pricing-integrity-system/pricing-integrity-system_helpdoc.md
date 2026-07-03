# Pricing Integrity System - Help Documentation

**Status:** Source-backed help copy boundary, not current launch certification

## Quick Summary

Edit prices in the MenuList editor and save. The saved menu is the source for customer menus, staff-facing views, configured Digital Screens refresh signals, and PDF downloads generated from the current menu data.

## What Updates Automatically

1. QR/menu links use the saved menu data after public cache refresh.
2. Staff-facing views use the saved menu data.
3. Digital Screens receive a content-version update when screens are configured for the store.

## PDF Downloads

PDFs are generated when you use the PDF/download action. The download uses the current menu data available in the editor. MenuList does not currently run a background PDF regeneration job after every price edit.

## If Prices Do Not Match

1. Confirm the editor save completed.
2. Reopen the customer menu link after the brief public cache refresh window.
3. If using Digital Screens, confirm the screen setup is active and allow the screen to refresh.
4. Generate a new PDF download from the current menu.
5. Contact support if a saved price still does not appear.

## Current Boundary

There is nothing separate to configure for price consistency. Background PDF regeneration and a dedicated Pricing Integrity engine are reserved implementation paths and are not active owner controls today.

Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, authenticated desktop/mobile price-change QA, public menu and PDF artifact QA, configured-screen QA where applicable, target deploy evidence, and production-host smoke.
