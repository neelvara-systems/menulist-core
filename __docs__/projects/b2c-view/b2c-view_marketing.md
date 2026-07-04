# B2C View - Marketing & Sales

**Feature:** Customer-Facing Digital Menu
**Audience:** Sales Team, Marketing, Partners
**Last Updated:** January 2026

---

## Current Launch Boundary

This marketing document is sales/source evidence for the customer-facing menu. It is not current launch certification or current production deployment approval. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, `npm run verify:menu-design-presentation-boundary`, public cache/deploy evidence, browser/mobile customer-menu QA, and target production smoke.

Performance, device-coverage, QR adoption, indexing, sharing, and customer-behavior claims need release-specific evidence before use in public or sales collateral.

---

## Elevator Pitch

### One-Liner

> "A mobile-friendly customer menu link with controlled brand presentation and no app download."

### 30-Second Pitch

> "Your approved menu can be published as a customer-facing link. Customers open it in a supported browser, and the menu uses controlled brand settings like mood, compatible layout, accent, and logo. Owners preview the customer menu before publishing, and release copy should only use performance or device-coverage claims after browser/mobile QA."

---

## Feature Narrative

### The Problem

Restaurant menus face practical digital challenges:

- **PDF menus:** Customers may need to pinch, zoom, or wait on large files.
- **Third-party apps:** Some menu experiences push customers into another app.
- **Generic templates:** Menu output can look disconnected from the business.
- **Unverified performance claims:** Load-time promises need target-device evidence.

### The Solution

MenuList customer-facing menu output:

- **Browser-based access:** Opens through a customer menu link in supported browsers.
- **Controlled brand fit:** Owners set mood, brand accent, logo, and compatible layout.
- **Preview before publish:** Owners check the customer menu before public changes go live.
- **Supported refresh path:** Saved/published changes refresh through the public menu cache path.
- **Mobile-oriented presentation:** The customer menu is designed for phone browsing and still needs target browser/mobile QA before release claims.
- **QR/share assets:** QR and link sharing use the supported share flow and require a ready public address.

### The Result

A mobile-friendly, brand-controlled digital menu from the approved and published project.

---

## Competitive Positioning

### vs. PDF Menus

| Aspect            | PDF          | MenuList B2C |
| ----------------- | ------------ | ------------ |
| Mobile experience | Pinch/zoom risk | Responsive customer menu layout |
| Load time         | Depends on file/device/network | Requires target QA evidence before quoting |
| Branding          | Static file  | Controlled brand settings |
| Updates           | Replace or re-share the file | Publish through supported menu/cache path |
| Search            | None in the file | Search behavior depends on implemented customer menu scope |

### vs. Third-Party Apps

| Aspect   | Apps              | MenuList B2C |
| -------- | ----------------- | ------------ |
| Friction | Download may be required | Opens in supported browser |
| Branding | App's branding    | Business brand settings |
| Cost     | Commission/fees may apply | Follows MenuList plan scope |
| Control  | Platform-dependent | Owner-approved menu source |

---

## Pitch Deck Outline

### Slide 1: The Problem

**"PDFs are not always comfortable phone menus"**

- Customers may need to zoom.
- Large files can be slower on weak networks.
- Static files need replacement after changes.

### Slide 2: The Solution

**"A customer menu link from the approved source"**

- No app download for supported browsers.
- Controlled menu mood and brand accent.
- Preview before publishing.
- Public refresh follows the supported cache path.

### Slide 3: How It Works

**"Open, browse, choose"**

1. Customer opens the QR/link.
2. The published customer menu loads through the supported public route.
3. Customers browse by the available menu navigation.
4. Item display follows approved project content and presentation settings.

### Slide 4: Customization

**"Brand fit without unsafe design freedom"**

- Menu mood and brand accent.
- Logo where configured.
- Compatible layout style.
- Device preview where available.

### Slide 5: Performance

**"Performance claims follow QA evidence"**

- Do not quote first-paint or full-load timing without target-run evidence.
- Do not claim offline support without verified runtime scope.
- Browser/mobile customer-menu QA is required before launch copy.

