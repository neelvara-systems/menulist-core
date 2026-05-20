# Design System — MenuList Main Website

**Status:** 🔒 LOCKED — Implementation Reference  
**Last Updated:** May 2026

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

  /* Text */
  --text-primary: #0f172a; /* Headlines, body text (slate-900) */
  --text-secondary: #475569; /* Supporting text (slate-600) */
  --text-muted: #94a3b8; /* Captions, meta text (slate-400) */
  --text-on-accent: #ffffff; /* Text on colored backgrounds */

  /* Brand */
  --brand-primary: #1e40af; /* Primary brand color (blue-800) */
  --brand-secondary: #2563eb; /* Interactive elements (blue-600) */
  --brand-light: #dbeafe; /* Subtle brand backgrounds (blue-100) */
  --brand-gradient: linear-gradient(90deg, #2fd0c5 0%, #28ade8 48%, #2478ff 100%); /* Brand mark/accent only */

  /* CTA */
  --cta-default: #2563eb; /* Button default (blue-600) */
  --cta-hover: #1d4ed8; /* Button hover (blue-700) */
  --cta-active: #1e40af; /* Button active (blue-800) */
  --cta-disabled: #93c5fd; /* Button disabled (blue-300) */

  /* Borders & Dividers */
  --border-default: #e2e8f0; /* Standard borders (slate-200) */
  --border-subtle: #f1f5f9; /* Very subtle separators (slate-100) */
  --border-focus: #2563eb; /* Focus ring color (blue-600) */

  /* Semantic */
  --success: #059669; /* Success states (emerald-600) */
  --warning: #d97706; /* Warning states (amber-600) */
  --error: #dc2626; /* Error states (red-600) */
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
- Brand display surfaces should render through `src/components/website/shared/BrandWordmark.tsx`; the canonical display name is `MenuList AI`.
- Website header/footer wordmark text is solid and inherits the surface text color; the logo mark carries the gradient.
- Keep body copy as `MenuList` unless the context explicitly names the AI/product platform identity.

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

| Token     | Element        | Weight | Desktop | Mobile | Line Height | Letter Spacing | Tailwind                                              |
| --------- | -------------- | ------ | ------- | ------ | ----------- | -------------- | ----------------------------------------------------- |
| `display` | Hero headline  | 700    | 56px    | 36px   | 1.1         | 0              | `text-[56px] md:text-[36px] font-bold`                |
| `h1`      | Page titles    | 700    | 48px    | 32px   | 1.15        | 0              | `text-5xl md:text-3xl font-bold`                      |
| `h2`      | Section titles | 600    | 36px    | 26px   | 1.2         | 0              | `text-4xl md:text-2xl font-semibold`                  |
| `h3`      | Subsections    | 600    | 24px    | 20px   | 1.3         | 0              | `text-2xl md:text-xl font-semibold`                   |
| `h4`      | Card titles    | 600    | 20px    | 18px   | 1.3         | 0              | `text-xl md:text-lg font-semibold`                    |
| `body-lg` | Hero subtext   | 400    | 20px    | 17px   | 1.6         | 0              | `text-xl md:text-[17px]`                              |
| `body`    | General text   | 400    | 16px    | 15px   | 1.6         | 0              | `text-base md:text-[15px]`                            |
| `body-sm` | Small text     | 400    | 14px    | 13px   | 1.5         | 0              | `text-sm`                                             |
| `caption` | Meta/labels    | 500    | 12px    | 12px   | 1.4         | 0              | `text-xs font-medium`                                 |
| `button`  | CTA text       | 600    | 16px    | 16px   | 1           | 0              | `text-base font-semibold`                             |
| `nav`     | Nav links      | 500    | 15px    | 15px   | 1           | 0              | `text-[15px] font-medium`                             |

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
| Hero top/bottom padding         | 96px                            | 48px   | `py-24 md:py-12`  |
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

### 5.3 Owner Reassurance Helpers

Use short inline helper lines below primary CTA/caption areas when they reduce non-technical SMB owner doubt.

Approved helper patterns:

- Phone-first operation: owner can manage and publish from a phone browser or PWA.
- Owner approval boundary: nothing publishes until the owner reviews and approves it.

Design rules:

- Use caption-scale text with `--text-secondary` contrast and 600 weight.
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

- Background stays white/subtle, not a separate dark or campaign theme.
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

**Decision: No dark mode for the public website.**

Rationale:

- Our ICP (non-tech SMBs) predominantly uses light mode
- Light backgrounds signal professionalism and trustworthiness for this audience
- Reduces development complexity and testing surface
- Infrastructure products (Shopify, most of Stripe) use light mode for public pages
- The dashboard/app already supports dark mode — public site doesn't need it

**Note:** The app dashboard retains its existing dark/light toggle. This decision applies only to the public marketing website.

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
