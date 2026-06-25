# Printable Asset Templates - Spec

## Executive Summary

Printable Asset Templates turns MenuList print/download files into a dedicated owner workspace called **Assets**. The owner chooses what they need - table tent, single table card, counter sticker, entrance poster, feedback QR, flyer, gift certificate, front/back business card, ID card, invitation, postcard, product tag, campaign poster, full print menu, or complete Menu Kit - then chooses a finished template family and downloads the result. Editor-backed assets expose the 9-family catalog; full Print Menu exposes only its real unique PDF layouts until the full-menu PDF renderer owns all 9 families.

The default path is still not a blank design tool. Owners choose a finished template and download it. For non-menu printable assets, desktop also offers a governed **Customize in editor** path backed by the shared Creative Editor document model. Owners can adjust copy and layout when needed, while QR destination, scan-safe QR rendering, front/back business-card frames, and MenuList attribution policy stay protected. QR/link source layers remain locked in the editor document. MenuList attribution is not stored as an editable canvas layer; it is applied at export time when the existing plan policy requires it.

## Why This Matters

Printed assets are often the first physical proof of a business. For a small restaurant, salon, spa, bakery, clinic, or service counter, a QR card on the table or counter can make the business feel current or careless. The owner should not need a designer for this.

The current Print Assets screen proves the workflow. The next system must make the output selection feel like choosing from a professional catalog.

## Goals

| Goal | Meaning |
| --- | --- |
| Give owners real choice | Provide polished template families instead of one look, without showing duplicate output options. |
| Keep owner effort low | One asset type, one template, one download, with optional desktop customization only when the owner asks for it. |
| Keep outputs consistent | The selected style family can apply across all asset types. |
| Keep QR reliable | QR modules stay dark on white with required safe area. |
| Make QR surfaces actionable | Each QR surface should communicate one customer action, not just show a code. |
| Keep paired print assets aligned | Business Card front/back faces stay tied to protected print frames even after customization. |
| Keep Firebase cost low | Generation stays client-side using already-loaded data. |
| Keep template additions easy | Add a template by registering a family and editor-document renderer support, not by adding one-off UI. |

## Non-Goals

| Not Included | Reason |
| --- | --- |
| Blank free-form editor | Too much owner responsibility and support risk. Governed customization starts from a finished print template. |
| Font/color controls | Store color and logo already define brand identity. |
| Generated Storage uploads | Adds cost and cleanup burden. |
| Print ordering marketplace | Separate operational business, not needed for this feature. |
| Designer marketplace | Scope creep and support burden. |
| Public template browsing page | Owners need this inside dashboard, not a marketing gallery. |

## Target Owner Flow

1. Owner opens **Assets** from the dashboard navigation.
2. Owner selects an active project when the store has multiple projects.
3. Owner selects an asset type from the left rail.
4. Owner sees the supported template families on the right. Editor-backed QR/display/campaign assets show 9 families; full Print Menu shows the real unique PDF layouts.
5. Owner clicks one template family.
6. Desktop opens a modal and mobile opens a bottom sheet with the generated output preview already visible. Non-menu printable assets preview from the Creative Editor document renderer; Print Menu uses the generated menu PDF first-page image preview.
7. Owner downloads the selected template as PDF or image. Business Card image download creates separate front and back PNG files; its PDF stays paired for print handoff. Complete Menu Kit remains a ZIP bundle.
8. On desktop, owner can click **Customize in editor** for Table Tent, Single Card, Counter Sticker, Entrance Poster, Feedback QR, Flyer, Gift Certificate, Business Card, ID Card, Invitation, Postcard, Product Tag, or Campaign Poster. The template opens fullscreen with editable copy/layout and locked QR/link source layers. Business Card opens with front and back faces in one canvas, and edited image export downloads both side images. MenuList attribution is added only to the downloaded output when the existing plan policy requires it.
9. MenuList creates the file locally and downloads it.

## Route and Navigation

