# FINAL Approach — MenuList Main Website (menulist.ai)

**Status:** 🔒 LOCKED — This is the Single Source of Truth  
**Sources:** ChatGPT strategic conversation (Session 1 + Session 2) + Cascade codebase analysis + Web research (2025-2026)  
**Last Updated:** February 2026

---

## Executive Summary

Complete rebuild of menulist.ai public website. The existing site positions MenuList as a "SaaS AI menu tool" with 16+ sections, feature-heavy copy, startup gradients, and developer-focused messaging. The new site positions MenuList as **public menu infrastructure** — calm, authoritative, clear, built for non-tech SMB owners.

**One sentence:** A clean, professional website that makes a non-tech restaurant owner in Mumbai immediately understand what MenuList does, trust it, and create their menu — all within 2 minutes.

---

## Part 1: Strategic Foundation

### 1.1 Positioning (LOCKED)

**MenuList is NOT:**

- A digital menu tool
- An AI menu builder
- A SaaS marketing platform
- A restaurant-only product

**MenuList IS:**

- A public menu infrastructure system
- The official system for your public menu and business information
- Where your menu lives

**Canonical entity definition (use everywhere, never rewrite):**

> "MenuList is a system that manages official menus and public business information across all customer-facing surfaces."

### 1.2 Target Audience

**Primary:** Non-tech SMB owners in India

- Restaurant owners, café operators, bakery managers, cloud kitchen operators
- Multi-outlet chain decision makers
- Zero technical knowledge assumed
- Browse primarily on mobile (60%+ on phone)
- Price-sensitive but value "official" and "professional"

**Secondary (future):** Global SMBs with public-offer businesses

### 1.3 Website's 4 Strategic Jobs

| Job                       | Success Test                                                 |
| ------------------------- | ------------------------------------------------------------ |
| **Establish category**    | Visitor thinks "system" not "tool"                           |
| **Create inevitability**  | "If I run a serious business, I'll need this"                |
| **Filter customers**      | Repels freebie seekers, attracts premium operators           |
| **Convert to onboarding** | Single clear path: Understand → Trust → Create your MenuList |

### 1.4 Conversion Psychology for Our ICP

Non-tech SMB owners convert when they feel:

1. "I understand what this does" (clarity)
2. "It seems simple" (no complexity fear)
3. "It looks serious" (professional design = trust)
4. "It won't break" (stability signals)
5. "It's for businesses like mine" (identity match)

They do NOT convert from: brand storytelling, vision statements, fancy design, AI messaging, feature lists.

### 1.5 Two Layers of Value (Content Principle)

Every piece of copy must balance two layers:

**Layer A — Core Outcome Value** (what SMBs consciously buy):

> "My menu stays accurate everywhere."

**Layer B — Operational Acceleration Value** (how it becomes easy):

> "Images, descriptions, translations generated instantly. No design work. No rewriting."

**Rule:** Lead with Layer A (infrastructure positioning). Surface Layer B subtly through outcome-first language.

- If you lead with Layer B → you look like a tool
- If you lead with Layer A → you look like infrastructure
- The balance: "Powerful system that removes 80% of your effort"

### 1.6 Effort-Removal Clarity (Critical Gap to Address)

Site currently scores:

- Understanding what it is: 9/10
- Trust: 9/10
- Professional feel: 9/10
- **Effort-saving clarity: 6.5–7/10** ← Must reach 8.5–9/10

**Fix:** NOT structural changes, NOT new sections, NOT video. Only sharper outcome phrasing in 3 places:

1. Hero subline — make effort removal explicit
2. Capabilities wording — make them sound like user relief
3. How-it-works Step 2 — make it feel powerful and relieving

When effort-saving clarity rises: price resistance drops, trial increases, hesitation decreases.

### 1.7 Tone Calibration (LOCKED)

**Decision:** Perfect balance — premium calm + practical.

Every line should feel: Clear, Calm, Practical, Professional, Effort-saving.
Not: Fancy, Hype, Tech-heavy, Salesy.

Think: "Serious system that makes my life easier."

SMB internal reaction while scrolling should be:

- "This looks professional"
- "This looks simple"
- "This will save me time"
- "This feels reliable"

### 1.8 Website Language Rules (Supplements Language Governance Doc 02)

**Use (operational language = trust):**
Upload, Prepare, Publish, Update, Stays aligned, Created instantly, Works automatically, Prepared for you, Stays correct, Generated instantly

**Avoid (marketing language = distrust):**
Revolutionary, Next-gen, Cutting-edge, AI-powered (everywhere), Smart engine, Advanced system, Powered by GPT, Game-changing, Disruptive

**Multi-chain communication:** Never say "150+ edge cases handled." Instead: "Built to handle multi-location businesses reliably." Engineering depth = felt, not shouted.

---

## Part 2: Site Architecture

### 2.1 Page Structure (6 Core + Legal)

| #   | Page                   | URL                 | Purpose                        |
| --- | ---------------------- | ------------------- | ------------------------------ |
| 1   | **Homepage**           | `/`                 | Positioning + system overview  |
| 2   | **How It Works**       | `/product`          | Detailed product explanation   |
| 3   | **For Multi-Location** | `/multi-location`   | Chain/outlet value proposition |
| 4   | **Pricing**            | `/pricing`          | Plans + credit model           |
| 5   | **About**              | `/about`            | Minimal credibility page       |
| 6   | **Get Started**        | `/get-started`      | Conversion entry point         |
| —   | Privacy Policy         | `/privacy-policy`   | Legal (existing, redesign)     |
| —   | Terms of Service       | `/terms-of-service` | Legal (existing, redesign)     |
| —   | Refund Policy          | `/refund-policy`    | Legal (existing, redesign)     |
| —   | Contact                | `/contact`          | Support channel                |

