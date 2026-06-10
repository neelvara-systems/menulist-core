# Design System — MenuList Main Website

**Status:** 🔒 LOCKED — Implementation Reference  
**Last Updated:** June 10, 2026

---

## 1. Design Principles

| #   | Principle                 | Rule                                                |
| --- | ------------------------- | --------------------------------------------------- |
| 1   | **Clarity first**         | Every element must be instantly understandable      |
| 2   | **Quiet authority**       | Feels like it's existed for 10 years                |
| 3   | **Breathing room**        | Whitespace is the primary design element            |
| 4   | **One direction**         | Linear top-to-bottom flow, no zig-zag               |
| 5   | **Consistency**           | Same spacing, same colors, same patterns everywhere |
| 6   | **Output over dashboard** | Show what customers see, not admin UI               |
| 7   | **Mobile first**          | Every decision starts from phone screen             |
| 8   | **Performance is trust**  | Fast loading = reliable = trustworthy               |

---

## 2. Color Palette

### 2.1 Core Colors

```css
:root {
  /* Backgrounds */
  --bg-primary: #ffffff; /* Main page background */
  --bg-subtle: #f8fafc; /* Alternating sections, card backgrounds (slate-50) */
  --bg-accent: #eff6ff; /* Subtle blue tint for emphasis sections (blue-50) */
  --bg-surface: #ffffff; /* Cards, controls, raised surfaces */
  --bg-elevated: #ffffff; /* Menus, dropdowns, overlays */
  --bg-input: #ffffff; /* Form fields */

  /* Text */
  --text-primary: #0f172a; /* Headlines, body text (slate-900) */
  --text-secondary: #475569; /* Supporting text (slate-600) */
  --text-muted: #94a3b8; /* Captions, meta text (slate-400) */
  --text-on-accent: #ffffff; /* Text on colored backgrounds */

  /* Brand */
  --brand-primary: #1e40af; /* Primary brand color (blue-800) */
  --brand-secondary: #0051d1; /* Interactive elements (blue-600) */
  --brand-light: #dbeafe; /* Subtle brand backgrounds (blue-100) */
  --brand-gradient: linear-gradient(
    90deg,
    #0051d1 0%,
    #0284c7 52%,
    #27a8e3 100%
  ); /* Brand mark/accent only */

  /* CTA */
  --cta-default: #0051d1; /* Button default (blue-600) */
  --cta-hover: #1d4ed8; /* Button hover (blue-700) */
  --cta-active: #1e40af; /* Button active (blue-800) */
  --cta-disabled: #93c5fd; /* Button disabled (blue-300) */

  /* Borders & Dividers */
  --border-default: #e2e8f0; /* Standard borders (slate-200) */
  --border-subtle: #f1f5f9; /* Very subtle separators (slate-100) */
  --border-focus: #0051d1; /* Focus ring color (blue-600) */

  /* Semantic */
  --success: #059669; /* Success states (emerald-600) */
  --warning: #d97706; /* Warning states (amber-600) */
  --error: #dc2626; /* Error states (red-600) */
}
```

### 2.1.1 Dark Theme Tokens

The public website supports system dark mode through the same website tokens. The dark theme uses dark gray surfaces, not pure black:

```css
:root.dark {
  --bg-primary: #121417;
  --bg-subtle: #171a1f;
  --bg-accent: #18212b;
  --bg-surface: #15181d;
  --bg-elevated: #1b2027;
  --bg-input: #171b21;
  --bg-sticky: rgba(18, 20, 23, 0.94);
  --text-primary: #f8fafc;
  --text-secondary: #d5dde7;
  --text-muted: #9aa7b8;
  --brand-primary: #8bc8ff;
  --brand-secondary: #6daefa;
  --brand-gradient: linear-gradient(
    90deg,
    #7aa7ff 0%,
    #38bdf8 48%,
    #5eead4 100%
  );

  /* Shared contrast panels for footer/proof/editorial dark surfaces */
  --panel-contrast: #15181d;
  --panel-contrast-raised: #1a1f27;
  --panel-contrast-soft: rgba(148, 163, 184, 0.08);
  --panel-contrast-border: rgba(148, 163, 184, 0.22);
  --panel-contrast-text: #f8fafc;
  --panel-contrast-secondary: #d5dde7;
  --panel-contrast-muted: #9aa7b8;
  --panel-contrast-accent: #a9cdfc;
  --panel-contrast-icon: #6daefa;
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    /* Same token values as :root.dark. */
  }
}
```