| Surface | Decision |
| --- | --- |
| Desktop primary route | `/assets` |
| Dashboard nav label | `Assets` |
| Nav placement | Immediately after `Use MenuList` |
| Compatibility route | `/use-menulist/print-assets` remains as a redirect or shell-compatible entry until old links are cleaned. |
| Mobile entry | Existing mobile More/Share flow opens an in-shell Assets screen, not a desktop route. |

## Asset Types

| Asset Type | Output | Primary Use |
| --- | --- | --- |
| Print Menu | PDF + image | Full paper menu for print shop or in-house printing. Image export saves the preview page. |
| Table Tent | PDF + image | Folded table display, readable from both sides. |
| Single Table / Counter Card | PDF + image | Acrylic holder, counter stand, wall clip, or single-sided table card. |
| Counter Sticker | PDF + image | Billing, pickup, service counter, reception desk. |
| Entrance Poster | PDF + image | Door, window, host stand, entrance board. |
| Feedback QR | PDF + image | Exit, counter, receipt stand, customer feedback prompt. |
| Flyer | PDF + image | A5 handout, delivery insert, campaign card, or local offer. |
| Gift Certificate | PDF + image | Voucher for gifts, credits, or prepaid offers. |
| Business Card | PDF + image | PDF keeps both 90 x 55 mm faces paired; image download creates separate front and back PNG files. |
| ID Card | PDF + image | 54 x 85 mm portrait owner, staff, or service-team card. |
| Invitation | PDF + image | A6 event, opening, workshop, or special invite. |
| Postcard | PDF + image | A6 landscape mailer for thanks, reminders, offers, or local drops. |
| Product Tag | PDF + image | Small item tag for retail, bakery, pickup, or counter products. |
| Campaign Poster | PDF + image | A4 offer poster for windows, counters, and local campaigns. |
| Complete Menu Kit | ZIP | All print and social files in one download. |

## Template Families

Each family is a finished layout system that can adapt to different business types and asset sizes. Asset screens must only show families that produce materially distinct output for that asset.

| ID | Owner Label | Visual Direction | Best Fit |
| --- | --- | --- | --- |
| `classic-luxe` | Classic Luxe | Cream paper, gold rules, formal name lockup, bordered QR panel. | Restaurants, cafes, bakeries, salons. |
| `executive-dark` | Executive Dark | Black/navy surface, gold accents, strong contrast, premium frame. | Fine dining, lounges, premium service businesses. |
| `botanical-heritage` | Botanical Heritage | Deep green/cream, leaf accents, warm serif title. | Restaurants, wellness, spa, organic or local businesses. |
| `modern-calm` | Modern Calm | White card, brand top band, soft accent pill, quiet footer. | Broad default for most SMBs. |
| `brand-banner` | Brand Banner | Large top brand strip, centered logo badge, strong business name. | Businesses with strong logo/color identity. |
| `soft-curve` | Soft Curve | Curved accent panels, light background, gentle section flow. | Beauty, wellness, boutique retail, family restaurants. |
| `qr-first` | QR First | Large scan area, minimal copy, high contrast. | High-traffic counters and compact placements. |
| `local-bold` | Local Bold | Big block title, brand-color banner, simple URL capsule. | Fast casual, takeout, quick-service, local shops. |
| `clean-utility` | Clean Utility | Low ink, neutral border, simple text, printer-friendly. | Budget print, black-and-white backup, utility locations. |

## Template Rules

| Rule | Requirement |
| --- | --- |
| Dynamic data only | Store name, branch, logo, color, URL, copy, currency, and plan state come from live inputs. |
| No fake placeholder content in output | Placeholder images/text may appear only in empty preview skeletons. |
| QR modules stay dark | Brand colors may frame the QR but must not recolor QR modules unless scan-safety tests pass. |
| QR quiet zone | Generated QR layers must use a four-module quiet zone; surrounding white panels are additional protection, not the only quiet zone. |
| Logo fallback | If no logo exists, render initials from the store name. |
| Long names fit | Template must split or fit long names without overlap. |
| Business type aware | Menu, service list, catalog, feedback, and scan copy use shared business-type labels. |
| Premium branding policy | Premium hides visible MenuList branding when the existing flag permits it; all other plans show attribution. |
| Output parity | Desktop and mobile downloads must use the same template ID and renderer. |
| No duplicate choices | If an asset renderer maps multiple families to the same output, the UI exposes only the unique supported family choices for that asset. |
| Governed customization | Desktop customization must start from an approved template document and keep QR/link source layers locked. MenuList attribution must stay out of saved editor documents and be applied only at export time when policy requires it. |
| Trust cue boundary | Use business identity, current-action copy, short link, and attribution. Do not add "official", "verified", "secure", "no spam", WhatsApp badge, or WhatsApp consent copy to normal MenuList page QR assets. |