**NOT building now:** Blog, Feature pages, Resource center, Case studies, Developer docs, Comparison pages.

### 2.2 Navigation

**Desktop:**

```
[MenuList logo]     How It Works    Multi-Location    Pricing    Login    [Create your MenuList →]
```

**Mobile:**

```
[MenuList logo]                                                           [☰]
```

**Rules:**

- "Create your MenuList" = primary CTA (filled button, accent color)
- "Login" = subtle text link
- Sticky header with subtle bottom border
- No dropdowns, no mega-menus
- Same header across all pages

### 2.3 Footer

```
[MenuList logo]                Product              Legal
  Where your menu lives.       How It Works          Privacy Policy
                               Multi-Location        Terms of Service
                               Pricing               Refund Policy
                               About                 Contact

───────────────────────────────────────────────────────────────────────────
© 2026 MenuList                                                   India
```

- No social icons (until accounts are active and maintained)
- No newsletter signup
- No "Powered by EcomsAi" (confusing dual branding)
- Clean, professional, minimal

---

## Part 3: Homepage Structure (8 Sections)

### Section 1 — Hero (Above the Fold)

**Goal:** Instant clarity in 5 seconds.

**Structure:**

- **Headline:** Outcome-focused, practical, authoritative
  - Direction: "Manage your official menu and business information from one place."
- **Subline:** Must make effort-removal explicit. Direction:
  - Primary: "Upload your menu once. Everything is prepared and published automatically."
  - Alt: "Upload your menu once. We prepare and publish everything for you."
- **Primary CTA:** "Create your MenuList" (button)
- **Micro-trust line:** "Takes minutes. No technical setup."
- **Visual:** Multi-surface preview with mobile as dominant element (mobile menu view primary + QR scan + public page — layered/stacked)

**Rules:**

- No carousel
- No video autoplay
- No multiple CTAs
- Show output (what customers see), not dashboard
- Hero text loads instantly (no animation delay)

### Section 2 — The Real Problem

**Goal:** Reframe category through pain the owner already feels.

**Statements:**

- Customers see outdated menus
- Prices differ across places
- PDFs and QR don't match
- Google shows old items

**Anchor line:** "Most businesses don't have a single official public version of their menu."

**Visual:** Grid showing fragmented states (outdated Google, old PDF, different QR, wrong pricing)

### Section 3 — The Solution (One Source of Truth)

**Goal:** Introduce the new model clearly.

**Structure:**

- "Create one official version. Everything else stays aligned automatically."
- Visual diagram: [One Menu] → QR | Google | Screens | Web | PDF | Public Page
- Short bullets: Central control, Instant updates, Multi-surface publishing, Consistent everywhere

**Rules:** No feature list. No tech terms. Just the system behavior.

### Section 4 — Where It Shows Up (Visual Proof)

**Goal:** Remove uncertainty about where MenuList actually appears.

**Visual tiles (6):**

1. QR Menu
2. Public Link
3. Google Presence
4. Digital Screens
5. Downloadable PDF (internal use)
6. Official Public Page (OBP)

Each tile: icon + 1-line description + real product preview.

**This section is critical for non-tech trust.** They need to SEE where it shows up.

### Section 5 — Built for Serious Businesses

**Goal:** Filter + elevate perception.

**Points:**

- Consistent pricing everywhere
- Central brand control
- Multi-location support
- Professional presentation

**Subtle line:** "For growing businesses that care about consistency."

**Visual:** Clean multi-location preview or before/after consistency comparison.

### Section 6 — Who It's For (Industry Widening)

**Goal:** Expand beyond restaurants without losing clarity.

**Line:** "Designed for restaurants, cafés, bakeries, cloud kitchens, and growing businesses that publish public offers."

**Keep tight.** Do not over-expand. Anchored in public-offer businesses.

### Section 7 — How It Works (4 Steps)

**Goal:** Remove complexity fear. Step 2 must feel powerful and relieving.

**Steps:**

1. Create your menu — "Upload a photo, PDF, or type it in. Takes a few minutes."
2. We prepare everything for you — "Images, descriptions, and structure — done. No design work, no writing, no formatting."
3. Publish — "One click. Your menu goes live across all surfaces."
4. It stays updated everywhere — "Change a price, add an item — every surface reflects it."

**Micro-copy:** "No technical knowledge required."

**Visual:** Simple horizontal step flow (icons + short text).

### Section 8 — Final CTA

**Goal:** Close calmly.

**Line:** "Make your menu official."
**Button:** "Create your MenuList"
**Sub-text:** "Start in minutes."
**Effort-removal micro-copy (below CTA):** "No design work. No rewriting. No manual updates."

> ChatGPT Session 3 confirmed this micro-copy line is "one of the strongest lines on entire site." Keep as-is.

No secondary offers. No newsletter. No demo booking.

---

## Part 4: Design System

### 4.1 Color Palette

