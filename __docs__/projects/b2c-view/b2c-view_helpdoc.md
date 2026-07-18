# B2C View (Theme Builder) — Help Documentation

**Status:** Source-backed help copy; not current launch certification
**Last Updated:** July 16, 2026

## Quick Summary

The B2C Preview lets you choose a menu style, compatible layout, brand accent, and display settings before publishing the customer menu. Recommended styles show a small visual strip so you can recognize the expected customer-menu shape without opening another screen.

---

## How-To Guides

### How to change the menu style

1. Go to **Projects** and select your menu project.
2. Open the customer menu preview/design area.
3. Use **Recommended styles** when you want a quick starting point. Each card keeps the label short and shows a small visual cue for the customer-menu shape.
4. Or choose a menu mood such as Clean, Warm, Premium, Bold, or Fast.
5. Review the preview.
6. Save or publish when the preview matches the menu you want customers to see.

### How to set the brand accent

1. Open the design controls.
2. Choose an accent color.
3. Check the preview for readability.
4. Save or publish.

MenuList checks contrast for public menu colors so customer text stays readable.

### How to change the menu layout

1. Open the layout controls.
2. Choose one of the available layouts shown for the selected mood:
   - **List** for compact menu sections.
   - **Grid** for visual menus with item images.
   - **Card** for larger item cards.
3. Save or publish.

Some layouts may not appear for every mood. MenuList only shows compatible choices.

- Clean: List or Grid
- Warm: List, Card, or Grid
- Premium: List or Card
- Bold: Card or Grid
- Fast: List

### How to use category tabs

1. Open the display settings.
2. Turn category tabs on or off.
3. Save or publish.

Category tabs control customer navigation. They are separate from the selected layout.

### How to upload brand media

1. Open the brand media controls where available.
2. Upload the logo or background image.
3. Check the customer menu preview.
4. Save or publish.

Before publish, the owner preview may temporarily use the prepared local image. The public menu uses the uploaded secure image URL and avoids a fixed/parallax background on mobile.

### How option prices appear

When price display is on, customers see a base price or active option range in the menu list. Each active priced option is also shown before the customer opens the item. Inactive or blank-price options are omitted. Turning menu prices off hides price-driven presentation consistently.

---

## Troubleshooting

### My logo looks blurry

Upload a higher-resolution logo. PNG works best when the logo has a transparent background.

### A layout option is missing

The selected mood may not support that layout. Pick one of the layouts MenuList shows for the current mood.

### Preview looks different from the actual customer menu

The preview is close, but the customer menu is the final source. Scan your QR code on your phone after publishing and check the customer view.

### A large menu link or search result does not open

Publish the latest project and retry the current public link. Current menus keep all active items addressable for search, category navigation, and direct item links; if the issue remains, record the exact link and browser for support.

---

## Source Boundary

This help document is support-copy evidence for the current B2C design presentation source path, including visual preset preview behavior; it is not current launch certification. Release approval requires the External Certification Runbook, Digital Menu Output Constitution checks, `npm run verify:menu-design-presentation-boundary`, browser/mobile customer-menu QA, public cache/deploy evidence, and target production smoke.
