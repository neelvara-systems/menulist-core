# Menu Card Export — Market And Print Research

**Status:** Research complete
**Reviewed:** June 1, 2026
**Purpose:** Convert web research into product decisions for the routed Menu Card Export feature.

---

## Executive Findings

The best version of this feature is not a larger `Download PDF` button. It is a routed print workflow that turns the current menu source into files an owner can actually use: home-printer PDF, WhatsApp PDF, print-shop packet, QR handoff, freshness history, and preflight checks.

The market already has strong template editors. MenuList should not compete by becoming another Canva. The stronger position is:

> Current menu truth to print-ready files, with fewer owner decisions and fewer stale print mistakes.

---

## Sources Reviewed

| Source | Relevant finding | MenuList decision |
| --- | --- | --- |
| [MustHaveMenus pricing/features](https://www.musthavemenus.com/menu/pricing.do) | Combines print, digital signage, web, template library, PDF/full-bleed downloads, brand assets, POS sync, QR codes, printing, and multi-location controls. | Treat print export as an operating surface, not a file utility. Support brand consistency, export history, QR, print-shop packet, and multi-location batch mode. |
| [Canva restaurant menu maker](https://www.canva.com/create/restaurant-menus/) | Emphasizes templates, mobile access, keeping menus updated, and print-ready PDF download. | Do not copy freeform editing; copy the simple owner path to updated printable output. |
| [Adobe Express menu maker](https://www.adobe.com/express/create/menu) | Emphasizes templates, brand colors/logos/fonts, images, download/share/print, and standard menu sizes. | Provide controlled brand tokens and use-case sizes, without arbitrary design editing. |
| [PosterMyWall menu maker](https://www.postermywall.com/index.php/l/menu-design) | Offers menu templates, saved menu item lists, brand kits, QR sharing, email/social/signage distribution. | Add saved export history and distribution presets; keep menu data sourced from MenuList instead of a duplicate item list. |
| [PosterMyWall menu item/POS article](https://www.postermywall.com/blog/2022/06/15/how-to-create-a-menu-with-postermywall/) | Shows the value of reusable item lists, sizes/add-ons, icons, and Square import. | Preserve variants/add-ons and dietary/icon metadata in the print source. Do not retype menu content inside export UI. |
| [PosterMyWall QR help](https://support.postermywall.com/hc/en-us/articles/40850702169357-How-do-I-share-my-design-via-QR-code) | QR can be downloaded/printed and used across print and digital surfaces. | QR should be a first-class export block with scan checks, not a decorative footer. |
| [iMenuPro QR menus](https://imenupro.com/qr-code-menus) | Strong emphasis on live updates, one QR for multiple menus, privacy, no trackers, and no pinch/zoom. | Printed PDF should link back to a mobile menu. Do not make QR open a print-style PDF on phones. |
| [iMenuPro printing help](https://help.imenupro.com/getting-started/menu-printing/) | High-resolution, lightweight PDFs can be printed in-house, uploaded, emailed, or sent to a local print shop. | Support distinct home-print, WhatsApp, and print-shop outputs. |
| [iMenuPro FAQ/pricing](https://imenupro.com/faq) | Differentiates content-aware auto-formatting from template/text-box tools. | Build a layout engine and template registry around menu data, not draggable boxes. |
| [VistaPrint crop marks and bleed](https://www.vistaprint.com/hub/crop-marks-explained) | Print quality depends on trim, bleed, safety lines, and crop marks; 0.125 inch / 3 mm is a common safety/bleed reference. | Print-shop preset must support bleed, crop marks, and safe-area validation. |
| [Adobe Acrobat printer marks](https://helpx.adobe.com/uk/acrobat/using/printer-marks-hairlines-acrobat-pro.html) | PDFs can carry trim, bleed, art, and media boxes used for print production. | Renderer interface should model print boxes explicitly, not only visual page size. |
| [DENSO WAVE QR module size](https://www.qrcode.com/en/howto/cell.html) | Larger modules are more stable; DENSO recommends at least 4 printer dots per module for stable operation. | Export preflight must verify module size and avoid overly dense QR codes. |
| [DENSO WAVE QR quiet zone](https://www.qrcode.com/en/howto/code.html/index.html) | QR codes require a four-module clear margin on all sides. | Template validation must reserve quiet zone around QR. |
| [DENSO WAVE QR error correction](https://www.qrcode.com/en/about/error_correction.html) | Higher error correction increases resilience but also increases symbol size; level M is common, Q/H fit dirtier environments. | Use short URLs and choose error correction by preset; default print QR should favor resilience without becoming too dense. |
| [Adobe PDF accessibility](https://helpx.adobe.com/uk/acrobat/using/create-verify-pdf-accessibility.html) | Accessibility checks include tagged PDF, reading order, and content tagging. | Do not ship screenshot-only PDFs. Preserve selectable text and plan tagged PDF checks before claiming accessibility compliance. |
| [PDF Association accessibility](https://pdfa.org/accessibility/) | Accessible PDF depends on tagged PDF standards such as PDF/UA. | Treat PDF/UA as a verification target, not a marketing claim until the renderer can prove it. |

---

## Competitive Lessons

### What To Copy

- Dedicated print workspace, not hidden utility action.
- A small set of high-quality style families.
- Print-ready outputs with paper sizes, safe margins, bleed/crop marks where needed.
- QR bridge from print to live menu.
- Reusable menu data so owners do not re-enter items.
- Export history and recoverable downloads.
- Multi-location support for operators with more than one location.
- Print-shop handoff bundle with instructions.

### What To Avoid

- Freeform template editor.
- Manual text boxes and drag/drop page placement.
- Separate menu item database inside the export tool.
- QR that opens a non-mobile print PDF.
- Screenshot-only PDFs with unselectable text.
- Public claims such as PDF/UA or professional print compliance before automated verification exists.
- Heavy server renderer dependency before runtime, font, image, and deployment constraints are proven.

---

## World-Class Feature Shape

| Layer | Capability | Owner value |
| --- | --- | --- |
| Route | `/use-menulist/menu-card-export` | Enough room for preview, preflight, presets, and history. |
| Presets | Home print, WhatsApp PDF, print-shop packet, table menu, takeaway insert, staff reference, multi-location batch | Owners choose the job, not technical settings. |
| Styles | Classic, Compact, Premium at launch; Takeaway, Folded, Photo, Drinks held until QA passes | Better output without template overload. |
| Brand tokens | Logo, brand color, typography pack, contact block | Consistency without design work. |
| Safe overrides | Keep category together, start category on new page, hide descriptions by category, compact category, include photos where safe | Solves real layout issues without turning into a design editor. |
| Preflight | Missing prices, long text, low-res photos, QR quiet zone/module size, contrast, bleed/safety, page overflow, stale menu, file size | Prevents expensive print mistakes. |
| QR bridge | Vector QR, short URL, scan-safe size, live menu destination, export-specific UTM/source label | Printed menu can lead customers to current menu. |
| Print-shop packet | PDF, optional home-printer PDF, print instructions, proof checklist, QR test note | Owner can send one clean package to a printer. |
| History | Stored export records, hash reuse, freshness state, regenerate action | Owner knows whether an old file still matches the menu. |
| Accessibility | Selectable text, logical reading order target, metadata, no image-only text | More usable PDFs and fewer compliance traps. |
| Batch | Generate the same preset for multiple locations | Reduces repeated work for multi-location owners. |

---

## Recommended Launch Scope

Ship as a complete architecture with flags, but expose only the stable surface first.

| Capability | Launch exposure | Reason |
| --- | --- | --- |
| Dedicated route | On | Core product decision. |
| Classic, Compact, Premium | On | Enough style range without weak templates. |
| Home print PDF | On | Common, low-risk output. |
| WhatsApp PDF | On | Important SMB workflow. |
| Preflight warnings | On | The biggest quality upgrade over a button. |
| QR bridge | On | Connects paper back to live menu. |
| Export history/freshness | On if backend ready; otherwise flag-gated | Valuable but requires Firestore/Storage. |
| Print-shop packet | Flag-gated | Needs bleed/crop/file-size validation. |
| Page images | Flag-gated | Adds storage and QA surface. |
| Multi-location batch | Flag-gated | Useful for operators, but needs careful data access and cost checks. |
| AI advisor | Pro/Premium only | Useful value-add when JSON-only, owner-applied, and kept outside final rendering truth. |

---

## Final Product Decision

Build Menu Card Export as a routed Print Menu workflow under Use MenuList. The route should feel like an operational print surface:

1. Select menu.
2. Choose job preset.
3. Choose controlled style.
4. Review preflight.
5. Preview pages.
6. Create PDF or packet.
7. Reuse or regenerate from history.

This is the long-term successor to PDF Surface. PDF Surface remains the lightweight predecessor until route parity is proven.