| Role                  | Token              | Hex       | Usage                                     |
| --------------------- | ------------------ | --------- | ----------------------------------------- |
| **Background**        | `--bg-primary`     | `#FFFFFF` | Main page background                      |
| **Background subtle** | `--bg-subtle`      | `#F8FAFC` | Alternating sections, cards               |
| **Text primary**      | `--text-primary`   | `#0F172A` | Headlines, body text (slate-900)          |
| **Text secondary**    | `--text-secondary` | `#475569` | Supporting text, descriptions (slate-600) |
| **Text muted**        | `--text-muted`     | `#94A3B8` | Captions, meta text (slate-400)           |
| **Brand accent**      | `--brand`          | `#1E40AF` | Primary brand color (blue-800)            |
| **CTA**               | `--cta`            | `#2563EB` | Buttons, links, interactive (blue-600)    |
| **CTA hover**         | `--cta-hover`      | `#1D4ED8` | Button hover state (blue-700)             |
| **Border**            | `--border`         | `#E2E8F0` | Dividers, card borders (slate-200)        |
| **Border subtle**     | `--border-subtle`  | `#F1F5F9` | Very subtle separators (slate-100)        |

**Rules:**

- ONE accent color family (blue). No secondary accent.
- No gradients on the public site.
- All color combinations must pass WCAG AA contrast (4.5:1 body, 3:1 large text).
- Background alternates between `#FFFFFF` and `#F8FAFC` for section rhythm.

**Why this palette:**

- Blue-800/600 is authority without being cold (darker than typical startup blue)
- Slate grays are modern and neutral
- High contrast for readability on mobile
- Works equally well in Indian and global context
- Does not look like a "restaurant theme" or "food app"

### 4.2 Typography

**Font family:** Inter (already in codebase, used across app)

| Element                   | Weight | Size (desktop) | Size (mobile) | Line Height | Letter Spacing |
| ------------------------- | ------ | -------------- | ------------- | ----------- | -------------- |
| **H1** (hero only)        | 700    | 56px           | 36px          | 1.1         | -0.02em        |
| **H2** (section titles)   | 600    | 40px           | 28px          | 1.2         | -0.01em        |
| **H3** (subsections)      | 600    | 28px           | 22px          | 1.3         | -0.01em        |
| **Body large** (hero sub) | 400    | 20px           | 17px          | 1.6         | 0              |
| **Body** (general)        | 400    | 16px           | 15px          | 1.6         | 0              |
| **Body small**            | 400    | 14px           | 13px          | 1.5         | 0              |
| **CTA button**            | 600    | 16px           | 16px          | 1           | 0.01em         |
| **Nav links**             | 500    | 15px           | 15px          | 1           | 0              |
| **Caption/meta**          | 500    | 12px           | 12px          | 1.4         | 0.02em         |

**Rules:**

- No font below 13px on mobile (accessibility)
- Headlines use tight negative letter-spacing for authority
- Body uses default spacing for readability
- Short paragraphs (max 3 lines mobile, 2 lines desktop per paragraph)

### 4.3 Spacing System (8px Grid)

| Token      | Value | Tailwind | Usage                    |
| ---------- | ----- | -------- | ------------------------ |
| `space-1`  | 4px   | `p-1`    | Tight gaps               |
| `space-2`  | 8px   | `p-2`    | Small component gaps     |
| `space-3`  | 12px  | `p-3`    | Internal padding         |
| `space-4`  | 16px  | `p-4`    | Standard padding         |
| `space-6`  | 24px  | `p-6`    | Between related elements |
| `space-8`  | 32px  | `p-8`    | Between components       |
| `space-12` | 48px  | `p-12`   | Between section groups   |
| `space-16` | 64px  | `p-16`   | Section breaks (mobile)  |
| `space-20` | 80px  | `p-20`   | Section breaks (desktop) |
| `space-24` | 96px  | `p-24`   | Major sections (desktop) |
| `space-32` | 128px | `p-32`   | Hero padding (desktop)   |

**Layout widths:**

- Container max: `1200px` (`max-w-7xl` roughly)
- Content max: `1024px` (`max-w-5xl`)
- Reading max: `720px` (`max-w-3xl`)
- Narrow max: `560px` (`max-w-xl`)

### 4.4 Component Styling

**Buttons:**

- Primary: `bg-blue-600 text-white` / Hover: `bg-blue-700` / Rounded: `rounded-lg` (8px)
- Secondary: `border border-slate-300 text-slate-700` / Hover: `bg-slate-50`
- Height: `44px` minimum (touch target)
- Padding: `px-6 py-3`
- No shadows on buttons
- No gradient fills

**Cards:**

- Background: `bg-white` or `bg-slate-50`
- Border: `border border-slate-200`
- Rounded: `rounded-xl` (12px)
- Shadow: `shadow-sm` (very subtle) or none
- Padding: `p-6` to `p-8`
- No hover transform (calm)

**Section wrappers:**

- Alternating backgrounds: white → slate-50 → white → slate-50
- Vertical padding: `py-20` (desktop), `py-12` (mobile)
- Horizontal padding: `px-4` (mobile), `px-6` (tablet), `px-8` (desktop)

### 4.5 Imagery & Visuals

**Product screenshots:**

- Real, current product UI (OBP page, menu view, QR result)
- Clean browser/phone mockups
- WebP format, optimized
- Max width matching content container
- Subtle shadow or border for depth
- Hero: Mobile preview is the PRIMARY/largest visual — shows final output customers see
- No dashboard UI, no editor UI, no settings screens in hero — show output only

