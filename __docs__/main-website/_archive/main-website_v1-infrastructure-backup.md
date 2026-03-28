# Website V1 — Infrastructure Positioning (Backup)

**Version:** v1.0 — Infrastructure Calm
**Status:** ARCHIVED — Replaced by v2 Hype/Domination (March 2026)
**Purpose:** This file preserves the full infrastructure-positioning website content so it can be restored in 1–2 years when MenuList transitions from market domination to infrastructure authority.

---

## When to Restore This Version

Restore when ALL of these conditions are met:
1. MenuList has 10,000+ active businesses
2. MenuList links appear frequently in Google Business, QR, and WhatsApp
3. Restaurant owners recognize MenuList pages in the wild
4. The brand no longer needs hype — it needs authority positioning

---

## V1 Section Order (HomePage.tsx)

```
1. HeroSection
2. ProblemSection
3. SolutionSection
4. PreparedForYouSection
5. SmartFeaturesSection
6. SurfacesSection
7. StatsSection
8. BusinessSection
9. IndustrySection
10. InteractiveWorkflowSection
11. FaqSection
12. FinalCtaSection
```

---

## V1 Positioning Summary

- **Tone:** Premium calm + practical. Not fancy, not salesy, not startup-y.
- **Identity:** "Official Menu & Business Information System"
- **Core message:** "Your official menu. From one place."
- **Language governance:** Strict — no AI-hype, no jargon, no excitement
- **Persuasion sequence:** Atomic truth → Hidden problem → New standard → Proof → Identity close
- **Target emotion:** Relief, trust, professionalism

---

## V1 Hero Content

```
titlePart1: "Your "
titleHighlight: "official menu."
titlePart2: " From one place."
subtitle: "Upload your menu once. We prepare and publish everything for you."
cta: "Create your MenuList →"
caption: "Takes minutes. No design work. No technical setup."
```

---

## V1 Problem Content

```
title: "Most businesses don't have a single official version of their menu."
highlight: "single official version"
body: "Your online presence shows old prices. The QR menu has items you removed last month. The PDF circulating on WhatsApp is from six months ago. Customers see different versions everywhere they look. Prices don't match. Staff explain discrepancies. Trust erodes."
conclusion: "There is no single source of truth."
```

Tiles (6):
1. No single source of truth — Every platform has a different version
2. Wrong QR menu — Items removed still visible
3. Old PDF circulating — Last year's menu on WhatsApp
4. Inconsistent pricing — Different prices on different platforms
5. Staff giving wrong info — Prices changed but staff quote old ones
6. Every update is manual — One price change = five updates

---

## V1 Solution Content

```
title: "Create one official version. Everything else stays aligned. You don't touch it again."
highlight: "stays aligned"
subtitle: "MenuList is the single place where your menu, hours, and business information live. Update once — every surface reflects the change. No separate updates needed."
reliefAnchor: "After publishing, you don't touch it again."
```

Bullets (6):
1. One place to manage — Menu, hours, business info all in one system
2. Updates reflect everywhere — Change a price once, every surface shows it
3. No duplicate uploads — QR, screens, web, print stay aligned automatically
4. Always consistent — No manual syncing. Handled for you.
5. No version confusion — One version exists. No outdated QR, stale PDF.
6. Staff always current — Everyone sees updated version automatically.

---

## V1 FinalCta Content

```
title: "Make your menu "
highlight: "official"
titleEnd: "."
subtitle: "One version. Everywhere customers look."
cta: "Create your MenuList →"
caption: "Takes minutes. No technical setup."
bottomText: "No rewriting. No duplicate updates. No chasing old PDFs."
```

---

## V1 Meta Tags

| Page | Title | Description |
|------|-------|-------------|
| Homepage | MenuList — Official Menu & Business Information System | Manage your official menu and business information from one place. Update once — stays correct across QR, Google, screens, web, and print. |

---

## V1 Design Principles

1. Persuasion sequence: Atomic truth → Hidden problem → New standard → Proof → Identity close
2. Two Layers of Value: Lead with Layer A (outcome), surface Layer B (ease) subtly
3. Effort-removal clarity target: 8.5/10
4. Tone: Premium calm + practical
5. Language: Operational words only. No AI-hype, no jargon.

---

## V1 Language Governance (Strict)

- No "AI-powered" in public copy
- No "Smart" / "Intelligent" / "Dynamic"
- No "You should..." / "We recommend..."
- No "Helps you..." / "Assists with..."
- No "Revolutionary" / "Game-changing"
- No excitement language / exclamation marks
- Calm, flat, professional tone

---

## Restoration Steps

1. Replace v2 locale content in `en-US.json` Website section with v1 content from this file
2. Restore `HomePage.tsx` section order to v1 order above
3. Update `main-website_content.md` back to v1 content
4. Update `hi-IN.json` Website section accordingly
5. Update meta tags in layout.tsx
6. Run `npx tsc --noEmit`

---

## Full Locale Content (en-US.json Website Section)

All v1 translation keys are preserved in the active `main-website_content.md` (renamed to v1 section) and can be referenced there for complete restoration.

**Note:** The component files (HeroSection.tsx, ProblemSection.tsx, etc.) do NOT change between versions — only the locale content and section order change. The component architecture is version-agnostic.
