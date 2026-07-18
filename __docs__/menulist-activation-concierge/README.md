# MenuList Activation Concierge

**Status:** Local source complete; internal orchestration name only
**Last reviewed:** July 16, 2026

Activation Concierge is not a new route or public product. It is the existing starter setup handoff across create-menu success, the global starter banner, Use MenuList, Mobile Share, Search & Discovery, Presence Monitor, and Menu Setup Progress.

## Current contract

- Starter sources are `PUBLIC_MENU_ENTRY` and `MESSAGING_ONBOARDING`.
- Required activation target is two distinct allowlisted actions.
- Product actions such as copied link, QR/Menu Kit download, completed native share, or opened WhatsApp share are labeled **MenuList recorded**.
- Google/Apple/Bing/Instagram/WhatsApp profile placement is **owner confirmed external** through Presence Monitor.
- Only valid supported timestamps count. Malformed legacy values fail hidden.
- Removing an external confirmation removes its matching activation action in the same transaction.
- Acknowledged actions update current store context immediately, without an extra Firestore read and without crossing a store switch.

These signals prove an owner setup action, not customer use, third-party platform verification, scans, reach, or sales.

## Boundaries

- No standalone `/activation-concierge` page.
- No activation collection, event stream, API, listener, or scheduler.
- SignalDesk remains observer-only for MenuList truth and has no public MenuList route.
- Subscription/billing remains the existing Razorpay flow.
- Public proof publication remains unshipped and cannot be inferred from activation actions.

Previous narratives are preserved in [`_archive/pre-2026-07-16/`](./_archive/pre-2026-07-16/).