## Branded QR Action Template Boundary

[Branded QR Action Templates](../branded-qr-action-templates/README.md) is the cross-feature doctrine for physical QR action files. Printable Asset Templates owns the standard scan-safe version:

- brand frame outside the QR pattern;
- business name/logo or initials;
- one clear CTA such as menu, order, feedback, booking, offer, reorder, event, or product info;
- visible short link where space allows;
- locked QR/link source layer;
- no generated scan ledger.

Measured WhatsApp campaigns belong to [QR WhatsApp Experiments](../qr-whatsapp-experiments/README.md). Artistic QR patterns, logo overlays inside the QR, and module distortion stay rejected until scan-regression coverage exists.

## Plan and Access

The base system should avoid creating a new decision burden:

| Plan | Access |
| --- | --- |
| Starter | Reliable templates: `modern-calm`, `qr-first`, `clean-utility`. |
| Pro | All supported template families for the selected asset and "Use this style for this download session". |
| Premium | All Pro access plus visible MenuList attribution removal through the existing premium branding policy. |

If plan gating is too much for first implementation, ship all supported families first and enforce only premium attribution removal. Do not block QR reliability or core output quality by plan.

## Market Research Notes

Sources reviewed:

- [MustHaveMenus QR Code Menu Table Card](https://www.musthavemenus.com/table-tent-template/qr-code-menu-table-card.html)
- [VistaPrint Table Tents](https://www.vistaprint.com/marketing-materials/table-tents/)
- [PosterMyWall QR menu template examples](https://id.postermywall.com/index.php/art/template/57f6557385da02d6c193efe9fbe09a61/qr-code-menu-template-design)
- [Canva menu templates](https://www.canva.com/menus/templates/)

Market pattern:

| Observed Pattern | MenuList Decision |
| --- | --- |
| Template libraries give many styles. | Provide 9 governed style families. |
| Print vendors focus on paper, stock, and uploaded designs. | Keep print instructions, but avoid becoming a print marketplace. |
| General design tools expose too many edit controls. | Give finished templates first; expose a governed editor only for practical copy/layout fixes. |
| QR/table tent products emphasize easy scan placement. | Keep QR size, contrast, short link, and print-safe placement non-negotiable. |
| Most tools are restaurant-heavy. | Make labels and copy business-type aware for wider SMB use. |

## Success Metrics

| Metric | Target |
| --- | --- |
| Owner can download one asset | Under 3 clicks after opening Assets. |
| Owner can customize one asset | Desktop owner can open, edit, and download a non-menu print asset without leaving Assets. |
| Template coverage | 9 families available in catalog; each asset displays only families with real output support. Extended assets use editor-backed layouts rather than programmatic PDF-only templates. |
| Runtime cost | No new Firestore reads/writes for normal generation. |
| Mobile parity | Mobile and desktop produce the same file for the same asset/template/project. |
| Scan reliability | QR contrast and safe-area verification pass for every template family. |
| No hardcoded business output | Verification catches Habibis or restaurant-only text in template renderers. |

## Open Questions

| Question | Current Decision |
| --- | --- |
| Should selected style persist across devices? | No for now. Use query/session state to avoid Firestore writes. |
| Should AI select the template? | Not required. Use deterministic local recommendation first; any paid advisor must be explicit and gated. |
| Should website get a big section? | No. Keep website mention light until implementation is live. |
| Should old Print Assets docs be merged? | No. This doc set stays separate until implementation is complete, then old docs can be cleaned. |
