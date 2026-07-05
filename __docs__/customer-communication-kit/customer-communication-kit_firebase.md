# Customer Communication Kit — Firebase Cost Tracking

> **Version:** 1.2
> **Last Updated:** June 30, 2026

---

## Collections Affected

None. Zero new reads, zero new writes.

## Cost Estimate

| Scenario | Additional Reads | Additional Writes | Monthly Cost |
|----------|-----------------|-------------------|-------------|
| Any scale | 0 | 0 | **$0.00** |

## Why Zero Cost

All message templates are generated client-side from store data already loaded by `PlatformGlobalDataContext`. No additional Firestore operations. No new collections. No new documents.

The store document (name, address, phone, working hours) is already in memory when the Use MenuList page loads. Message templates are pure string concatenation.

## Diagnostic Hardening

Desktop copy and WhatsApp handoff failures now log `use_menulist_communication_kit_copy_failed` and `use_menulist_communication_kit_whatsapp_open_failed` through bounded Use MenuList diagnostics. Mobile copy, native share, and WhatsApp handoff failures log through mobile owner diagnostics. Copy actions wait for Clipboard API or acknowledged textarea fallback success before copied feedback, and failed copy diagnostics may add clipboard/fallback support booleans to the existing bounded template/message metadata. WhatsApp handoffs open with `noopener,noreferrer`; failed opens may record generated URL length but not the raw URL or message body.

Today-hours diagnostics are browser-local only. Invalid timezone fallback logs bounded `communication_kit_today_hours_timezone_fallback_failed` metadata, and malformed current-day time ranges log bounded `communication_kit_today_hours_range_invalid` metadata before hours copy is omitted.

This adds no Firestore reads/writes, Storage operations, Cloud Functions, API routes, durable artifacts, cache invalidations, indexes, rules, Firebase deploy requirement, Vercel deploy action, or owner-facing settings. Message generation, clipboard writes, native share, and WhatsApp handoff remain browser-local owner actions.

## Source Gate

`npm run verify:communication-kit-boundary` verifies that Customer Communication Kit remains browser-local, uses bounded copy/share diagnostics on desktop and mobile, stays wired through Use MenuList and Mobile Share, and keeps Menu Kit/Printable Asset/Physical Surfaces documentation aligned with the no-new-Firebase-cost boundary. It does not run browser/device QA, print artifact review, provider smoke, deploys, Firestore writes, or Storage writes.

## New Fields

None.

## New Collections

None.

## Firestore Indexes

None needed.

---

**Document Signature:** Firebase Cost Analysis
**Created:** March 15, 2026
