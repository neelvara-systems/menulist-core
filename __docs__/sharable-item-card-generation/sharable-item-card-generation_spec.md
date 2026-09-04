# Sharable Item Card Generation Spec

## What

Owners can generate a PNG card for a single existing item from the Menu tab edit surface.

## Where

- Desktop: item edit modal footer.
- Mobile: item edit sheet image section.

## Why

Owners sometimes need a quick item image for WhatsApp or staff sharing. This belongs on the owner side because customers already see the item in the public menu and do not benefit from owner export controls.

## Rules

- Use only already-loaded editor data.
- Do not call a Next.js API route.
- Do not fetch Firestore for card generation.
- Do not write analytics counters for card generation.
- Do not add templates, captions, scheduling, platform selection, or customization.
- Do not show Copy Link or Download Card in public PDP.
- Project active named item options from the same localized source as the public menu.
- Keep unpriced options visible and show a price only when that option has one.
- Use neutral `Options` wording; never add `+` or imply that every option is an additional charge.
- Preserve the real description when present, then show up to three options plus the truthful remaining count according to the available card space.
