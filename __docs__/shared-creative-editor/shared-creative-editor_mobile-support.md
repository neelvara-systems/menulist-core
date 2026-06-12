# Shared Creative Editor - Mobile Support

## Admission Test

| Gate | Decision | Reason |
| --- | --- | --- |
| Frequency | Partial pass | Owners may reuse assets often, but full design editing is not always daily. |
| Speed | Partial pass | Template choice and text edits can be quick; precision editing is slower. |
| Touch | Fail for full editor | Freeform layer dragging, resizing, and detailed property editing need precision. |
| Value | Partial pass | Downloading or light text edits can matter away from desk; full design work is desk-oriented. |

## Day-One Mobile Decision

The full Fabric editor is desktop-first. Mobile support is limited to responsive access with large controls, template choice, preview, simple property fields, and download/register actions. Freehand drawing, precision dragging, resizing, and multi-layer grouping remain desktop-first behaviors.

## Mobile Requirements For Current Implementation

- No sub-44px action targets.
- Controls wrap instead of overflowing.
- The layer list and property panel stack under the canvas on narrow screens.
- Product adapters must not route owner PWA tab actions through a desktop bypass unless the feature is explicitly outside the mobile PWA shell.
- Import controls must remain optional on mobile and cannot require direct provider connections.

## CampaignCue Mobile Position

CampaignCue workspace is a protected product app, not the MenuList owner PWA shell. Full creative editing remains desktop-first. CampaignCue mobile users can still open the editor, choose templates, inspect layers, preview, and download when viewport constraints allow, but precision canvas editing is not positioned as a mobile-first workflow.

## Future Mobile Path

- Product-specific template picker.
- Text-slot editor.
- Preview and download.
- Asset Library save/reuse.
- No freeform drag handles unless a touch-specific editor is built and verified.