### 2.2 Color Usage Rules

| Do                                                            | Don't                                 |
| ------------------------------------------------------------- | ------------------------------------- |
| Use `--bg-primary` and `--bg-subtle` alternating for sections | Use gradients as section backgrounds  |
| Use `--brand-secondary` for links and interactive elements    | Use more than one accent color family |
| Use `--text-primary` for all headings                         | Use pure black (#000000) for text     |
| Use `--text-secondary` for supporting text                    | Use colored text for body content     |
| Use `--bg-accent` sparingly for one key section               | Use multiple colored backgrounds      |

Brand gradient rule:

- Use `--brand-gradient` only for the MenuList mark, auth-page product title, and deliberate headline highlight spans.
- Do not apply the gradient to website wordmark text, body copy, full headings, CTA buttons, cards, icons, or page backgrounds.
- Keep light mode as the default for light system preferences. Dark mode is a complete system-preference theme, not a browser-only inversion.
- The deeper blue-to-teal gradient is the approved light-mode accent because it starts with stronger authority on white and resolves into the lighter MenuList accent.
- Use the brighter blue-to-teal gradient only in dark mode where it has enough contrast and does not make the page feel like a flashy tech dashboard.
- Dark surfaces must use dark gray (`#121212` family), not pure black, so cards, headers, pricing, forms, and generated assets keep readable depth.
- Fixed utility overlays, sticky CTAs, footer preference controls, footer legal text, and dark product-flow panels must use theme tokens or verified high-contrast dark-panel colors, not hardcoded light surfaces.
- Footer, proof bands, discovery panels, phone frames, and other dark editorial panels must use the shared contrast-panel variables instead of one-off navy, cyan, white, or green treatments.
- Pricing controls that render before hydration, especially currency and billing controls, should use website CSS variables directly, not only Tailwind `dark:` variants.
- Brand display surfaces should render through `src/components/website/shared/BrandWordmark.tsx`; the canonical public website display name is `MenuList`.
- Website header/footer wordmark text is solid and inherits the surface text color; the logo mark carries the gradient.
- Keep body copy as `MenuList` unless the context explicitly names an internal AI/product platform setting or legal/account context.

### 2.3 Contrast Verification

All combinations must pass WCAG AA:

| Foreground             | Background | Ratio  | Pass?                   |
| ---------------------- | ---------- | ------ | ----------------------- |
| `#0F172A` on `#FFFFFF` | —          | 15.4:1 | ✅ AAA                  |
| `#0F172A` on `#F8FAFC` | —          | 14.5:1 | ✅ AAA                  |
| `#475569` on `#FFFFFF` | —          | 7.1:1  | ✅ AA                   |
| `#475569` on `#F8FAFC` | —          | 6.7:1  | ✅ AA                   |
| `#FFFFFF` on `#2563EB` | —          | 4.6:1  | ✅ AA                   |
| `#FFFFFF` on `#1E40AF` | —          | 7.2:1  | ✅ AAA                  |
| `#94A3B8` on `#FFFFFF` | —          | 3.5:1  | ✅ AA (large text only) |
| `#0F766E` on `#FFFFFF` | —          | 5.47:1 | ✅ AA                   |
| `#0284C7` on `#FFFFFF` | —          | 4.10:1 | ✅ AA (large text only) |
| `#2563EB` on `#FFFFFF` | —          | 5.17:1 | ✅ AA                   |

---

## 3. Typography

### 3.1 Font Stack

```css
font-family:
  "Inter",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  sans-serif;
```

### 3.2 Type Scale

| Token     | Element        | Weight | Desktop | Mobile | Line Height | Letter Spacing | Tailwind                               |
| --------- | -------------- | ------ | ------- | ------ | ----------- | -------------- | -------------------------------------- |
| `display` | Hero headline  | 700    | 56px    | 36px   | 1.1         | 0              | `text-[56px] md:text-[36px] font-bold` |
| `h1`      | Page titles    | 700    | 48px    | 32px   | 1.15        | 0              | `text-5xl md:text-3xl font-bold`       |
| `h2`      | Section titles | 600    | 36px    | 26px   | 1.2         | 0              | `text-4xl md:text-2xl font-semibold`   |
| `h3`      | Subsections    | 600    | 24px    | 20px   | 1.3         | 0              | `text-2xl md:text-xl font-semibold`    |
| `h4`      | Card titles    | 600    | 20px    | 18px   | 1.3         | 0              | `text-xl md:text-lg font-semibold`     |
| `body-lg` | Hero subtext   | 400    | 20px    | 17px   | 1.6         | 0              | `text-xl md:text-[17px]`               |
| `body`    | General text   | 400    | 16px    | 15px   | 1.6         | 0              | `text-base md:text-[15px]`             |
| `body-sm` | Small text     | 400    | 14px    | 13px   | 1.5         | 0              | `text-sm`                              |
| `caption` | Meta/labels    | 500    | 12px    | 12px   | 1.4         | 0              | `text-xs font-medium`                  |
| `button`  | CTA text       | 600    | 16px    | 16px   | 1           | 0              | `text-base font-semibold`              |
| `nav`     | Nav links      | 500    | 15px    | 15px   | 1           | 0              | `text-[15px] font-medium`              |

### 3.3 Typography Rules

1. **Maximum 3 lines per paragraph on mobile** — Break long text into shorter blocks
2. **Headings: max 2 lines on desktop, 3 on mobile** — Rewrite if longer
3. **No font below 13px** — Accessibility requirement
4. **Use SemiBold (600) for headings, not Bold (700)** — Except hero display
5. **Letter spacing stays 0 in runtime website styles** — Do not add negative tracking or wide-spaced labels
6. **Default letter-spacing on body** — Readability priority
7. **Color hierarchy:** Headlines = `--text-primary`, Body = `--text-secondary`, Meta = `--text-muted`

---

## 4. Spacing System

### 4.1 Base Unit: 4px

All spacing is multiples of 4px, aligned with Tailwind's default scale.

### 4.2 Section Spacing

| Context                         | Desktop                         | Mobile | Tailwind          |
| ------------------------------- | ------------------------------- | ------ | ----------------- |
| Hero top/bottom padding         | 80px top / 64px bottom on main homepage hero, 96px/56px on supporting page heroes | 48px | `py-20 pb-16` / `py-24 pb-14` |
| Standard section padding        | 80px                            | 48px   | `py-20 md:py-12`  |
| Between section groups          | 0 (background change separates) | —      | —                 |
| Between elements within section | 48px                            | 32px   | `gap-12 md:gap-8` |
| Between heading and content     | 24px                            | 16px   | `mb-6 md:mb-4`    |
| Between paragraphs              | 16px                            | 12px   | `mb-4 md:mb-3`    |

### 4.3 Component Spacing

| Context                     | Value   | Tailwind           |
| --------------------------- | ------- | ------------------ |
| Card padding                | 24-32px | `p-6` to `p-8`     |
| Card gap (grid)             | 24px    | `gap-6`            |
| Button padding (horizontal) | 24px    | `px-6`             |
| Button padding (vertical)   | 12px    | `py-3`             |
| Nav item gap                | 32px    | `gap-8`            |
| Footer column gap           | 48px    | `gap-12`           |
| Icon + text gap             | 8-12px  | `gap-2` to `gap-3` |

### 4.3.1 Footer Preference Controls

- Language and theme controls live in the footer, not the header, so the header stays focused on navigation, demo evaluation, upload, and account actions.
- Social links live under the company email in the footer brand column.
- The footer bottom row keeps copyright on the left, the public-source line centered, and compact Language / Theme controls on the right.
- Language uses a dropdown. Theme uses a compact three-option segmented icon control: Light, System, Dark.
- Footer controls must use footer-safe dark surfaces, visible borders, 40px-class tap targets where space allows, and localized labels.
- Do not add another theme switcher in the hero, header, or sticky CTA unless the website strategy changes.

### 4.5 Mobile Polish Rules

- Mobile interactive controls should use a 44px-class minimum tap box. Primary CTAs use 48px height where possible.
- Mobile section rhythm should prefer 40-44px vertical padding over desktop-scale breathing room.
- Dense mobile link groups may use two columns only when each item remains readable and tappable; otherwise fall back to one column.
- Mobile footer links and social links must be tappable targets, not raw text links.
- Avoid unsupported instant-propagation wording in mobile screenshots or locale overrides. Use approved-source language instead.
- Search/AI discovery proof must stay calm and caveated: use structured-source language, not ranking/citation promises or AI-hype styling.

### 4.4 Layout Widths

```css
--container-max: 1200px; /* max-w-7xl — outermost container */
--content-max: 1024px; /* max-w-5xl — grids, card layouts */
--reading-max: 720px; /* max-w-3xl — text blocks */
--narrow-max: 560px; /* max-w-xl — centered forms, CTAs */
```

**Container padding:**

- Mobile: `px-5` (20px sides)
- Tablet: `px-8` (32px sides)
- Desktop: `px-8` (32px sides, centered with max-width)
- Website routes use a website-scoped `border-box` baseline and `width: 100%` containers so inline padding, cards, and grids do not create mobile horizontal overflow.

---

## 5. Components

### 5.1 Buttons

**Primary (CTA):**

```
bg: --cta-default (#2563EB)
text: white
border: none
radius: 8px (rounded-lg)
height: 44px min (touch target)
padding: 12px 24px
font: 16px/SemiBold
hover: --cta-hover (#1D4ED8)
active: --cta-active (#1E40AF)
focus: ring-2 ring-blue-500 ring-offset-2
disabled: --cta-disabled (#93C5FD), cursor-not-allowed
transition: background-color 200ms ease
```

**Secondary (Ghost):**

```
bg: transparent
text: --text-primary (#0F172A)
border: 1px solid --border-default (#E2E8F0)
radius: 8px
height: 44px min
padding: 12px 24px
font: 16px/SemiBold
hover: bg --bg-subtle (#F8FAFC)
focus: ring-2 ring-blue-500 ring-offset-2
transition: background-color 200ms ease
```

**Text link:**

```
text: --brand-secondary (#2563EB)
underline: none (underline on hover)
font: inherit weight
transition: color 200ms ease
```

### 5.2 Cards

```
bg: --bg-primary (#FFFFFF) on subtle backgrounds, --bg-subtle on white backgrounds
border: 1px solid --border-default (#E2E8F0)
radius: 8px (`--ws-radius-lg`)
shadow: none or shadow-sm (0 1px 2px rgba(0,0,0,0.05))
padding: 24px (p-6)
NO hover transform
NO hover shadow change
```

### 5.2.1 Website Feature Cards

Use `src/components/website/shared/WebsiteFeatureCard.tsx` for public website proof cards, feature cards, setup/rollout cards, and supporting-page card grids.

Rules:

- Icon placement is top-right, not sometimes left and sometimes inline.
- Grid defaults to `ws-feature-card-grid`: `repeat(auto-fit, minmax(320px, 1fr))`, `gap: var(--ws-space-6)`, `max-width: 1120px`.
- Card body uses `ws-feature-card`: spacious padding, content-led row height, calm border/background, no hover movement, and compact stacked spacing so the subtitle and description read as one proof unit.
- Titles use 18px / 800 weight in normal cards and 16px in compact cards.
- Subtitles can use brand blue only when they clarify the card role; body copy stays `--ws-text-secondary`.
- Footer/proof lines sit behind a top border and should express the outcome, not repeat the description.
- Use the compact variant for dense supporting pages such as Features, Pricing decision cards, About principles, and Trust/Security pillars.
- Do not copy Answerlattice colors or product framing. MenuList can reuse disciplined spacing/card rhythm while preserving MenuList's official-source positioning.

### 5.2.2 Business Health Homepage Panel

Use `src/components/website/home/BusinessHealthSection.tsx` as the homepage owner-dashboard USP proof. The section should feel like a MenuList dashboard check, not a chatbot demo or decorative illustration.

Rules:

- The visual is a product-style panel built from website tokens, not a separate gradient hero, stock image, or unrelated SVG illustration.
- The panel must include status, freshness, a No action needed state, compact metrics, one owner question, and a source-backed answer.
- Proof cards use the shared compact `WebsiteFeatureCard` pattern so the section stays visually connected to the rest of the homepage.
- Green is used only for stable status and No action needed. Brand blue remains the action/context color.
- Mobile layout collapses to one column, keeps the status badge readable, and avoids showing chat UI as the main promise.
- Copy must not say AI assistant, chatbot, realtime sales, revenue optimization, prediction, competitor tracking, or autonomous menu editing.

### 5.2.3 Business Health Campaign Page

Use `src/components/website/features/BusinessHealthFeaturePage.tsx` for the dedicated public Business Health campaign page at `/features/business-health`.

Rules:

- Keep the page visually connected to the homepage Business Health panel through the same status, metric, and No action needed product-preview language.
- Hero copy must stay outside a card; the dashboard preview is the visual proof, not a generic illustration.
- Use a sticky stacked story section after the hero. It should follow the Answerlattice "From inputs to support surfaces" interaction pattern but use MenuList tokens, fonts, borders, and color behavior.
- The sticky story left rail has three tabs only: What it checks, Owner outcome, and Why owners can trust it.
- The right side uses three stacked sticky cards with compact product-proof panels. Do not turn the section into a generic tabbed content component or a carousel.
- On mobile, convert the left rail into a sticky horizontal tab row and collapse cards to one column.
- The public page must not use `/business-health` as its URL. That route belongs to the owner app.
- Copy must not say AI assistant, chatbot, realtime sales, revenue optimization, prediction, competitor tracking, or autonomous menu editing.

### 5.2.4 Shared Feature Campaign Pages

Use `src/components/website/features/FeatureDetailPage.tsx` for the dedicated public feature pages added in v3.6.34+:
Menu Import, Menu Content Prep, Featured Choices, Official Business Page, QR Menu and Links, Print-ready Kit, Owner Phone Dashboard, Menu Quality Validation, and Public Discovery.

The desktop Features dropdown should read as an elevated navigation surface, not a content card merged with the hero. v3.6.38 uses a viewport-centered top overview row, three-column feature grid, stronger shadow/border separation, and a compact bottom proof/CTA strip.

Rules:

- Keep each page focused on one owner outcome, not a complete feature checklist.
- Use the same split hero, proof preview, compact signal strip, sticky journey, support blocks, four proof cards, and final CTA rhythm across these pages.
- Use `src/components/website/features/FeatureDetailVisual.tsx` for the hero proof visual on generic dedicated feature pages. The visual must be code-native, theme-aware, responsive, and grounded in each page's existing locale copy and feature config. Do not add generic stock images, fake dashboards, or hardcoded English labels.
- Feature hero visuals must read as one composed proof canvas, not a card inside a card inside a browser mockup. Avoid duplicate marketing headlines inside the visual, avoid redundant bottom pill rows when the inner visual already communicates the same surfaces, and keep microcopy at readable label size on mobile.
- Use `src/components/website/features/FeatureDetailJourney.tsx` for the shared sticky story section. Desktop uses a left rail with stacked story cards; each story panel is one parent card with a top narrative row and a bottom full-width proof-card row so proof cards are not compressed. Desktop story height should stay viewport-aware but restrained with the shared `32rem -> 72vh -> 39rem` clamp; avoid oversized empty panels on tall displays. Avoid internal copy/proof dividers inside the story card. Mobile uses a sticky horizontal pill rail with one-column cards.
- Use the shared `AnimateOnScroll` reveal wrappers for the hero, preview, section headings, support blocks, proof cards, footer, and final CTA so dedicated feature pages match the homepage motion system. Prefer the named `hero`, `media`, `card`, `footer`, and `fade` presets over one-off reveal values unless a section has a clear interaction reason.
- Resource hubs, resource article bodies, related-resource blocks, industry proof grids, industry fit cards, industry resource links, and industry final CTAs must also use the shared reveal wrappers so long-form discovery pages do not feel static beside the homepage and feature pages.
- For Business Health, keep the sticky story layout reveal opacity-only. Do not apply parent translate transforms around the sticky stacked-card layout because the cards already manage their own scroll-state transforms.
- The header Features dropdown should link to these pages, but it should remain smaller and calmer than the Answerlattice product mega-menu. A compact proof/CTA panel is allowed when it reinforces one approved source without making MenuList feel like a broad software suite.
- Menu Quality Validation is a dedicated feature route and `/features` card destination, but it is intentionally not in the desktop dropdown in v3.6.39. The dropdown stays limited to the nine primary owner-evaluation paths.
- Do not use unsupported ranking, AI-placement, POS replacement, or full business-automation claims.

### 5.3 Owner Reassurance Placement

Use short reassurance copy only when it reduces a specific non-technical SMB owner doubt in context.

Approved reassurance ideas:

- Phone-first operation: owner can manage and publish from a phone browser or PWA.
- Owner approval boundary: nothing publishes until the owner reviews and approves it.

Design rules:

- Prefer chips, proof-strip items, FAQ answers, or page-specific card copy over repeated standalone helper lines.
- Do not repeat the same phone/PWA and review-before-publish lines under every supporting-page hero.
- Do not re-list public page, live menu, QR, shortcut, screens, PDF, and links in pricing/final CTA copy after the homepage has already explained the surfaces.
- Keep the icon small and calm; phone support uses brand blue, approval uses success green.
- Use `ws-support-hint`, `ws-support-hint__icon`, and `ws-support-hint__text` so icon and text wrap together on mobile.
- Do not stack more than two helper lines in one hero area.
- Do not use these helpers inside dense feature grids.
- Do not turn them into large banners unless a page has a specific trust problem.

### 5.4 Section Wrapper

```tsx
// Standard section structure
<section className="py-20 md:py-12 bg-white">
  {" "}
  {/* or bg-slate-50 */}
  <div className="max-w-7xl mx-auto px-5 md:px-8">
    {/* Section heading */}
    <div className="max-w-3xl mx-auto text-center mb-12 md:mb-8">
      <h2>...</h2>
      <p>...</p>
    </div>
    {/* Section content */}
    <div className="max-w-5xl mx-auto">...</div>
  </div>
</section>
```

### 5.5 Header

```
height: 64px (h-16)
bg: white (solid, no blur/transparency)
border-bottom: 1px solid --border-default
position: sticky top-0
z-index: 50
no background change on scroll
no shadow on scroll
no backdrop-filter / glass blur on public website routes
```

### 5.5 Brand Mark

- Website brand marks must render through `src/components/website/shared/LogoMark.tsx`.
- Website brand wordmarks must render through `src/components/website/shared/BrandWordmark.tsx` so the text, casing, and logo mark stay centralized.
- `LogoMark.tsx` must stay aligned with the official MenuList app icon in `public/icons/android-chrome-512x512.png` and the icon-only geometry in `src/components/atoms/animatedVerticalLogo/index.tsx`.
- Do not create one-off logo SVGs for the website header, footer, CTA blocks, or supporting pages.
- Do not overwrite files under `public/icons/` for website presentation changes; those files remain the app/PWA icon source.

### 5.6 Supporting Page Hero

Use `WebsitePageHero` for secondary pages that need the same official-source hierarchy as the homepage without recreating one-off hero styles.

```
eyebrow: uppercase, brand blue, 13px, bold, letter-spacing 0
headline: WebsiteHeadline with shared highlight treatment
subtitle: max 620px, 18px desktop / 16px mobile, secondary text
actions: WebsiteButton primary/ghost pair when needed
proof: WebsiteProofStrip when a page needs a short credibility row
```

Rules:

- Do not use viewport-width font scaling.
- Do not use negative letter spacing.
- Keep proof strips to three short claims.
- Keep owner-facing claims factual and tied to implemented product behavior.

### 5.7 Pricing Theme Bridge

The Pricing page may use Tailwind/shadcn utilities, but its CSS variables must remain visually aligned with the main website tokens:

- Background follows the same website light/dark theme tokens, not a separate campaign theme.
- Primary action color maps to the MenuList website blue family.
- Muted text must remain readable (`#475569` equivalent), not pale disabled-looking copy.
- Card and control radius stays at 8px unless a payment/runtime component requires its own internal style.

### 5.8 Icons

- Library: `react-icons/lu` (Lucide) — already standard
- Default size: 20px inline, 24px standalone, 32-40px section icons
- Default color: `--text-muted` or `--text-secondary`
- Active/emphasis: `--brand-secondary`
- Style: Outline only (no filled variants)
- Stroke width: default (2px)

### 5.9 Workflow Source Map

Use the homepage workflow source map when explaining how a current menu becomes public customer outputs.

Rules:

- Place it in `InteractiveWorkflowSection`, not the hero. The hero stays product/customer-output led.
- Use the official `LogoMark` at the center.
- Left stack shows source inputs: photo, PDF, existing menu link, typed text.
- Center keeps the owner-review gate visible.
- Right stack shows public outputs: official page, menu link, QR code, print/PDF.
- On mobile/tablet, use three rows: inputs spread horizontally, owner review centered, and outputs below. Keep separate mobile dotted paths aligned to those rows and anchored to card edges instead of reusing desktop path geometry. On narrow phones, collapse input/output cards to two columns and hide decorative path lines so labels remain readable.
- Theme behavior: light mode uses light surface/card/path tokens; dark mode uses dark surface/card/path tokens.
- Keep static dotted paths as the base layer. A subtle pulse overlay may travel from inputs into MenuList, pause while the existing center rings keep a light always-on pulse, and then move from MenuList toward outputs. Destination cards may briefly highlight only their existing border on pulse arrival. Motion must stay calm and must be disabled under `prefers-reduced-motion`.
- Use website tokens for all backgrounds, borders, lines, text, and icons so light and dark mode stay consistent.

### 5.10 Supporting Page Source Maps

Use supporting-page source maps for `/how-it-works` and `/multi-location` when a page needs a product-system explanation after the hero.

Rules:

- Do not animate the base dashed SVG lines. Supporting page diagrams should keep static dotted connectors and may use only the shared reduced-motion-aware pulse overlay.
- `/how-it-works` uses source inputs -> MenuList owner review -> customer surfaces.
- `/multi-location` uses approved master source -> linked outlet cards.
- On mobile/tablet, `/how-it-works` uses three rows with horizontal inputs, centered owner review, customer outputs grouped into two rows of three cards, and separate static dotted paths aligned to the row flow and card edges; narrow phones use two-column source/output cards with decorative paths hidden. `/multi-location` shows three outlet cards in the master-to-outlet flow. Desktop keeps the full diagram layouts.
- Supporting-page source maps must use the same theme behavior as the homepage workflow map. Light mode renders light diagram surfaces; dark mode renders the dark contrast treatment.
- Pulse behavior: `/how-it-works` pulses from source inputs into MenuList, pauses while the center rings keep a light always-on pulse, then moves from MenuList toward customer outputs. `/multi-location` pulses from the approved master toward outlet cards using the same `ws-map-pulse-flow` animated pulse-stroke pattern as the homepage source map, with all outlet paths synchronized. Do not use custom moving circle dots for `/multi-location`. Destination cards may use the same pulse color for a brief border-only highlight when the moving pulse reaches them.
- `/how-it-works` desktop output paths should follow the homepage source-map geometry: start inside the center core, roughly 40 viewBox pixels to the right of the core center, so the visible line appears to emerge from the logo/ring boundary instead of beginning outside the ring.
- Supporting-page ring ripples should be visible in light mode; keep darker-mode overrides calmer so the contrast-panel diagrams do not look noisy.
- Use the official `LogoMark` only where the diagram represents MenuList as the operating system, not as decoration.
- Use local flow tokens that resolve to light website tokens in light mode and `--ws-panel-contrast*` tokens in dark mode.
- Labels must be owner-readable: `Menu link`, `Official page`, `Saved shortcut`, `approved updates`.
- Avoid generic words such as `App`, `Web Page`, `node`, `sync engine`, or integration-style labels.

---

## 6. Grid System

### 6.1 Breakpoints

| Name    | Min Width | Tailwind Prefix |
| ------- | --------- | --------------- |
| Mobile  | 0px       | (default)       |
| Tablet  | 768px     | `md:`           |
| Desktop | 1024px    | `lg:`           |
| Wide    | 1280px    | `xl:`           |

### 6.2 Grid Patterns

**Feature grid (3 columns):**

```
Desktop: grid-cols-3 gap-6
Tablet: grid-cols-2 gap-6
Mobile: grid-cols-1 gap-4
```

**Two-column (text + visual):**

```
Desktop: grid-cols-2 gap-12 items-center
Mobile: grid-cols-1 gap-8 (visual below text)
```

**Surface tiles (6 items):**

```
Desktop: grid-cols-3 gap-6
Tablet: grid-cols-2 gap-4
Mobile: grid-cols-2 gap-3
```

---

## 7. Animation

### 7.1 Scroll Reveal

**No video. No SVG explainer animation. No hero background video. No animated journey diagrams.**

Default content visibility rule:

```css
.reveal {
  opacity: 1;
  transform: translateY(0);
}
```

Website content must never render hidden by default. Do not use `opacity: 0` as the initial state for public marketing sections, page heroes, proof cards, legal content, or conversion CTAs. Scroll-triggered motion is allowed only when the server-rendered and hydrated fallback remains readable without IntersectionObserver firing.

`AnimateOnScroll` and `AnimateStaggerChild` are reliability wrappers, not visibility gates. They must keep children visible even if browser animation, hash navigation, or mobile scroll observers fail.

Website heading primitives, including legacy shadcn website headings used inside pricing components, must render readable static content by default. Do not gate headings behind `useInView`.

The global app route template must not wrap pages in an initial hidden opacity state. Marketing content, public pages, and owner/customer routes must remain visible without waiting for Framer Motion hydration.

Mobile scroll reliability rule:

- Public marketing pages must not depend on owner-app Workbox caches. On platform domains, `/sw.js` is for owner/app routes only and must be unregistered from marketing routes; if an existing worker controlled the page, reload once after unregistering.
- Avoid fixed, transformed, or blurred controls during mobile marketing-page scroll. Mobile pages should use in-flow CTAs and the browser's native scroll behavior instead of floating repaint layers.
- Keep mobile sticky surfaces solid. Do not use `backdrop-filter` or glass blur on the public website header.

Footer ambient exception:

- The main website footer may use one low-opacity canvas veil behind content to give the dark revenue/footer surface more brand presence.
- Footer animation must be decorative only, sit behind readable surfaces, avoid external runtime dependencies, and honor `prefers-reduced-motion`.
- Do not reuse footer ambience in heroes, cards, product sections, or owner app surfaces.

### 7.2 Hover States

```css
/* Buttons */
transition: background-color 200ms ease;

/* Links */
transition: color 200ms ease;

/* Cards (if any hover needed) */
transition: border-color 200ms ease;
/* hover: border-color --brand-secondary */
```

### 7.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
  * {
    transition-duration: 0ms !important;
  }
}
```

---

## 8. Image Guidelines

### 8.1 Product Screenshots

- Format: WebP (PNG fallback for Safari < 14)
- Max width: container width (1200px)
- Aspect ratios: 16:9 for wide shots, 9:16 for mobile previews
- Frame: Subtle browser/phone mockup (clean, minimal)
- Shadow: `shadow-2xl` (for depth against page)
- Border-radius on container: `rounded-xl`
- Must be current product UI version

### 8.2 Diagrams

- Format: SVG (inline or imported)
- Colors: Use design system palette only
- Lines: 2px stroke, `--border-default` or `--brand-secondary`
- Text: Inter font, `--text-primary` or `--text-secondary`
- Background: transparent
- No drop shadows, no 3D effects

### 8.3 Performance

| Image Type        | Max Size   | Format         |
| ----------------- | ---------- | -------------- |
| Hero product shot | 200KB      | WebP           |
| Section visuals   | 100KB each | WebP           |
| Icons/diagrams    | 5KB each   | SVG inline     |
| Favicon           | 10KB       | ICO + SVG      |
| OG image          | 100KB      | PNG (1200×630) |

---

## 9. Dark Mode

**Decision: Support system dark mode across the public website without making dark the default brand mode.**

Rules:

- Light mode remains the default for light system preferences and for the main sales screenshots/asset direction.
- Dark mode follows the user's system preference or existing saved theme preference through the website `ThemeProvider`.
- Website routes must mount `WebsiteDocumentTheme.tsx` so the actual document body uses the same token-backed background/color as `.ws-page`; this prevents white overscroll in dark mode and restores previous body styles when leaving website routes.
- Do not use pure black (`#000000`) as the website background. Use the `#121212` dark-gray family for the main page, then slightly lighter gray surfaces for cards, dropdowns, pricing tables, forms, and drawers.
- The public theme control lives in the footer bottom row and must remain localized, keyboard accessible, and visually secondary. Do not duplicate it in the header, hero, or sticky CTA.
- Product screenshots and generated website assets may remain light because customer public pages can follow each business brand; do not force screenshots into dark mode unless the asset itself is intentionally dark.
- Dark mode must preserve MenuList's calm, owner-readable positioning. Avoid neon dashboard styling, heavy glow effects, and campaign-like black backgrounds.

Protected runtime note:

- Adding public website dark mode must not change pricing/payment, Razorpay, subscription, checkout, upload/extraction, or owner-dashboard behavior.

---

## 10. Reference Implementations

Sites that embody the design direction we're targeting:

| Site                     | What to Reference                                            | What to Avoid                              |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------ |
| **Shopify Enterprise**   | Typography, spacing, light background, benefit-driven layout | Too many sections, complex navigation      |
| **Stripe Checkout page** | Clarity, system diagrams, product visualization              | Too developer-focused, too abstract        |
| **Notion homepage**      | Friendly tone, real product UI, clean pricing                | Too playful for infrastructure positioning |
| **Linear**               | Bold typography, linear flow, minimal CTAs                   | Dark mode aesthetic, too dev-focused       |
| **Calendly**             | Simple value prop, clear CTA, professional feel              | Too feature-focused                        |

**Our unique differentiator:** None of these serve non-tech SMB owners in India. Our site must be all the clarity and authority of these references, but expressed in language and visuals a Mumbai restaurant owner would instantly understand.
