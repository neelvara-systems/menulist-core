---
description: Working on owner-side dashboard features (projects, editor, analytics, settings, onboarding). Loads all relevant patterns, security rules, and DAL conventions. Use when building or modifying any owner-facing functionality.
---

# Owner Dashboard Feature Development

Use this workflow when working on ANY owner-side feature: projects, editor, analytics, settings, subscriptions, onboarding, team management, or dashboard views.

## Prerequisites — Auto-Load These

1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` — absolute laws
2. Read `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md` — 20 mandatory security rules
3. Read `.cascade/rules/DOCUMENTATION_ORGANIZATION_RULES.md` — doc placement rules
4. Read `__docs__/constitution/08-feature-rejection-gate.md` — 5-question gate before ANY new feature

## Feature Rejection Gate (MANDATORY before any new work)

Before writing a single line of code, answer these 5 questions from the constitution:

1. Does this feature reduce owner responsibility? (If NO → reject)
2. Can it run autonomously without owner intervention? (If NO → reject)
3. Does it preserve MenuList's authority model? (If NO → reject)
4. Is it invisible to the owner during normal operation? (If NO → reconsider)
5. Does it comply with the 3-year architecture freeze? (If NO → reject)

If ANY answer is wrong → STOP and discuss with the user before proceeding.

## Architecture Patterns (Owner Side)

### Data Access Layer (DAL)

```
Server Component (page.tsx) → DAL function (database/[module]/index.ts) → Firestore → Client Component
```

**Rules:**

- Use `DB_COLLECTIONS` constants for all collection references
- Wrap all DB operations with `apiCallComposer`
- Use `requestBodyComposer` for all write operations (auto timestamps)
- Multi-tenant paths: `{tId}/{sId}` mandatory in all queries
- Soft delete pattern: `deleted: true, deletedAt: timestamp`

### API Routes (Protected)

Every owner-side API route MUST have:

1. `withAuth()` wrapper (Rule 1)
2. `verifyTenantAccess()` for tenant data (Rule 2)
3. Zod input validation (Rule 3)
4. Rate limiting for expensive operations (Rule 5)
5. `secureLog` / `secureError` — never `console.log` (Rule 18)

### Frontend Patterns

- **Server components + DAL** for data fetching (NOT API routes for simple reads)
- **Ant Design** for UI components
- **Mobile-first** responsive design
- **SWR/React hooks** for client-side data management
- **Redux Toolkit** for global state (auth, UI preferences)
- **Feature flags** in `src/config/features.ts` for every new feature

### Owner UX Language (from Constitution)

Read `__docs__/constitution/02-language-governance.md` for owner-facing copy:

- "No action needed." (not "We recommend you check...")
- "Everything is running normally." (not "Your metrics look great!")
- "Handled automatically." (not "AI-powered optimization")
- Never use: "Smart", "AI-powered", "Dynamic", "You should..."

## Key File Locations

| Purpose          | Path                                                  |
| ---------------- | ----------------------------------------------------- |
| Auth middleware  | `src/middleware/auth.ts`                              |
| DAL functions    | `src/database/[module]/index.ts`                      |
| API routes       | `src/app/api/[route]/route.ts`                        |
| Feature flags    | `src/config/features.ts`                              |
| DB collections   | `src/config/dbCollections.ts` or constants            |
| Security logging | `src/lib/security/secureLogger.ts`                    |
| Rate limiting    | `src/lib/rateLimit/`                                  |
| Validation       | `src/lib/validation/validateAPIInput.ts`              |
| Types            | `src/components/templates/main-app/[feature]/type.ts` |

## Mobile Is Core — Not Optional (Law 11, Updated Feb 15, 2026)

> **PWA-only users are first-class citizens.** They may NEVER open the desktop dashboard.
> Mobile UI is a MANDATORY deliverable for any feature that passes the 4-gate test.

### Before implementation, run the Feature Admission Test:

1. **Frequency Gate:** Daily or multiple times/day? → Mobile candidate
2. **Speed Gate:** Completes in <5 seconds? → Mobile candidate
3. **Touch Gate:** Works with thumb-only? → Mobile candidate
4. **Value Gate:** Needed away from desk? → Mobile candidate

All 4 pass → Build mobile component IN THE SAME SESSION as desktop (not later).
Any gate fails → Desktop only. Document which gate failed in `_mobile-support.md`.

**Every feature MUST have `[feature-name]_mobile-support.md`** — even if decision is "desktop only".

### Mobile Architecture Rules

- **Parallel build:** DAL function → Hook → Desktop UI + Mobile UI (same session)
- **No new DAL for mobile:** Mobile screens use the SAME DAL functions as desktop
- **Data format parity:** Mobile MUST write identical field names, value formats, and key names as desktop
- **Icons:** `react-icons/lu` only — never mix icon libraries
- **Localization:** Mobile inherits all desktop settings (next-intl, RTL, timezone, date/time format from AppSettings Redux state)
- **Auth:** Same NextAuth session, same RBAC permissions — no separate mobile auth
- **Optimistic updates:** Mobile edits must update UI instantly, then sync to backend
- **ICP:** Non-tech SMB owner — zero jargon, large touch targets (44px min), instant feedback
- **Post-build audit:** Compare mobile screen logic line-by-line against desktop counterpart (field names, DAL return shapes, status values)

## Checklist Before Committing

- [ ] All API routes use `withAuth()` + `verifyTenantAccess()`
- [ ] All inputs validated with Zod before DB access
- [ ] All writes use `sanitizeForFirestore()` (Rule 16)
- [ ] All logging uses `secureLog`/`secureError` (Rule 18)
- [ ] Feature flag added to `src/config/features.ts`
- [ ] Owner-facing copy follows Language Governance (no forbidden phrases)
- [ ] Feature passed the 5-question rejection gate
- [ ] Documentation updated in `__docs__/[feature-name]/`
- [ ] Mobile support assessed — `_mobile-support.md` created with admission test results
- [ ] If mobile-relevant: mobile component created using existing DAL + hooks
      // turbo
- [ ] Type check: Run `npx tsc --noEmit`