**Marketing images: Local in repo (static import)**

- All marketing visuals stored in `/public/images/` or imported via `/_assets/`
- Use `next/image` with static imports for automatic optimization
- Hero image: `priority` attribute, all others lazy
- No cloud storage for marketing assets (Firebase Storage only for user-generated content)
- Compress manually before commit: hero < 250KB, sections < 100KB each

**System diagrams:**

- Flat design, minimal color
- Use brand accent for connections/arrows
- Text labels in Inter
- SVG preferred for crisp rendering
- No 3D, no isometric, no illustrations

**Icons:**

- Lucide icons (`react-icons/lu`) — already standard in codebase
- Size: 20-24px for inline, 32-40px for section icons
- Color: `text-slate-500` default, `text-blue-600` for emphasis
- No filled icons — outline style only

### 4.6 Motion & Animation

**Allowed:**

- Fade-in on scroll: `opacity 0→1, translateY 12px→0, duration 500ms, ease-out`
- Use native IntersectionObserver (already have `useInView` hook)
- Hover: color transitions `duration-200`
- Focus: outline ring `ring-2 ring-blue-500 ring-offset-2`
- Button hover micro-transitions

**Forbidden:**

- Parallax
- Auto-carousels
- Animated backgrounds/gradients
- Particle effects
- Scroll hijacking
- Complex Framer Motion sequences
- Loading skeletons on static content
- Counter animations
- **Promo/explainer video** — No video at launch (video = compensation for weak clarity)
- **SVG explainer animations** — Signals "we need to explain because it's not obvious"
- **Hero background video** — Performance killer
- **Large animated journey diagrams** — Startup marketing pattern, not infrastructure

**Motion philosophy:** If animation is noticeable → too much. Motion should feel like UI polish, not marketing narrative.

**Respect `prefers-reduced-motion`:** Disable all motion for users who prefer it.

**When video becomes appropriate (future):** Traffic >5k/month, cold ad traffic, paid campaigns. Short product demo only.

---

## Part 5: Technical Specifications

### 5.1 Build Strategy

- **Complete rebuild** in new directory (not modifying existing landing page)
- Feature flag: `ENABLE_NEW_WEBSITE` in `src/config/features.ts`
- Existing site remains functional during development
- New pages: Server-rendered (RSC) for SEO, minimal client JS
- Use Next.js App Router with **fully static generation** (`export const dynamic = "force-static"` on homepage)
- **All homepage sections = server components by default.** Only use `"use client"` where interaction absolutely requires it
- **Styling:** Tailwind CSS + shadcn/ui (selective — Button and Sheet only, custom for everything else)
- **Build approach:** Extremely minimal, ultra-fast. If something looks cool → remove. If it improves clarity → keep.

### 5.2 Performance Budget

| Metric                    | Target                                           |
| ------------------------- | ------------------------------------------------ |
| First Contentful Paint    | < 1.2s                                           |
| Largest Contentful Paint  | < 2.5s                                           |
| Total Blocking Time       | < 200ms                                          |
| Cumulative Layout Shift   | < 0.1                                            |
| Page weight (initial)     | < 500KB                                          |
| JavaScript (initial)      | < 100KB (homepage under 120-150KB first load JS) |
| Hero image                | < 200KB (WebP, optimized)                        |
| Lighthouse Performance    | 90+ (mobile)                                     |
| Lighthouse Accessibility  | 95+                                              |
| Lighthouse Best Practices | 95+                                              |
| Lighthouse SEO            | 100                                              |

### 5.3 SEO Requirements

| Element          | Value                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Title            | "MenuList — Official Menu & Business Information System"                                                                                     |
| Meta description | "Manage your official menu and business information from one place. Update once — stays correct across QR, Google, screens, web, and print." |
| H1               | One per page, matches primary message                                                                                                        |
| Schema           | Organization + SoftwareApplication + WebSite                                                                                                 |
| OG image         | Custom branded social share image                                                                                                            |
| Sitemap          | Auto-generated `/sitemap.xml`                                                                                                                |
| Robots           | Allow indexing on all public pages                                                                                                           |
| Canonical URLs   | Self-referencing on all pages                                                                                                                |
| Lang attribute   | `en` (default), expandable                                                                                                                   |

### 5.4 Accessibility Requirements

| Requirement         | Standard                                  |
| ------------------- | ----------------------------------------- |
| Color contrast      | WCAG AA (4.5:1 body, 3:1 large text)      |
| Keyboard navigation | Full tab order, visible focus states      |
| Screen reader       | Semantic HTML, ARIA labels where needed   |
| Touch targets       | 44×44px minimum                           |
| Font sizing         | 15px minimum on mobile                    |
| Reduced motion      | Respect `prefers-reduced-motion`          |
| Alt text            | All images have descriptive alt text      |
| Skip navigation     | "Skip to content" link for keyboard users |

### 5.5 i18n Readiness

- All text via `next-intl` translation keys
- RTL layout support (already built for ar-SA)
- Currency follows user locale (INR primary, USD secondary)
- No hardcoded strings in components

### 5.6 Security Headers

Add in `next.config.js` or middleware:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Basic `Content-Security-Policy` (avoid overly strict early)

### 5.7 Analytics (Minimal)

Add only ONE analytics tool:

- Google Analytics 4 (recommended for SMB ecosystem)
- OR PostHog
- OR Plausible