### Slide 6: Sharing

**"One customer menu link, supported share assets"**

- Shareable customer URL when the store has a ready public address.
- QR code download through the supported share flow.
- Social sharing copy should not imply external-platform sync or indexing guarantees.

### Slide 7: CTA

**"Preview the customer menu"**

- Check the customer view.
- Review the brand presentation.
- Publish approved output.

---

## Landing Page Copy Hooks

### Hero Headline

> **"Your approved menu, ready for customers to open."**

### Subheading

> "A mobile-friendly customer menu link with controlled brand settings and no app download for supported browsers."

### Key Benefit Bullets

- **Mobile-friendly** - Designed for phone browsing, with target QA required before performance claims.
- **No app download** - Opens through supported browsers.
- **Your brand** - Brand accent, logo, mood, and compatible layout settings.
- **Preview before publish** - Check the customer menu before public changes go live.
- **Supported sharing** - QR and link assets use the configured public address.

### Social Proof Placeholders

Do not use testimonials, QR adoption stats, load-time stats, or customer-behavior claims without approved evidence.

### CTA Copy Variants

- **Primary:** "Preview Customer Menu"
- **Secondary:** "See Menu Examples"
- **Subtle:** "Open Menu Preview"

---

## Sales Talking Points

### Objection: "We already have PDF menus"

**Response:** "PDFs can work, but customers may need to pinch and zoom on phones. The customer menu is designed for supported browser viewing and uses the approved menu source instead of a static file."

### Objection: "Customers prefer physical menus"

**Response:** "Physical menus can stay. QR and customer menu links are additional access paths, and printed/downloaded assets still need replacement after changes."

### Objection: "Will customers actually scan QR codes?"

**Response:** "Use venue-specific evidence before making QR adoption claims. The product supports QR/link access, but adoption depends on placement, staff guidance, and customer context."

### Objection: "Can we customize it to match our brand?"

**Response:** "Owners set the mood, brand accent, logo, and compatible layout. The controls stay constrained so the customer view remains readable."

---

## Approved Language

### Terms to Use

- "Digital menu"
- "Mobile-friendly"
- "Supported browser"
- "Customer menu link"
- "Preview before publish"
- "No app download"

### Terms to Avoid

- Instant customer-menu performance claims
- Fixed under-2-second load metrics
- Every-phone support claims
- "First paint" or "full load" metrics without target QA evidence
- "One click" sharing claims without target flow evidence
- Indexing guarantees without deployed metadata/indexing evidence
- "Replaces physical menus"
- "Revolutionary"
- "Best in class"

---

## Demo Script (Historical Draft)

### Setup

"Let me show you how customers open the published menu link."

### Load

"The customer menu opens in a supported browser. Use release QA before quoting load timing."

### Browsing

"Customers browse the available navigation, view items, prices, photos where configured, and item details where available."

### Branding

"This presentation uses the restaurant's configured mood, logo, brand accent, and compatible layout."

### Sharing

"The restaurant can use the supported share flow to get the customer menu link and QR asset once the public address is ready."

---

## Visual Assets Needed

| Asset               | Purpose               | Spec |
| ------------------- | --------------------- | ---- |
| Phone screenshot    | Customer menu on a supported mobile browser | High-res screenshot |
| QR/link demo        | Customer opens the published menu link | Short demo |
| Layout comparison   | Compatible layouts    | Side-by-side |
| Brand settings      | Before/after brand presentation | Comparison |
| Performance evidence | Target-device run when using timing claims | QA capture |

---

## Key Stats for Marketing

| Stat                   | Value                             | Source |
| ---------------------- | --------------------------------- | ------ |
| First Contentful Paint | Requires target-run evidence      | Target release QA |
| Full load time         | Requires target-run evidence      | Target release QA |
| Mobile users           | Do not use without current market evidence | Market evidence |
| QR code adoption       | Do not use without current market evidence | Market evidence |

---

_Document Status: Marketing evidence - not current launch certification_
