# MenuList — Technical Architecture Memory Pack

**Purpose:** onboarding reference for implementation, architecture, routing, and operational constraints.

## 1) Core architecture

MenuList is a Next.js App Router codebase with multiple route groups:

- `src/app/(website)/`
  Public marketing/site pages for the product and legal/marketing surfaces.
- `src/app/(main)/`
  Authenticated owner/admin product app.
- `src/app/client/[[...slug]]/`
  Tenant/public customer-facing rendering for menus and official pages.
- `src/app/(global-pages)/`
  Shared global app routes (signin/error/forgot-password, etc.).
- `src/app/sites/answerlattice`
  Answerlattice-siloed product route area (do not blend with MenuList logic).

## 2) Domain + tenant routing

- Resolver/domain mapping:
  - `src/lib/multiTenant/domainResolver.ts`
  - `src/constants/productDomains.ts`
  - `src/constants/urls.ts`
- Request transformation / headers:
  - `src/middleware.ts`
  - tenant context headers like `x-tenant-subdomain`, `x-tenant-custom-domain`
- Domain behavior is strict by product and should not be changed casually:
  - MenuList website domain vs platform domain vs tenant/public slugs
  - Answerlattice route separation preserved

## 3) Runtime layers

- **Owner app:** React + Ant Design, Redux Toolkit, shared hooks/DAL
- **Public menu/OBP rendering:** route-based tenant rendering with generated metadata/schema and discovery surfaces
- **Mobile layer:** dedicated mobile surfaces with Tailwind and shared business logic from desktop where possible; avoid desktop-only assumptions

## 4) Data layer and canonical collections

Primary data patterns in `src/constants/database.ts` map:

- Tenancy: `platformSummary`, `tenants`, `stores`
- Menu and truth: `projects`, `files`, `menuSnapshots`, `menuItemState`, `menuChangeLog`, `menuIntelligence`
- Public entities: `publicMenuDrafts`, `assets`, `campaigns`, `campaignExports`
- Decision/quality: `decisionBlocks`
- Discovery: `businessEntityIndex`, `applicationLogs`, `errorLogs`
- Public operations: `analytics`, `feedback`, `guestFeedback`, `reviews`, `reviewsState`
- Infrastructure and controls: `ops_config`, `systemHealth`, `systemAlerts`, `schedulerRunLogs`, `ownerControlUsage`
- Billing: `pricingPlans`, `subscriptions`, `subscription_payments`, `payment_transactions`, `topups`
- Auth/data support: `users`, `usersSchedules`, `AI_OPERATIONS_COLLECTIONS` collections (`aiCreditTransactions`, etc.)
- Chain/multi-location and external delivery: `masterOperationalState`, disabled GBP `integrations` scaffolding, server-only `posSyncSecrets`, bounded `stores/{sId}/posDeliveryLogs`, `messagingOnboarding*`, `businessEntityIndex`

Important: avoid changing collection contracts without audit against runtime + docs.

## 5) Security and validation constraints

- Maintain tenant isolation on every read/write path.
- Use auth/session guards as implemented for protected routes.
- Input validation and schema checks (runtime + boundary validation) should not be bypassed.
- Follow the project security rule files before touching auth/middleware/firestore-sensitive code.
- Public APIs must preserve safe public output behavior and avoid leaking sensitive content.

## 6) Cache correctness (high-risk area)

Any write path touching public truth (especially `projects`/`stores`) should consider cache invalidation for:

- menu/store public cache tags
- client/public cache helpers in `src/lib/cache/publicClientCache.ts` and `src/lib/cache/swrLocalStorageProvider.ts`
- invalidation behavior in client writes and server/API paths that render tenant pages

Skipping cache invalidation is a common regression source for stale public content.

## 7) Stack and freeze expectations

- Next.js App Router with `next` runtime 14.2.35.
- Firebase/Firestore/Auth: root client 11.7.3, root admin 12.7.0, MenuList Functions admin 13.5.0/functions 6.6.0, Answerlattice Functions admin 12.7.0/functions 5.1.1.
- NextAuth 4.24.13
- Redux Toolkit + Redux Persist
- TypeScript strict mode + Zod-style validations where applicable
- Sentry + instrumentation modules in production paths

No unnecessary framework/library swaps for "modernization" unless explicitly required, and keep `npm run verify:dependency-freeze` aligned with any intentional runtime change.

## 8) Mandatory implementation guardrails

- Use existing reusable primitives before introducing new ones.
- Feature work with runtime impact should map to `src/config/features.ts`.
- Use `react-icons/lu` (Lucide) only for iconography.
- Keep mobile touch targets accessible (large, clear interactions).
- Run type and lint checks for meaningful edits:
  - `npx tsc --noEmit --incremental false`
  - `npm run lint`

## 9) Critical file map (implementation start points)

- `AGENTS.md` (execution contract)
- `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md`
- `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
- `src/middleware.ts`
- `src/lib/multiTenant/domainResolver.ts`
- `src/constants/database.ts`
- `src/lib/cache/publicClientCache.ts` and related cache modules
- `src/app/(website)/layout.tsx`, `src/app/(website)/page.tsx`
- `src/components/website/home/HomePage.tsx`
- `src/app/client/[[...slug]]/page.tsx`
- `__docs__/constitution/01-core-doctrine.md`
- `__docs__/main-website/main-website_content.md`
- `__docs__/main-website/main-website_impl.md`

## 10) Architecture mental model for future edits

For any touched behavior:

1. Validate in docs/spec first
2. Confirm owner/public parity impact
3. Confirm tenant routing and header path behavior
4. Validate cache and write consistency
5. Run type/lint
6. Recheck UI behavior in desktop + mobile + public browser route