Do NOT add: Hotjar, CrazyEgg, Clarity, chat widgets, heatmap tools.
Keep site clean + fast.

### 5.8 Build Phase Order (Solo Execution)

| Phase     | Scope                                                                                                                 | Est. Time             |
| --------- | --------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 0         | Foundation — next/font, metadata, global layout, favicon                                                              | 0.5 day               |
| 1         | Header — minimal (Logo + nav + CTA + Login)                                                                           | 0.5 day               |
| 2         | Hero section — headline, subline, CTA, mobile preview                                                                 | 1 day                 |
| 3         | Remaining homepage sections (Problem → Solution → Surfaces → Business → Industry → How It Works → Final CTA → Footer) | 1.5 days              |
| 4         | Supporting pages (Pricing, About, Contact, Privacy, Terms, Refund)                                                    | 1 day                 |
| 5         | SEO + infra (sitemap.ts, robots.ts, schema JSON-LD, OG image)                                                         | 0.5 day               |
| 6         | Performance hardening (Lighthouse, bundle size, image optimization)                                                   | 0.5 day               |
| 7         | Real-device testing (phone, slow network, incognito, WhatsApp OG preview)                                             | 0.5 day               |
| **Total** |                                                                                                                       | **~5-6 focused days** |

**Build discipline:** Do NOT redesign mid-build. Do NOT add new sections. Do NOT add animations for fun. Execute what is already decided.

---

## Part 6: What the Existing Site Gets Wrong (Why Full Rebuild)

| Existing Site                                 | New Site                                   |
| --------------------------------------------- | ------------------------------------------ |
| 16+ sections, feature-heavy                   | 8 sections, message-focused                |
| "Turn Menu PDF into Live Digital Catalog"     | "Manage your official menu from one place" |
| AI-focused hero messaging                     | Outcome-focused, no AI mention             |
| Developer section + API section               | Removed (premature, wrong audience)        |
| ROI calculator, trust badges                  | Removed (no social proof yet)              |
| Cyan gradients, startup aesthetic             | Deep blue accent, professional calm        |
| Dark mode + light mode toggle                 | Light mode only for public site            |
| "Powered by EcomsAi"                          | Removed (single brand)                     |
| FaBolt icon as logo                           | Proper logo mark                           |
| Multiple CTAs (Get Started, Try It, Generate) | Single CTA: "Create your MenuList"         |
| ShadCN heavy (large bundle)                   | Minimal custom components                  |
| Feature comparison tables                     | Simple, transparent pricing                |
| Template/generic SaaS copy                    | Doctrine-compliant worldbuilding copy      |

---

## Part 7: Content Strategy — COMPLETE

**Status:** ✅ Content document created — see `main-website_content.md`

All content follows:

1. **Communication Worldbuilding Doctrine (Doc 10)** — Persuasion sequence applied to every section
2. **Language Governance (Doc 02)** — Forbidden/allowed words verified (compliance checklist in content doc)
3. **The One-Line Test:** Every line verified against: "Would a busy restaurant owner in Mumbai, reading this on their phone between lunch rush and dinner prep, immediately understand what this means for them?"
4. **Two Layers of Value (§1.5)** — Layer A (outcome) leads, Layer B (ease) surfaced subtly
5. **Effort-Removal Clarity (§1.6)** — Hero subline, capabilities, how-it-works Step 2, final CTA micro-copy all address the 6.5→8.5 gap
6. **Website Language Rules (§1.8)** — Operational vocabulary used throughout
7. **\_website.md Integration (Part 10)** — Tier 1 + Tier 2 content mapped into page sections

Content completed for:

- ✅ Homepage (8 sections — every word specified)
- ✅ Product page (/product — 7 sections)
- ✅ Multi-Location page (/multi-location — 6 sections)
- ✅ Pricing page (/pricing — plans display, FAQ, enhancement packs)
- ✅ About page (/about — mission, team, trust)
- ✅ Get Started page (/get-started — auth flow entry)
- ✅ Contact page (/contact — minimal)
- ✅ Header + Footer copy
- ✅ Meta tags for all 10 pages
- ✅ Legal pages plan (reuse existing content, restyle)

---

## Part 8: Decision Log

