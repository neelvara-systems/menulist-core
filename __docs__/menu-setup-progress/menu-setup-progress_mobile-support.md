# Menu Setup Progress - Mobile Support

**Status:** Local source complete; physical-device evidence pending
**Last reviewed:** July 16, 2026

Menu Setup Progress is a layer inside current MobileShell screens, not a route.

- Mobile Menu shows one next-step card when selected project truth is loaded; it does not show a percentage or all setup steps.
- Mobile Share shows it only while the published starter still needs placement.
- Mobile More shows one shortcut only after `MobileProjectsProvider` loading finishes and the owner can open the destination.
- Menu actions call the Menu tab; placement calls Share; public links/photos call Official Page inside More.
- The same summary/copy/status calculation is used on desktop and mobile.
- A 44px-or-larger current destination action remains the interaction boundary.
- A late sharing/presence acknowledgement cannot update another store after a store switch.

Device QA remains pending for store switching during an action, slow selected-project load, missing/stale selected project, first-run upload, publish-to-Share transition, second activation action suppression, and screen-reader focus after tab/sub-screen handoff.
