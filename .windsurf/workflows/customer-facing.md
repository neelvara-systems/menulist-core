---
description: Working on customer-facing screens and surfaces (digital menu, QR menu, screen display, public pages). Loads constitution, language governance, menu enforcement rules, and UX constraints. Use when building or modifying anything end-customers see.
---

# Customer-Facing Screens & Surfaces

Use this workflow when working on ANY customer-facing feature: digital menu, QR menu page, screen/TV display, public feedback, trust page, or any surface that end-customers interact with.

## Prerequisites — Auto-Load These (ALL MANDATORY)

1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` — absolute laws
2. Read `__docs__/constitution/README.md` — full constitution index
3. Read `__docs__/constitution/01-core-doctrine.md` — The 10 Laws
4. Read `__docs__/constitution/02-language-governance.md` — forbidden/allowed language
5. Read `__docs__/constitution/05-failure-refusal-matrix.md` — what the system refuses to do
6. Read `__docs__/constitution/08-feature-rejection-gate.md` — 5-question gate
7. Read `.windsurf/rules/menu-enforcement.md` — Digital Menu Output Constitution enforcement
8. Read `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md` — security (public routes need rate limiting)

## The 10 Laws (Always Active)

1. **Default Authority** — MenuList decides by default, not the owner
2. **Silence Is a Feature** — No banners, no nudges, no notifications
3. **No Explanations** — Never explain why a decision was made
4. **Owners Override, Systems Resume** — Owner changes are temporary, system resumes
5. **Public Surfaces Demand Perfection** — Show less, not wrong
6. **No Cognitive Load** — If it makes a customer think for 2+ seconds, don't ship
7. **No Feature Without Autonomy** — Dashboards don't qualify as features
8. **Trust > Engagement** — Optimize for zero-intervention days
9. **Humans Do Not Patch Trust** — Fix system, not story
10. **Authority Is Fragile** — Once broken, nearly impossible to restore

## Customer-Facing Surfaces Map

| Surface | Route/Path | Rendering | Key Files |
|---------|-----------|-----------|-----------|
| QR/Web Menu | `src/app/_client/[[...slug]]/` | SSR (server component → client) | `page.tsx`, `MenuContent.tsx` |
| Screen/TV Display | `src/app/screen/[token]/` | SSR + realtime listener | `page.tsx`, `ScreenDisplay.tsx` |
| Public Feedback | `src/app/api/public/feedback/` | API + client | `submit/route.ts` |
| Trust Page | (if applicable) | Static/SSR | — |

## Architecture Rules (Customer-Facing)

### Data Fetching
- **Server components + DAL** — no API routes for read-only public pages
- **`unstable_cache`** with per-store tags for cache invalidation
- **`withTimeout`** and **`withRetry`** wrappers for resilience
- **localStorage caching** on client for offline fallback (screens)

### Performance (Non-Negotiable)
- **Mobile-first** — one-hand operation, works in sunlight
- **Low bandwidth** — must work on slow 3G
- **Fast LCP** — no blocking animations, no heavy JS on initial load
- **Image optimization** — next/image, lazy loading, proper sizing
- **Offline resilience** — cached data + graceful degradation

### Security (Public Routes)
- Public endpoints MUST have `checkPublicRateLimit()` (not `withAuth`)
- Zod validation for all public input
- No sensitive data exposed in responses
- CORS validation for public APIs

### Failure Modes (from Constitution)
When things go wrong, the system MUST:
- **Missing data** → Show less, not wrong (hide section, don't show placeholder)
- **Image fails** → Graceful fallback, no broken icons
- **Slow network** → Cached data first, update silently
- **Invalid owner input** → Auto-correct or refuse, never pass through to customer

### Language Rules (STRICT)

**FORBIDDEN on customer-facing surfaces:**
- "Smart", "AI-powered", "Dynamic", "Optimized"
- "Helps you", "Assists with", "Recommends"
- "New update", "Improved", "Fresh insights"
- "Review", "Check", "Monitor", "Track"
- Exclamation marks in system messages

**USE INSTEAD:**
- "Automatic", "Handled", "Stable", "Consistent"
- Nothing at all (silence > explanation)
- Neutral, flat, calm language

### Menu Output Enforcement

When modifying digital menu output, follow `.windsurf/rules/menu-enforcement.md`:
1. **Current State Audit** — scan what exists
2. **Gap Identification** — what violates the constitution
3. **Enforcement Design** — hard constraints, not suggestions
4. **Implementation** — type locks, layout locks, build guards
5. **Defaults & Failure Modes** — always preserve readability, trust, speed

**Success criteria:** A non-technical owner CANNOT make the menu worse.

## Realtime & Caching Patterns

### Screen Display
- Firebase `onSnapshot` direct doc listener (not query) via `storeId`
- 6-hour proactive refresh to prevent memory leaks
- Daily "seen" signal for operational awareness
- `CACHE_KEY = 'menulist-screen-data'` in localStorage

### Menu Pages
- `unstable_cache` with per-store tags: `store-{storeId}-menu`
- Cache revalidation on menu save via `revalidateMenuCache` server action
- `revalidateTag` for instant invalidation

## Checklist Before Committing

- [ ] Passes the 5-question Feature Rejection Gate
- [ ] All 10 Laws compliance verified
- [ ] Language Governance — no forbidden phrases anywhere in UI
- [ ] Mobile-first — works one-handed on phone in sunlight
- [ ] Low bandwidth — tested mental model for slow 3G
- [ ] Failure modes — what happens when data is missing/images fail/network slow?
- [ ] Public routes have `checkPublicRateLimit()` + Zod validation
- [ ] No sensitive data exposed to customers
- [ ] Cache invalidation paths verified
- [ ] Offline fallback works (for screens)
- [ ] Menu enforcement rules pass (if menu output changed)
// turbo
- [ ] Type check: Run `npx tsc --noEmit`

## AutoMode Reference

Read `__docs__/constitution/04-automode-spec.md` for autonomous operation rules:
- System must operate without ANY human intervention for 12+ months
- Every customer-facing surface must self-heal
- No manual cache clearing, no manual restarts, no manual data fixes