| #   | Decision                     | Choice                                                                                                                                                            | Reasoning                                                                                                                                                     | Source                                                       |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Positioning                  | Public menu infrastructure                                                                                                                                        | Category creation, not tool marketing                                                                                                                         | ChatGPT + Cascade + Doctrine                                 |
| 2   | Visual direction             | Clean corporate + subtle modern tech                                                                                                                              | Trust for non-tech SMBs, infrastructure authority                                                                                                             | ChatGPT + Research                                           |
| 3   | Primary color                | Blue-800/600 (deep blue)                                                                                                                                          | Authority, trust, not startup cyan                                                                                                                            | Cascade (Stripe-inspired but warmer)                         |
| 4   | Typography                   | Inter                                                                                                                                                             | Already in codebase, excellent readability, serious                                                                                                           | Cascade + ChatGPT                                            |
| 5   | Background                   | White + slate-50 alternating                                                                                                                                      | Light mode for SMB trust, readability                                                                                                                         | Cascade + Research                                           |
| 6   | CTA                          | "Create your MenuList"                                                                                                                                            | Practical + ownership framing                                                                                                                                 | ChatGPT                                                      |
| 7   | Pages                        | 6 core + legal                                                                                                                                                    | Ruthless focus, avoid dilution                                                                                                                                | ChatGPT + Cascade                                            |
| 8   | Social proof                 | None (product reality instead)                                                                                                                                    | Honest early-stage, no fake trust                                                                                                                             | ChatGPT + Cascade                                            |
| 9   | Dark mode                    | No (light only for public site)                                                                                                                                   | SMB trust, broader accessibility                                                                                                                              | Cascade + Research                                           |
| 10  | Gradients                    | None on public site                                                                                                                                               | Infrastructure = calm, not startup-y                                                                                                                          | ChatGPT + Cascade                                            |
| 11  | Video                        | **No video at launch**                                                                                                                                            | Video = compensation for weak clarity. At early stage, delays activation, adds weight. Revisit at >5k/month traffic.                                          | ChatGPT Session 2 + Cascade (revised)                        |
| 12  | About page                   | Include minimal version                                                                                                                                           | India SMBs want to know who's behind product                                                                                                                  | Cascade (disagrees with ChatGPT)                             |
| 13  | Footer social                | Exclude until accounts active                                                                                                                                     | Dead links destroy trust                                                                                                                                      | Cascade                                                      |
| 14  | WhatsApp                     | Inside onboarding only, not homepage                                                                                                                              | Product-first positioning                                                                                                                                     | ChatGPT + Cascade                                            |
| 15  | Blog                         | Not now, within 6 months                                                                                                                                          | SEO requires content eventually                                                                                                                               | Cascade + Research                                           |
| 16  | Build approach               | Complete rebuild, feature flag                                                                                                                                    | Existing site contradicts all positioning                                                                                                                     | Cascade                                                      |
| 17  | EcomsAi branding             | Remove from public site                                                                                                                                           | Single brand clarity                                                                                                                                          | Cascade                                                      |
| 18  | India-first                  | INR primary, Indian business imagery                                                                                                                              | Market reality                                                                                                                                                | ChatGPT + Cascade                                            |
| 19  | F-pattern layout             | Headlines/CTAs along scan path                                                                                                                                    | Research-proven conversion pattern                                                                                                                            | Research                                                     |
| 20  | Performance                  | <2.5s LCP, <500KB page weight                                                                                                                                     | Indian 4G mobile users                                                                                                                                        | Cascade                                                      |
| 21  | Effort-removal clarity       | Must reach 8.5/10 (currently ~6.5/10)                                                                                                                             | SMBs buy ease + relief, not infrastructure                                                                                                                    | ChatGPT Session 2 + Cascade                                  |
| 22  | Rendering                    | Fully static (SSG, `force-static`)                                                                                                                                | Zero runtime cost, edge cached, fastest TTFB                                                                                                                  | ChatGPT Session 2 + Cascade                                  |
| 23  | Marketing images             | Local in repo (static import)                                                                                                                                     | Zero external dependencies, version controlled                                                                                                                | ChatGPT Session 2 + Cascade                                  |
| 24  | Security headers             | X-Frame-Options, CSP, etc.                                                                                                                                        | Professional infra signal                                                                                                                                     | ChatGPT Session 2                                            |
| 25  | Analytics                    | One tool only (GA4/PostHog/Plausible)                                                                                                                             | Keep site clean + fast                                                                                                                                        | ChatGPT Session 2                                            |
| 26  | shadcn usage                 | Selective — Homepage: Button, Sheet. Pricing: + Dialog, Switch, Input, Label, Select, Avatar, DropdownMenu                                                        | Minimal bundle for homepage; pricing page needs form/modal components for payment flow                                                                        | ChatGPT Session 2 + Cascade + Existing Site Audit            |
| 27  | Relief language rule         | "For you" > "Automatically" in all copy. Owner-relief > system-capability. ~15-20% relief density increase.                                                       | SMBs convert from relief ("one less thing"), not correctness ("data stays aligned"). Infrastructure framing maintained, but relief is the conversion trigger. | ChatGPT Session 3 + Cascade (validated against Doc 10 Law 1) |
| 28  | Abstraction gap              | Every upload/setup step must communicate time ("takes minutes") and minimal effort ("no starting from scratch").                                                  | Owners who don't see effort estimate assume effort required → postpone signup.                                                                                | ChatGPT Session 3 + Cascade                                  |
| 29  | Positioning balance          | A ("official system") = identity. B ("saves me time") = conversion trigger. Both coexist. B must be stronger than initially written.                              | Infrastructure positioning is the long-term moat. Relief feeling is what gets the first signup. Neither dominates — they reinforce each other.                | ChatGPT Session 3 + Cascade + Doc 10 Law 4                   |
| 30  | Hero sharpening              | "Manage your official menu from one place." (removed "and business information")                                                                                  | "Menu" is the sharpest object. Too many nouns reduce memory retention. Subline handles the rest.                                                              | ChatGPT Session 4 + Cascade                                  |
| 31  | Visual gravitas              | Heading weight 700, tighter letter-spacing, reduced border-radius (6-8px), removed accent background tint                                                         | Infrastructure brands skew heavier, sharper. Over-rounded/soft = startup feel. Stripe-level discipline.                                                       | ChatGPT Session 4 + Cascade                                  |
| 32  | Inevitability language       | Surfaces heading: "Your official menu appears everywhere customers look." Solution bullets: outcome-first. Business points: "stays" repetition.                   | Surfaces should feel inevitable, not optional. Repetition of "stays" reinforces stability.                                                                    | ChatGPT Session 4 + Cascade                                  |
| 33  | Pain amplification           | Added "Trust erodes." to problem section. Professional tone: "PDF still circulating" not "floating around".                                                       | Increases psychological weight without drama. More professional tone.                                                                                         | ChatGPT Session 4 + Cascade                                  |
| 34  | Effort-removal density       | Target 5-6 effort-removal cues across homepage (was ~3). Added to Solution subtitle, microcopy, bullet points.                                                    | SMBs click when they feel "this reduces my workload." Repetition drives the feeling home.                                                                     | ChatGPT Session 4 + Cascade                                  |
| 35  | Category bridge line         | Added "There is no single source of truth." as closing line in Problem section, before tiles.                                                                     | Short. Definitive. Bridges problem → solution. Reframes fragmentation as a structural gap.                                                                    | ChatGPT Session 5 + Cascade                                  |
| 36  | Relief anchor line           | Added "After publishing, you don't touch it again." as standalone emphasized line below Solution bullets.                                                         | Conversion gold — the emotional relief moment. Must be visually prominent, not buried in heading.                                                             | ChatGPT Session 5 + Cascade                                  |
| 37  | Multi-location operator tone | Upgraded multi-location hero subline to "Manage pricing, availability and presentation across all outlets." Added "Inconsistency compounds as you grow." closing. | Chains care about control + governance, not simplicity. Slightly more serious/operational tone than homepage.                                                 | ChatGPT Session 5 + Cascade                                  |

