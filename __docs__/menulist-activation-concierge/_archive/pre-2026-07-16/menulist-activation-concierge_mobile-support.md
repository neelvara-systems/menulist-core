# MenuList Activation Concierge - Mobile Support

**Status:** Mobile required
**Created:** June 24, 2026

## Mobile Admission

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Many first-time owners will complete setup from a phone. |
| Speed | Pass | Copy/share/QR/checklist actions are short. |
| Touch | Pass | Actions can be large, single-purpose buttons. |
| Owner value | Pass | Phone-first activation is the main use case. |

## Required Mobile Behavior

- Owner can see the live customer link.
- Owner can copy the link.
- Owner can start owner-initiated WhatsApp share.
- Owner can download or access QR/Menu Kit actions where already supported.
- Owner can mark Google/Profile, Instagram, and WhatsApp profile placement from mobile only when the existing Presence Monitor supports the confirmation.
- Mobile must show activation progress in plain language.

## UI Rules

- Use mobile-native components where inside the mobile app shell.
- Use at least 44px touch targets.
- Keep each action separate.
- Do not show dense dashboards.
- Do not hide safety copy behind hover-only tooltips.
- Do not add provider send controls.
- Do not add automated social posting controls.

## Starter Flow

Recommended order on mobile:

1. Copy link.
2. Share on WhatsApp.
3. Download QR or Menu Kit.
4. Mark external placement done only after owner actually places it.
5. Show activated state when two unique signals exist.

## SignalDesk Mobile Boundary

SignalDesk mobile remains observe-only/emergency-pause only. Activation Concierge is a MenuList owner/mobile workflow and must not relax SignalDesk mobile send/export/approve restrictions.

## Verification

Mobile QA must cover:

- small viewport success page;
- copy link action;
- WhatsApp share action;
- QR/Menu Kit access;
- Presence Monitor confirmations;
- two-surface activated state;
- no horizontal overflow;
- no inaccessible touch targets.
