---
description: Working on the main MenuList marketing website (menulist.ai). Loads website versioning rules, content governance, and component patterns.
---

# Website Workflow

Use when building or modifying anything on the main marketing website at `src/app/(website)/` or `src/components/website/`.

## Context Loading

1. Read `__docs__/main-website/README.md` — current version, architecture, file map
2. Read `__docs__/main-website/main-website_v2-hype-strategy.md` — active content strategy
3. Read `__docs__/main-website/main-website_content.md` — page-by-page copy reference
4. Read `__docs__/main-website/main-website_design-system.md` — colors, typography, spacing

## Website Rules (MANDATORY)

### 1. Version Awareness
- **Current version:** v2 Hype/Domination (March 2026)
- **Previous version:** v1 Infrastructure Calm (backed up in `main-website_v1-infrastructure-backup.md`)
- Check `main-website_v2-hype-strategy.md` for active positioning before making copy changes

### 2. i18n Enforcement (Pattern 9 from Master Execution Prompt)
- NEVER hardcode user-visible strings in website components
- ALL text MUST use `useTranslations('Website')` with keys from locale JSON files
- Add key to `en-US.json` → Website namespace
- Add Hindi translation to `hi-IN.json` → Website namespace
- Other 6 locales fall back to English via deepMerge

### 3. Content Governance
- v2 tone: Direct, transformation-focused, energetic
- Core message: "Upload your menu. Your business is online."
- Key phrases: "One menu. Everywhere customers look." / "Businesses update menus. The internet doesn't."
- STILL FORBIDDEN: "AI-powered", "Smart", "Intelligent", "Dynamic", "Revolutionary", exclamation marks
- NOW ALLOWED: Direct transformation statements, action-oriented CTAs, "Free to start"
- Hype comes from TRANSFORMATION, not language

### 4. Component Architecture
- Shared: `SectionWrapper`, `SectionHeading`, `AnimateOnScroll`, `WebsiteButton`
- Each section is a standalone component in `src/components/website/home/`
- Section order defined in `HomePage.tsx` — change order there, not in individual components
- All pages under `src/app/(website)/` route group

### 5. Feature Preservation Rule
- NEVER remove existing sections or features from the website
- MenuList has 14+ unique features that competitors don't have
- ChatGPT/external AI doesn't know about these features — always preserve them
- Features to always keep visible: Launch Kit, Decision Blocks, MCE, Special Menu Switching, Temp Status, Multi-outlet, Digital Screens, AI Images/Descriptions/Translations

### 6. Version Switching Protocol
When switching website versions:
1. Update locale content in `en-US.json` and `hi-IN.json` Website section
2. Update `HomePage.tsx` section order
3. Update `main-website_content.md` with new copy
4. Create/update backup doc for previous version
5. Run `npx tsc --noEmit`

### 7. New Section Checklist
When adding a new homepage section:
1. Create component in `src/components/website/home/`
2. Add translation keys to `en-US.json` → Website namespace
3. Add Hindi translations to `hi-IN.json`
4. Import and add to `HomePage.tsx` at desired position
5. Update `main-website_content.md`
6. Update `main-website_v2-hype-strategy.md` if it affects strategy

## File Map

```
src/app/(website)/              — Route group (all website pages)
src/app/(website)/page.tsx      — Homepage entry
src/app/(website)/layout.tsx    — Website layout + meta tags
src/components/website/         — All website components
src/components/website/home/    — Homepage sections (14 files)
src/components/website/shared/  — Shared components (7 files)
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