---

## Part 9: Pricing/Auth Reuse Strategy (LOCKED)

### 9.1 Decision: REUSE LOGIC, REBUILD UI

The existing pricing page has a **production-tested Razorpay payment flow** including:

- Google OAuth login → business onboarding → subscription creation → payment verification
- localStorage-based purchase intent persistence across auth redirects
- Currency auto-detection (INR for India timezone)
- Monthly/yearly billing toggle
- Subscription management for returning users

**This logic must NOT be rewritten.** It handles edge cases (session refresh, payment failure, onboarding interruption) that took significant iteration to get right.

### 9.2 What to Reuse (Untouched)

| Component               | Path                                        | Action                          |
| ----------------------- | ------------------------------------------- | ------------------------------- |
| `usePaymentHandler`     | `src/hooks/usePaymentHandler.ts`            | **Keep** — core Razorpay logic  |
| `useRazorpayScript`     | `src/hooks/useRazorpayScript.ts`            | **Keep** — script loader        |
| `WebsiteAuthProvider`   | `src/app/(website)/WebsiteAuthProvider.tsx` | **Keep** — auth wrapper         |
| `useFirebaseAuthSync`   | `src/hooks/useFirebaseAuthSync.ts`          | **Keep** — Firebase sync        |
| `PlatformPlansList`     | `src/data/PlatformPlansList.ts`             | **Keep** — plan definitions     |
| `PlatformFeaturesList`  | `src/data/PlatformFeaturesList.ts`          | **Keep** — feature lists        |
| All Razorpay API routes | `src/app/api/razorpay/`                     | **Keep** — backend unchanged    |
| Common types            | `src/data/common.ts`                        | **Keep** — Plan, Currency, etc. |

### 9.3 What to Rebuild (New UI, Same Logic)

| Component               | What Changes                                                                      |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Pricing page layout** | New design system, remove B2B/Developer tab, remove feature comparison table      |
| **PlanCard**            | Redesign to match blue/white/slate design system. Show 2-3 B2C plans only.        |
| **OnboardingModal**     | Same flow (business name + industry → Google auth → payment). New visual styling. |
| **SuccessModal**        | Same flow. New styling.                                                           |
| **PricingFaq**          | Keep accordion. Rewrite all content for infrastructure tone.                      |
| **CurrencySwitcher**    | Keep logic. Restyle to match design system.                                       |
| **WelcomeBackBanner**   | Keep — nice UX touch for returning users. Restyle.                                |

### 9.4 What to Remove from Pricing

- **B2B/Developer tab** — Wrong audience for current stage
- **FeatureComparisonTable** — Too complex for ICP. Simple plan cards suffice.
- **ROI-related messaging** — Premature, no data to back claims
- **"Generate My Catalog" CTA** — Replace with "Create your MenuList"
- **Startup-style heading** — "Simple Plans, Unbeatable Value" → "Simple, transparent pricing"

### 9.5 Auth Flow: FULLY REUSE

The auth flow is clean and UI-independent:

- `WebsiteAuthProvider` stays in `(website)/layout.tsx`
- `signIn('google')` for login buttons
- `signOutSession` for logout
- Profile dropdown with Dashboard/Settings links for subscribed users
- No changes needed to auth logic

---

## Part 10: Feature Content Integration Plan (`_website.md` Files)

### 10.1 Inventory

39 `_website.md` files exist across `__docs__/` feature folders. Each contains pre-written website content (hero, problem, solution, benefits, FAQ, SEO meta) following Language Governance.

### 10.2 Relevance Classification

**Tier 1 — Directly usable on new site (content feeds into homepage or Product page):**

