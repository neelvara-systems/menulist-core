---
description: Working on the main MenuList marketing website (menulist.ai). Loads canonical website rules, content governance, and component patterns.
---

# Website Workflow

Use when building or modifying anything on the main marketing website at `src/app/(website)/` or `src/components/website/`.

## Context Loading

1. Read `__docs__/main-website/README.md` — current version, architecture, file map
2. Read `__docs__/main-website/main-website_marketing.md` — marketing strategy and growth context
3. Read `__docs__/main-website/main-website_content.md` — page-by-page copy reference
4. Read `__docs__/main-website/main-website_design-system.md` — colors, typography, spacing
5. If the staged website-prep prompt pack is in use, read `__docs__/main-website/website-prep-codex-prompts/README.md` and the latest completed stage outputs as planning records only.

## Website Rules (MANDATORY)

### 1. Canonical Website Rule
- The current implemented website is the only default website source.
- Do not create parallel website versions, restoration branches, or old-version code backups.
- Historical docs and staged prompt outputs may be used for reasoning, but they are not restoration sources and must not override current codebase truth.
- Current homepage copy, screenshots, claims, and CTAs must follow the current implementation, `main-website_content.md`, and implemented product behavior.

### 2. i18n Enforcement (Pattern 9 from Master Execution Prompt)
- NEVER hardcode user-visible strings in website components
- ALL text MUST use `useTranslations('Website')` with keys from locale JSON files
- Add key to `en-US.json` → Website namespace
- Add Hindi translation to `hi-IN.json` → Website namespace
- Other 6 locales fall back to English via deepMerge

### 3. Content Governance
- Current tone: premium calm, operationally clear, product-led, low hype.
- Core message: "The official source for what customers see."
- Key ideas: one owner-approved source, public surfaces stay aligned, no technical setup, official customer-facing proof.
- STILL FORBIDDEN: "AI-powered", "Smart", "Intelligent", "Dynamic", "Revolutionary", exclamation marks
- NOW ALLOWED: Direct transformation statements, action-oriented CTAs, "Free to start"
- Hype comes from TRANSFORMATION, not language

### 4. Component Architecture
- Shared: `SectionWrapper`, `SectionHeading`, `AnimateOnScroll`, `WebsiteButton`
- Each section is a standalone component in `src/components/website/home/`
- Section order defined in `HomePage.tsx` — change order there, not in individual components
- All pages under `src/app/(website)/` route group

### 5. Product Truth Preservation Rule
- Do not lose implemented MenuList capabilities when changing the website.
- Do not preserve old homepage section count or old content hierarchy blindly.
- When following the staged website-prep strategy, consolidate, reorder, or move capabilities lower on the page if that better communicates the current product truth.
- Preserve real capabilities as proof, future page inputs, screenshot candidates, or supporting sections rather than forcing every feature to remain equally visible on the homepage.
- MenuList has many unique systems that external AI does not know about; validate against the current codebase before removing, renaming, or downplaying a capability.
- High-value capabilities to account for somewhere in the strategy or proof system: Official Business Page, public menu/customer browsing, Menu Kit, Presence Monitor, Customer App, Temp Status, Multi-outlet, Digital Screens, MCE/MOL/snapshots, reviews/reputation, public API/POS, image/description/translation assistance.

### 6. Canonical Change Protocol
When changing the website:
1. Update locale content in `en-US.json` and `hi-IN.json` Website section.
2. Update `HomePage.tsx` section order only when the canonical page flow changes.
3. Update `main-website_content.md` with current copy and section intent.
4. Remove dead alternate-version code instead of creating backup source copies.
5. Run `npx tsc --noEmit --incremental false`, lint, build, and page checks.

### 7. New Section Checklist
When adding a new homepage section:
1. Create component in `src/components/website/home/`
2. Add translation keys to `en-US.json` → Website namespace
3. Add Hindi translations to `hi-IN.json`
4. Import and add to `HomePage.tsx` at desired position
5. Update `main-website_content.md`
6. Update `main-website_marketing.md` or the relevant `website-prep-codex-prompts/stage-*` output if it affects strategy

## File Map

```
src/app/(website)/              — Route group (all website pages)
src/app/(website)/page.tsx      — Homepage entry
src/app/(website)/layout.tsx    — Website layout + meta tags
src/components/website/         — All website components
src/components/website/home/    — Canonical homepage sections plus StickyCta
src/components/website/shared/  — Shared components
src/styles/website.css          — Website-specific CSS
public/locales/menulist.ai/     — Translation files (9 locales)
__docs__/main-website/          — Website documentation (11 files)
```

## Quick Commands

```bash
# Dev server
npm run dev

# Type check
npx tsc --noEmit

# Check website locale sync
diff <(grep -o '"[^"]*":' public/locales/menulist.ai/en-US.json | sort) <(grep -o '"[^"]*":' public/locales/menulist.ai/hi-IN.json | sort)
```
