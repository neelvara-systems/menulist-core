# Canonica — Development Rules

> **Applies to:** All development work on Help Center / Canonica subsystems
> **Detection:** File paths containing `helpCenter/`, `helpChat/`, `knowledgeBase/`, `chatManagement/`, `supportTickets/`, `changelog/`, `feedback/`, `KBGeneration/`, `vectorEmbeddings/`, or any mention of Canonica, KB, tickets, chat monitoring, RAG, canonical answers, ontology, drift detection

---

## Rule 1: Product Identity

Canonica is the **Support Knowledge Control Plane for SaaS** — not a helpdesk, not a chatbot, not a CMS.

Before building any feature, ask:

1. Does this strengthen the canonical knowledge layer?
2. Does this improve drift detection or governance?
3. Does this increase canonical coverage?

If none → **REJECT** (see `__docs__/canonica/doctrine/02-non-goals-charter.md`).

---

## Rule 2: Architecture Pillars (5 Only)

All Canonica work must strengthen one of these pillars:

1. **Product Ontology** — Entity modeling, relationships, version binding
2. **Canonical Answer Engine** — Governed, versioned, scoped answer assets
3. **Drift Governance** — 4 drift classes, deterministic detection
4. **Signal Mutation** — Signal → mutation proposal → human approval → knowledge update
5. **API & Integration** — Public canonical API, webhooks, SDK

If work doesn't strengthen a pillar → it doesn't get built.

---

## Rule 3: Doctrine Loading (Mandatory)

Before any Canonica implementation work, read:

1. `__docs__/canonica/doctrine/01-core-doctrine.md` — Identity + pillars
2. `__docs__/canonica/doctrine/02-non-goals-charter.md` — What NOT to build
3. `__docs__/canonica/doctrine/03-infrastructure-freeze-v1.md` — Frozen architecture

---

## Rule 4: Feature Flags

All new Canonica features MUST use `ENABLE_CANONICA_*` prefix in `src/config/features.ts`:

- `ENABLE_CANONICA_ONTOLOGY`
- `ENABLE_CANONICA_CANONICAL_ANSWERS`
- `ENABLE_CANONICA_DRIFT_DETECTION`
- `ENABLE_CANONICA_SIGNAL_MUTATION`
- `ENABLE_CANONICA_PUBLIC_API`

Default: OFF. Enable gradually.

---

## Rule 5: DB Collections

New Canonica collections use `CANONICA_*` prefix in `src/constants/database.ts`:

- `CANONICA_ENTITIES`
- `CANONICA_ENTITY_RELATIONS`
- `CANONICA_CANONICAL_ANSWERS`
- `CANONICA_RELEASES`
- `CANONICA_MUTATION_PROPOSALS`
- `CANONICA_SIGNAL_EVENTS`
- `CANONICA_AUDIT_LOGS`
- `CANONICA_ENTITY_SEARCH_INDEX`

Mirror in `functions/src/constants/database.ts` (Copy-Paste As-Is Rule).

---

## Rule 6: Tenant Isolation + Multi-Product Identity

ALL Canonica documents MUST include `pId`, `tId`, `sId`. Server-enforced via CCT decode, not from MenuList session.

- `pId = "CN"` on all Canonica documents
- `tId` = Canonica client tenant ID (from client registry)
- `sId` = Canonica workspace ID (from client registry)
- `sourceContext` required on all client-originated documents (tickets, chat, feedback)
- `sourceContext` contains user identity (`uId`, `name`, `email`, `phone`) always; source product scope (`pId`, `tId`, `sId`) for cross-product only

**Never use `tenantId`, `scopeId`, `productId`. Always `pId`, `tId`, `sId`.**

@see `__docs__/canonica/doctrine/07-multi-product-tenancy.md` v4.3.0

---

## Rule 7: 3-Year Freeze Discipline

Once core schemas are implemented, they are FROZEN:

- No breaking changes to CanonicalAnswer schema
- No changes to retrieval doctrine (canonical-first)
- No changes to version semantics
- No new drift classes without RFC
- No new mutation types without RFC
- Additive fields only

See `__docs__/canonica/doctrine/03-infrastructure-freeze-v1.md`.

---

## Rule 8: Canonical-First Retrieval

When canonical answer system is live:

- Canonical answers have priority over RAG
- RAG fallback must be logged as `non_canonical`
- Recurring fallback must trigger mutation proposal
- LLM entity extraction is assistive only, never authoritative

---

## Rule 9: Documentation

All Canonica docs live under `__docs__/canonica/`:

- Feature docs: `__docs__/canonica/[feature-name]/`
- Doctrine: `__docs__/canonica/doctrine/`
- Archives: `__docs__/canonica/_archive/`

Follow same naming conventions as MenuList (`{feature-name}_{doc-type}.md`).

---

## Rule 9B: Pre-Onboarding Maintenance

The Canonica Pre-Onboarding Input Kit is a first-class onboarding surface. When Canonica Knowledge Intake, source limits, payload fields, live-support readiness gates, product-surface mapping, widget context requirements, screenshot/asset policy, or onboarding positioning changes, update all matching pre-onboarding surfaces in the same pass:

- `src/lib/canonica/preOnboardingPrompt.ts`
- `src/app/sites/canonica/pre-onboarding/page.tsx`
- `src/app/sites/canonica/pre-onboarding/guide/page.tsx`
- `src/app/sites/canonica/pre-onboarding.md/route.ts`
- `src/app/sites/canonica/pre-onboarding/owner-guide.md/route.ts`
- `src/app/sites/canonica/pre-onboarding/agent-guide.md/route.ts`
- `__docs__/canonica/pre-onboarding-input-kit/`
- Canonica resources, sitemap/site config, and LLM context links

Treat the MenuList Canonica onboarding package as the reference example for coverage quality: source-backed, owner-reviewed, private-data-safe, and explicit about production confirmation gates.

Do not hardcode the pre-onboarding process to the MenuList repo shape. Public prompt and guide surfaces must support `repo_and_website`, `multi_product_repo`, `website_only`, `docs_only`, `owner_notes_only`, and `mixed` source modes. Keep explicit copy/paste placeholders for product name, slug, website URL, app URL, repo/docs path, target product paths, excluded sister products, help docs, pricing/legal/trust/contact links, support email, product stage, source mode, approval status, screenshot permission, workspace status, and owner notes.

The 26 Canonica source families are a standardized upload/input shape, not proof that the client has all source types. Missing or inapplicable source families must be marked `Not available` or `Not applicable` with source-mode reasoning instead of invented content.

When a Canonica pre-onboarding client repo contains multiple products, apps, brands, domains, dashboards, or packages, the preparation flow must map all product-like surfaces first, target the named product only, include shared infrastructure only when support-relevant, and document sister-product exclusions. Never blend source truth across products because it lives in the same codebase.

When market-adjacent expectations appear (repo-to-docs, URL sync, OpenAPI docs, support-export FAQ generation, demo walkthroughs, screenshots, or website copy briefs), Canonica pre-onboarding may prepare review-ready briefs, source maps, scripts, FAQ seeds, and capture plans. It must not claim final public assets, legal answers, demo videos, or website copy are approved until the owner signs off.

Canonica pre-onboarding must state source-access and AI IDE capability limits plainly. It may say a package is complete for accessible source coverage only after validation. It must not guarantee perfect output across every AI IDE, private repo, login-only app, restricted website, recording, file, product shape, or model. Blocked or unavailable sources must be marked pending instead of treated as covered.

---

## Rule 11: File Organization (Product Isolation)

All Canonica-specific code lives in `/canonica/` subfolders:

```
src/components/templates/canonica/   — UI components (governance, KPI, review queues)
src/components/canonica/             — Layout components (sidebar, header, layout wrapper)
src/hooks/canonica/                  — React hooks
src/database/canonica/               — DAL functions (uses canonicaFirebaseClient)
src/lib/canonica/                    — Business logic (drift, retrieval, mutation, extraction)
src/types/canonica/                  — TypeScript types (index.ts = main types file)
src/constants/canonica/              — Constants (navigations.ts, etc.)
src/data/canonica/                   — Static data (plans.ts, etc.)
src/app/(canonica)/canonica/         — Dashboard route pages
src/app/sites/canonica/              — Public website
src/app/api/canonica/                — API routes
```

**NEVER** put Canonica files in MenuList folders (`main-app/`, `platform/`, root `constants/`, root `types/`).
**NEVER** put MenuList files in Canonica folders.
Shared infrastructure (auth, security, theme, i18n, Firebase config) stays at root — not duplicated per product.

@see `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md` STEP 11B for full multi-product pattern.

---

## Rule 10: Infrastructure Separation

Canonica has its OWN Firebase project (separate from MenuList's `ecomsai`):

- **Separate:** Firestore, Auth, Storage, Cloud Functions, App Check
- **Separate:** `canonicaFirebaseClient.ts`, `canonicaFirebaseAdmin.ts`, `canonicaConfig.ts`
- **Separate:** `functions-canonica/` directory (deploys to canonica project)
- **Separate:** `CANONICA_FIREBASE_*` environment variables

Canonica STILL shares with MenuList:

- Next.js application (same codebase, same Vercel deployment)
- DAL patterns (`apiCallComposer`, `DB_COLLECTIONS` constants)
- Security infrastructure (SAFE_MODE, rate limiting, Zod validation)
- Deployment pipeline (same Vercel project)

**Critical rules:**

- Canonica DAL files import `canonicaFirebaseClient`, NEVER `firebaseClient`
- Canonica Cloud Functions live in `functions-canonica/`, NEVER `functions/`
- Canonica NEVER reads MenuList session directly — always via CCT → `CanonicaPlatformContext`
- `requestBodyComposer` is for MenuList single-product writes only. Canonica cross-product documents are built by feature code using decoded CCT.
- No cross-project Firestore queries. Ever.

@see `__docs__/canonica/doctrine/07-multi-product-tenancy.md` v4.3.0
@see `__docs__/canonica/doctrine/08-product-separation-playbook.md`