| Feature                    | File                                                           | How to Use                                                           |
| -------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| Client Menu (Digital Menu) | `client-menu/client-menu_website.md`                           | **Product page** — "Where It Shows Up" section (QR menu surface)     |
| Official Business Page     | `official-business-page/official-business-page_website.md`     | **Product page** — OBP surface description                           |
| Digital Screens            | `digital-screens/digital-screens_website.md`                   | **Product page** — Screen surface description                        |
| Multi-Outlet Consistency   | `multi-outlet-consistency/multi-outlet-consistency_website.md` | **Multi-Location page** — primary content source                     |
| Pricing Integrity System   | `pricing-integrity-system/pricing-integrity-system_website.md` | **Homepage Section 3** — "consistent everywhere" messaging           |
| AI Data Extraction         | `projects/ai-data-extraction/ai-data-extraction_website.md`    | **Product page** — "Upload & Create" section (outcome language only) |
| AI Image Generation        | `projects/ai-image-generation/ai-image-generation_website.md`  | **Product page** — "We prepare everything" (Layer B, subtle)         |

**Tier 2 — Content for Product page deeper sections (use selectively):**

| Feature                    | File                                   | How to Use                                       |
| -------------------------- | -------------------------------------- | ------------------------------------------------ |
| Description Generation     | `projects/description-generation/`     | Product page — "prepared automatically" proof    |
| Multi-Language Translation | `projects/multi-language-translation/` | Product page — works for multilingual businesses |
| Hours/Holiday Accuracy     | `hours-holiday-accuracy/`              | OBP surface — "always current" messaging         |
| Menu Correctness Engine    | `menu-correctness-engine/`             | Product page — quality/accuracy backing          |
| GBP Sync                   | `gbp-sync/`                            | Product page — Google surface description        |

**Tier 3 — NOT for new site now (too detailed, wrong audience, or future features):**

| Feature                      | Reason to Exclude                          |
| ---------------------------- | ------------------------------------------ |
| Agent Readiness Strategy     | Future feature, not built                  |
| Behavior Engineering         | Internal infrastructure, invisible to user |
| Continuous Menu Intelligence | Internal, too technical                    |
| Decision Intelligence        | Internal recommendation engine             |
| Lifecycle Messaging          | Future CRM feature                         |
| Loyalty/Health Signals       | Future analytics                           |
| Menu Command Center          | Dashboard feature, not public-facing       |
| POS Webhook Sync             | Backend integration, not public-facing     |
| Presence Dominance           | Strategic framework, not feature page      |
| SEO/AEO Discovery            | Internal infrastructure                    |
| Special Menu Switching       | Niche feature, premature                   |
| Staff Prompt                 | Internal tool                              |
| Roles/Permissions            | Admin feature                              |
| Risk/Decline Detection       | Internal analytics                         |
| Reputation Protection        | Future feature                             |
| Reviews/Reputation           | Future feature                             |
| Menu Kit                     | Niche distribution feature                 |
| Physical Surfaces            | Future print feature                       |
| Multi-Chain Permissions      | Admin feature                              |

### 10.3 Integration Rules

1. **Never copy `_website.md` content verbatim to the public site.** Use it as source material, then rewrite following Website Language Rules (§1.8).
2. **Tier 1 files feed directly into page sections** — extract the problem/solution framing, use outcome-first language.
3. **Tier 2 files provide proof points** — use to strengthen specific claims on the Product page.
4. **Tier 3 files are NOT used** on the new site at launch. They may become relevant when feature-specific landing pages are built (Phase 2 SEO).
5. **All content must pass the One-Line Test:** "Would a busy restaurant owner in Mumbai understand this on their phone?"
6. **AI features are surfaced as outcomes, never as technology** — per Two Layers of Value principle (§1.5).

### 10.4 Content Mapping: Homepage

| Homepage Section       | Primary Source  | \_website.md Sources                                                     |
| ---------------------- | --------------- | ------------------------------------------------------------------------ |
| Hero                   | New copy (§3.1) | —                                                                        |
| Problem                | New copy (§3.2) | `pricing-integrity-system` (price inconsistency angle)                   |
| Solution               | New copy (§3.3) | `official-business-page` (one link concept)                              |
| Where It Shows Up      | New copy (§3.4) | `client-menu`, `digital-screens`, `official-business-page`, `gbp-sync`   |
| For Serious Businesses | New copy (§3.5) | `multi-outlet-consistency` (chain reliability)                           |
| Who It's For           | New copy (§3.6) | —                                                                        |
| How It Works           | New copy (§3.7) | `ai-data-extraction` (upload step), `ai-image-generation` (prepare step) |
| Final CTA              | New copy (§3.8) | —                                                                        |

### 10.5 Content Mapping: Product Page (/product)

| Product Section  | \_website.md Sources                                                            |
| ---------------- | ------------------------------------------------------------------------------- |
| Upload & Create  | `ai-data-extraction` — "photo to menu" framing                                  |
| Review & Approve | `menu-correctness-engine` — quality assurance backing                           |
| Publish          | `client-menu` — "live instantly" framing                                        |
| Where It Lives   | `client-menu` + `digital-screens` + `official-business-page` + `gbp-sync`       |
| Always Current   | `hours-holiday-accuracy` + `pricing-integrity-system` — freshness + consistency |

### 10.6 Content Mapping: Multi-Location Page (/multi-location)

Primary source: `multi-outlet-consistency/multi-outlet-consistency_website.md`

This `_website.md` file is the **most directly usable** of all 39 files. Its content closely matches the new site's tone and structure. Use it as the base, then refine language per §1.8.

---

**This document is the SSOT for all website design and development decisions.**  
**Do not deviate without updating this document first.**
