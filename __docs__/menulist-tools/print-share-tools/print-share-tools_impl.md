# Print & Share Tools - Implementation

**Last Updated:** July 4, 2026

---

## Implemented Scope

Five public, browser-local asset makers are implemented:

- `/tools/qr-poster-maker`
- `/tools/whatsapp-menu-status-maker`
- `/tools/holiday-hours-poster-maker`
- `/tools/customer-link-card-maker`
- `/tools/feedback-qr-card-maker`

No API route is added. No Firebase collection is added. No authenticated owner route is required.

---

## Core Files

| File | Role |
| --- | --- |
| `src/lib/public-asset-tools/printShareToolConfig.ts` | tool registry, dimensions, fields, flags, event prefixes |
| `src/lib/public-asset-tools/printShareToolTypes.ts` | input, check, status, report, and asset contract |
| `src/lib/public-asset-tools/printShareToolReport.ts` | deterministic report builder and creative-editor document builder |
| `src/lib/public-asset-tools/printShareToolRender.ts` | browser-local SVG, QR, PNG, PDF, and print helpers |
| `src/components/website/printShareTools/PrintShareToolPage.tsx` | shared public UI for all five tools |

---

## Creative Editor Boundary

The tools reuse the creative-editor/template system as a contract, not as a full public editor.

The report builder creates a `CreativeEditorDocument` using:

- `createCreativeEditorDocument`
- `buildCreativeEditorTextElement`
- `buildCreativeEditorRectElement`
- `buildCreativeEditorQrElement`
- `CREATIVE_EDITOR_SCHEMA_VERSION`

V0 does not expose the Fabric editor, save templates, load the owner template registry, or write generated assets to storage.

---

## Report Boundary

Every report includes:

- status
- summary counts
- check rows
- `evidenceText`
- public boundaries
- next MenuList action
- asset metadata
- creative-editor document metadata

The report states that public HTTPS URL format was checked locally and the destination was not fetched. The parser accepts bare public domains by normalizing them to HTTPS, rejects explicit `http://`, localhost, `.local`, private IP, raw IP, and credentialed URLs, and leaves invalid links out of the generated QR target so the asset falls back away from unsafe customer links.

---

## Output Boundary

The renderer creates:

- SVG preview
- PNG download
- PDF download
- browser print window
- text report download
- public shareable report link through `/tools/reports#r=...`
- visible readonly public report URL field for manual copy/open fallback

The generated report link uses an encoded hash fragment and does not send the report payload to a server.

---

## Feature Flags

Flags live in `src/config/features.ts`:

- `ENABLE_PUBLIC_ASSET_TOOLS`
- `ENABLE_PUBLIC_ASSET_QR_POSTER_MAKER`
- `ENABLE_PUBLIC_ASSET_WHATSAPP_MENU_STATUS_MAKER`
- `ENABLE_PUBLIC_ASSET_HOLIDAY_HOURS_POSTER_MAKER`
- `ENABLE_PUBLIC_ASSET_CUSTOMER_LINK_CARD_MAKER`
- `ENABLE_PUBLIC_ASSET_FEEDBACK_QR_CARD_MAKER`

Each route also checks `ENABLE_PUBLIC_TRUTH_TOOLS` because these are part of the public MenuList Tools acquisition layer.
