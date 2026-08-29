# Shared Creative Editor - Mobile Support

## Admission Test

| Gate | Decision | Reason |
| --- | --- | --- |
| Frequency | Partial pass | Owners may reuse assets often, but full design editing is not always daily. |
| Speed | Partial pass | Template choice and text edits can be quick; precision editing is slower. |
| Touch | Fail for full editor | Freeform layer dragging, resizing, and detailed property editing need precision. |
| Value | Partial pass | Downloading or light text edits can matter away from desk; full design work is desk-oriented. |

## Day-One Mobile Decision

The full Fabric editor is desktop-first. Mobile support is limited to responsive access with large controls, Review mode, template choice, campaign goal starters, drawer search, My Stuff upload entry, Styles presets, Brand Kit quick picks, business text chips, text placeholders, page switching, preview, selected-layer quick actions, simple property fields, keyboard shortcut reference viewing when a hardware keyboard is present, readiness checks, bundle/download/register actions, and autosave recovery prompts. Freehand drawing, precision dragging, resizing, keyboard-driven precision editing, and multi-layer grouping remain desktop-first behaviors.

## Mobile Requirements For Current Implementation

- No sub-44px action targets.
- Controls wrap instead of overflowing.
- The floating selected-layer toolbar must stay scrollable/wrapped on narrow screens and keep 44px minimum action targets.
- The contextual property toolbar, drawer search, Brand Kit actions, text placeholders, and page strip must wrap or scroll horizontally on narrow screens and keep 44px minimum action targets.
- My Stuff upload/recent controls and Styles presets must stack as large drawer cards on narrow screens.
- The keyboard shortcuts panel must collapse to a single readable column and never require precision canvas manipulation.
- Review mode must open the readiness panel, fit the output frame, and hide low-frequency rail/drawer space on narrow screens.
- Autosave recovery, readiness actions, and bundle/download actions must remain reachable without precision canvas manipulation.
- The right properties panel and Active Layers panel remain floating drawers on narrow screens so they do not resize the canvas; drawer content must scroll with large targets.
- Product adapters must not route owner PWA tab actions through a desktop bypass unless the feature is explicitly outside the mobile PWA shell.
- Import controls must remain optional on mobile and cannot require direct provider connections.

## CampaignCue Mobile Position

CampaignCue workspace is a protected product app, not the MenuList owner PWA shell. Full creative editing remains desktop-first. CampaignCue mobile users can still open the editor, enter Review mode, run download checks, search drawer items, choose templates, use campaign goal starters, add business text, switch pages, use selected-layer quick actions when viewport constraints allow, inspect layers, restore local drafts, preview, and download, but precision canvas editing is not positioned as a mobile-first workflow.

## MenuList Mobile Position

MenuList Printable Asset Templates does not mount the embedded Fabric editor on mobile. The owner stays in `MobileShell`, previews the same governed document, and downloads PDF/image output from the shared renderer. This preserves output parity without asking a phone user to perform precision layer work.

## Future Mobile Path

- Product-specific template picker.
- Text-slot editor.
- Preview and download.
- Asset Library save/reuse.
- No freeform drag handles unless a touch-specific editor is built and verified.
