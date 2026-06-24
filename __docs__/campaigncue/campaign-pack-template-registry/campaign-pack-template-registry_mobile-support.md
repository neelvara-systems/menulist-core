# Campaign Pack Template Registry - Mobile Support

## Mobile Relevance Decision

**Decision:** Partial mobile support.

Owners should be able to choose a recommended pack template, fill missing facts, download/copy handoff fields, and reuse a saved pack from a phone. Precise visual editing and platform template management remain desktop-first.

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners may need templates around daily offers, festivals, appointments, and quick promotions. |
| Speed | Pass for choosing/reusing; partial for editing | Choosing a template and confirming facts can be fast. Full editor layout changes are slower. |
| Touch | Pass for cards/forms; partial for canvas edits | Template cards, tags, and missing-input prompts work on touch. Pixel layout edits are not ideal. |
| Owner value | Pass | Owners often approve/share campaigns from their phone. |

## Mobile-Safe Actions

- View the category-relevant recommended template.
- Choose a business-use output intent such as source-to-channel pack, WhatsApp, Google, Instagram, print, staff, ad handoff, reuse old asset, or custom size.
- Search/filter already-loaded templates.
- Select an event tag such as Diwali, Christmas, New Year, birthday, or anniversary.
- Confirm missing facts.
- Save a completed campaign pack as reusable.
- Reuse a saved pack.
- Download/copy manual delivery fields.
- Record result after use.

## Desktop-Preferred Actions

- Platform template management.
- Precise editor layout changes.
- Detailed layer movement and alignment.
- Large pack-template seed review.
- Bulk category catalog QA.

## Data and Cost

Mobile must use the same category catalog read as desktop:

```text
resolved business category -> campaigncuePlatformPackTemplates/{businessCategory}
```

No mobile-only collection, listener, or API should be added.

## UI Rules

- Touch targets at least 44px.
- Show templates as outcome cards, not a dense gallery.
- Keep filters to short chips: event, channel, goal, format.
- Prefer business-use labels over format labels: "WhatsApp sales pack" instead of "Square post".
- Owner copy must say "Use this pack" or "Reuse this pack", not "instantiate template".
- Missing facts must appear before export.
- If template payload download fails, keep the current campaign pack untouched.

## Mobile Owner Copy

Use:

- "Use this pack"
- "Add missing detail"
- "Ready after review"
- "Save for reuse"
- "Reuse old poster"
- "Download pack"

Avoid:

- "template payload"
- "catalog doc"
- "schema version"
- "provider generation"
- "direct publish"
