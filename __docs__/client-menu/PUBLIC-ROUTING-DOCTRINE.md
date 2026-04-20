# Public Routing Doctrine — Single Source of Truth

> **Status:** 🔒 LOCKED — do not reopen without explicit override
> **Scope:** All public customer-facing URLs, the menu landing screen, QR strategy, PWA install behavior, and in-app navigation semantics.
> **Supersedes:** Any conflicting statements in `__docs__/client-menu/README.md`, `__docs__/client-menu/MULTI-TENANT-ARCHITECTURE.md`, `__docs__/url-routing-architecture/README.md`, or the `HomePageNew` / `PageType.HOME` intro-screen pattern.
> **Companion:** `__docs__/url-routing-architecture/url-routing-architecture_adr.md` (ADR-1…ADR-11) still governs slug/subdomain/outlet infrastructure. This doctrine resolves the **strategy layer above it** (when to show OBP, what the store surface _is_, how QR/PWA behave).

---

## 0. How to read this doc

Every substantive decision in the ChatGPT strategy conversation is evaluated here as one of:

- ✅ **Agreed — already implemented** (no code change required, but doctrine locks it in)
- 🟡 **Agreed — needs code change** (decision accepted, implementation gap exists)
- ⚠️ **Partially agreed** (accepted with a caveat or constraint)
- ❌ **Rejected** (with grounded reason from the codebase)
- ➕ **Added by Cascade** (not in the conversation, but material — surfaced at §12)

Each decision cites the exact file/line evidence it is based on. No claim in this doc is made without grounded evidence.

---

## 1. Authority & Non-Negotiables

1. **Tenant URL always resolves to OBP.** No conditional auto-forward to a menu. This is locked — see §5 Decision D-06. `@/src/app/client/[[...slug]]/page.tsx:977-986`.
2. **`Tenant → Store → Project` is the only entity hierarchy.** No fourth layer. No merging of layers.
3. **One canonical URL per resource.** Duplicates must 301-redirect to the canonical (never both resolve 200).
4. **QR permanence is sacred.** Printed QR must survive renames, migrations, and business-model changes. Every public URL must have a redirect path.
5. **Customer time-to-menu is the ship criterion.** If a routing decision adds a click without adding customer value, it is wrong.

---

## 2. Entity Model (locked)

```
Tenant   — billing / account container (never public-facing)
  └── Store (outlet)  — rendering unit: identity, hours, domain, QR target
        └── Project  — menu content (food menu, bar menu, services menu, …)
```

**Public-facing representation of Tenant is the master store.** The public system does not fetch the `Tenant` document for rendering — `@/src/types/platform/tenant.ts:12-13` codifies this. "Brand" = master store. When this doctrine says "tenant URL" in user-facing language, it technically means "master-store-rooted subdomain or custom domain."

Evidence in code:

- Master flag: `StoreDataType.isMaster` → `@/src/app/client/obp/OBPContent.tsx:266`
- Multi-store detection: `countActiveStoresForTenant` → `@/src/app/client/obp/OBPContent.tsx:267-274`

---

## 3. URL Architecture (canonical matrix)

### 3.1 Definitions

| Term                     | Meaning                                                                                                        | Code reference                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Tenant URL**           | Root of the subdomain or custom domain                                                                         | `@/src/lib/obp/generateOBPUrl.ts:16-21`                                                |
| **Store URL**            | `/{outletSlug}` under the tenant                                                                               | `getStoreByOutletSlug` @ `@/src/lib/firestore/clientStoreLookup.ts:77-94`              |
| **Project URL**          | `/{projectSlug}` (single-store) or `/{outletSlug}/{projectSlug}` (multi-store)                                 | `getProjectBySlugOrDefault` @ `@/src/app/client/[[...slug]]/page.tsx:121-245`          |
| **Reserved slug `menu`** | Alias for "default project" — resolves via the default-project resolver, not as a literal project named "menu" | `@/src/app/client/[[...slug]]/page.tsx:988-989`; `@/src/constants/reservedSlugs.ts:16` |

### 3.2 Canonical resolution matrix — locked

| # of Stores | # of Projects | Tenant URL `/`                           | Store URL `/{outletSlug}`                      | Project URL                   | Notes         |
| ----------- | ------------- | ---------------------------------------- | ---------------------------------------------- | ----------------------------- | ------------- |
| 1           | 1             | OBP (store) + single "View Menu"         | _(hidden — single-store collapses store slug)_ | `/{projectSlug}` direct       | Simplest case |
| 1           | N             | OBP (store) + project list or single CTA | _(hidden)_                                     | `/{projectSlug}` direct       | §5 D-04       |
| N           | 1 each        | **Brand OBP** (location selector)        | Outlet OBP + single "View Menu"                | `/{outletSlug}/{projectSlug}` | §5 D-07       |
| N           | N each        | **Brand OBP** (location selector)        | Outlet OBP + project list                      | `/{outletSlug}/{projectSlug}` | §5 D-07       |

**"Hidden"** means: for single-store tenants, no `/{outletSlug}` public URL is advertised or canonicalized. The store concept still exists in data (non-negotiable), but there is no second URL layer to navigate.

### 3.3 The `/menu` path — clarification

`/menu` under the **R5 model** (§9) has two-layer resolution:

- **Layer 1 — owner claim:** if a project on this store has slug `menu`, `/menu` resolves to that project via normal slug lookup. Canonical URL _is_ `/menu`. Owner-controlled.
- **Layer 2 — universal alias fallback:** if no project has slug `menu`, `/menu` returns 200 serving the default project (`isDefault: true`), with `<link rel="canonical" href="/{defaultProjectSlug}">` pointing at the real canonical URL. Universal invariant preserved.

Practical consequences:

- Owner naming "Menu" → `/menu` is their canonical URL. Owner naming "Food Menu" → `/food-menu` is canonical, `/menu` still works as alias. Every store has `/menu` working regardless of naming choices.
- `menu` is **not reserved** in `RESERVED_PROJECT_SLUGS`. Owners can claim it via project naming.
- OBP's "View Menu" CTA links to the default project's **real canonical slug URL** — preserving canonical URL cleanliness. `/menu` alias exists for customer-typed URLs, printed QRs, voice ("go to mybrand.menulist.ai slash menu"), and protocol-level muscle memory — not as the emitted URL.
- Subdomain `menu.menulist.ai` stays blocked in `RESERVED_SUBDOMAINS` (platform-level infrastructure concern, unrelated to per-store project slugs).

---

## 4. Decision log — each ChatGPT point evaluated

### D-01. Remove the `HomePageNew` "View Menu" intro screen

**Conversation position:** Remove it. OBP now owns the "entry gateway" job, so the in-menu intro screen is a second redundant gateway.
**My verdict:** ✅ **Agreed — needs code change.**
**Why:** Today the customer path is `OBP → click View Menu → /menu → HomePageNew intro → click View Menu → MenuPageNew`. Two gateways. Evidence:

- OBP CTA: `@/src/app/client/obp/OBPMenuCTA.tsx:30-39`
- Menu-internal intro with its own "View Menu" button: `@/src/components/templates/main-app/projects/b2cView/homePage/homePageNew.tsx:172-182`
- State router that renders HOME before MENU: `@/src/components/templates/website/mainContentRenderer/index.tsx:49-66`
- State default is `HOME`: `@/src/components/templates/website/clientWebsite/index.tsx:81-84`

**Lock:** When a customer arrives at a project URL (whether via OBP click, direct link, QR, or PWA), the first render **must** be `MenuPageNew` (actual listing). `PageType.HOME` is deleted from the public runtime. The `homeStyle` design tokens (simple/premium/bold) become redundant for the public path; in the owner editor they may still exist for preview/marketing snapshots but are **not** part of the customer surface.

**Migration of the owner editor:** `@/src/components/templates/main-app/projects/b2cView/types.ts:1-9` (`pageOptions` with HOME + MENU) should collapse to Menu-only in the public renderer. The editor preview pane may retain both for legacy authored content, but the published surface ignores HOME state.

### D-02. Single-store hides the store slug in public URLs

**Conversation position:** Hide `/{outletSlug}` for single-store; keep it in the data model.
**My verdict:** ✅ **Agreed — already implemented.**
**Why:** `[[...slug]]/page.tsx` only runs the outlet-slug branch when `storeData.isMaster && multi-outlet flag && storeData is master of a multi-store tenant`. Single-store stores never expose `/{outletSlug}`. Evidence: `@/src/app/client/[[...slug]]/page.tsx:787-798`.
**Lock:** Store concept remains mandatory in Firestore for every tenant (even single-store). Public URL suppression is a rendering decision, not a data decision. If a single-store tenant later adds a second outlet, ADR-11 already governs the migration — **see §10 for the exact policy.**

### D-03. Store URL behavior with multiple projects — selector vs. default project

**Conversation position (user):** Always show selector.
**Conversation position (ChatGPT):** Selector only when no dominant default exists; otherwise open default with switcher.
**My verdict:** ⚠️ **Partially agreed — revised for MenuList reality.**
**Why:** A "designated primary" already exists in our model — `isDefault: true` on project metadata (`@/src/app/client/[[...slug]]/page.tsx:211`). Forcing a selector even when 95% of traffic goes to the default menu would add a click that the owner never intends. But the store surface must still _expose_ the other projects or they become invisible.
**Lock — Store URL `/{outletSlug}` behavior (multi-store tenants only, since single-store hides this URL):**

1. Always renders the **outlet OBP** (not a bare selector page, not the menu directly).
2. OBP exposes the default project as the primary CTA. All other active projects remain reachable from the same surface — the exact UI treatment (inline cards, a single "More menus" affordance, or a disclosure) is a **design decision, not a doctrine decision**, and is delegated to the design team.
3. There is **no intermediate "selector-only" page** — all project access lives _within_ OBP, which also carries hours, status, actions, and trust signals. This unifies the store surface.

This gives the user the selector they wanted without inventing a third surface type, and leaves the UI judgment (when to inline vs. when to collapse) to the people who own the design system.

### D-04. Project switching inside the menu

**Conversation position (user):** Yes, allow in-menu switching.
**Conversation position (ChatGPT):** Allow only as secondary convenience, never as primary navigation.
**My verdict:** ⚠️ **Agreed with ChatGPT's constraint, not the user's unconditional yes.**
**Why:** Making project switching a primary in-menu control creates exactly the "tabs not URLs" pattern ChatGPT warned about: share-link ambiguity, weaker canonical structure, analytics confusion. Our own resolver assumes one URL = one project (`@/src/app/client/[[...slug]]/page.tsx:181-217`); in-menu tabs would undermine this.
**Lock:**

- In-menu project switching **must** be a real URL navigation (full route change to `/{outletSlug}/{otherProjectSlug}` or `/{otherProjectSlug}`), never an in-place state swap.
- It appears only for stores with ≥2 active projects.
- It is **not** in primary nav (not top bar, not header logo, not sticky). Acceptable placements: a subtle switcher in the header overflow, or a footer section. Tabs at the top of the menu are forbidden.
- Analytics must emit a `project_switch` event with `from_project_id` / `to_project_id` so we can measure friction.

### D-05. Project switcher mechanics — URL navigation vs. in-place state

**Conversation position:** Undecided in conversation.
**My verdict:** ✅ **Locked: full URL navigation only.**
**Why:** Same reasoning as D-04. State-only switching weakens canonical URL guarantees that QR / SEO / PWA all depend on.

### D-06. Should OBP exist for single-store businesses? / Tenant URL always resolves to OBP

**Conversation position (user, final):** Every client always gets an OBP; tenant URL is always OBP.
**My verdict:** ✅ **Agreed — already implemented (flag ON).**
**Why:** `ENABLE_OBP = true` at `@/src/config/features.ts:927`. Root-without-slug already routes to OBP: `@/src/app/client/[[...slug]]/page.tsx:977-986`. Single-store tenants get single-store OBP; multi-store tenants get `BrandOBPContent` (location selector).
**Lock:** `ENABLE_OBP` is treated as permanently ON. The feature flag remains in code for emergency rollback only; any product decision that assumes "maybe OBP is off" is invalid.

### D-13. Identity is the immutable ID; slugs are lookup handles

**Conversation position:** Added in second ChatGPT review.
**My verdict:** ✅ **Locked — must be explicit.**
**Why:** This is already how the resolver works in practice (which is why `previousSlugs[]` can 301-redirect — the underlying document has a permanent `projectId` / `storeId` / `tenantId`, and slug lookups converge on those IDs). But nothing in the codebase **states** this as doctrine. Without an explicit rule, a future engineer could reasonably:

- Use a slug as a Firestore document key.
- Cache data keyed by slug across requests (breaks on rename).
- Emit analytics with slug as the resource identifier.
- Build a short-link service that encodes slug in the short code and never re-resolves.

Any of these quietly destroys QR permanence.

**Lock:**

1. **Identity = immutable ID.** `tenantId`, `storeId`, `projectId` are the identity of the resource. They are never re-assigned. They are the keys for cache, analytics, billing, permissions, and all cross-system references.
2. **Slug = a lookup handle that can change.** Current slug, `previousSlugs[]`, `outletSlug`, `subdomain`, and `customDomain` are all lookup handles. Any of them can be renamed (subject to the governance in §7) without the resource's identity changing.
3. **Every public URL resolution converges on an ID within the first resolver hop.** After `getStoreBySubdomain`, `getStoreByCustomDomain`, `getStoreByOutletSlug`, and `getProjectBySlugOrDefault` return, the rest of the request pipeline operates on IDs, not slugs.
4. **Analytics events carry IDs as the primary dimension.** Slugs may ride along for debugging, but queries and rollups MUST key on IDs.
5. **No external system is given a slug as a stable reference.** Webhooks, integrations, AI-context exports, QR short links — all carry IDs, not slugs. Slugs are presentation only.

### D-14. No ambiguous heuristic routing — resolution order is explicit and deterministic

**Conversation position:** Added in second ChatGPT review.
**My verdict:** ✅ **Locked.**
**Why:** The resolver has real precedence rules (most visibly at `@/src/app/client/[[...slug]]/page.tsx:787-798`: _if_ master store _and_ multi-outlet flag _and_ slug matches an outletSlug _then_ switch to outlet store, else fall through to project-slug lookup). That logic is deterministic today, but the doctrine never stated it as such. Over time, teams accumulate "just one more conditional" until routing becomes a heuristic pile nobody can reason about.

**Lock — the resolver order for any public path `/a/b` on any tenant is exactly this, in this sequence, with no other ordering permitted:**

1. Tenant resolution — by hostname (subdomain or verified custom domain) → returns the master store.
2. If no path segments (`/`) — render OBP (brand OBP if multi-store, store OBP if single-store). Stop.
3. If master store `isMaster` AND multi-outlet enabled AND first segment matches an `outletSlug` (current or `previousSlugs[]`) on the tenant — switch context to that outlet store. Continue with remaining segments.
4. If one segment remains and it matches a project slug (current or `previousSlugs[]`) on the current store — resolve that project. Under R5, this includes the literal slug `menu`: if the owner has authored a project with slug `menu`, step 4 resolves it here directly (owner-claimed canonical URL).
5. **`/menu` universal-alias fallback:** if the segment is exactly `menu` AND step 4 did not resolve (no project on this store has slug `menu` or its alias in `previousSlugs[]`) — serve the project flagged `isDefault: true` as an alias. The response returns 200 with the default project's content and a `<link rel="canonical" href="/{defaultProjectSlug}">` pointing at the real canonical URL. This is an explicit, deterministic fallback — not a heuristic — and is intentional per R5 (§9).
6. If segment is empty after outlet switch — render outlet OBP. Stop.
7. Otherwise — fall back: store OBP with a "menu not available" hint (not a hard 404) per A-12. The `/menu` alias in step 5 must never reach this step; if no `isDefault` project exists on a store, `/menu` falls through to step 7 like any other unresolvable path.

**No step may be added, re-ordered, or made conditional on store configuration without a doctrine amendment.** Feature flags that change ordering are forbidden; feature flags that disable a whole branch (e.g. the outlet-switch branch when multi-outlet is off for a tenant) are acceptable. Step 5 is the only resolver step that applies to a specific literal slug (`menu`); no other slug-specific resolver steps may be added without a doctrine amendment.

### D-15. Performance bound on public routing

**Conversation position:** Added in ChatGPT R5 review.
**My verdict:** ✅ **Locked.**
**Why:** Without a performance bound, the resolver order in D-14 governs correctness but not cost. A future engineer could add a step that scans all projects on a store to find a match, or fans out across all outlets of a tenant — correct by D-14, ruinous for Firebase cost and latency.

**Lock — hard ceilings on public routing resolution:**

1. **Read budget per request:** at most 3 cached Firestore reads at steady state:
   - 1 for store (via `getStoreBySubdomain` / `getStoreByCustomDomain`)
   - 1 for outlet switch when applicable (via `getStoreByOutletSlug`)
   - 1 for project (via `getProjectBySlugOrDefault`)
     The `/menu` alias fallback (D-14 step 5) is served from the same project read that would have returned the default project — **it does not add a read.**
2. **No sequential multi-entity iteration.** Resolution steps must use indexed lookup by key, never scan-and-match (e.g., "iterate all projects on this store looking for slug match" is forbidden; "index on slug and look up directly" is required).
3. **No fanout beyond the locked resolver order.** A step may not spawn parallel queries across entities to find a match. The resolver walks one path.
4. **Cache invariance.** All three reads above are served from `unstable_cache` with `revalidate: 60` and per-resource tags. A cache miss path must not exceed the above budget either.
5. **No middleware-level Firestore access.** Edge middleware (`src/middleware.ts`) must resolve hostname context using only the request headers and constants — never a Firestore read. This is already how the code behaves (`domainResolver.ts` is Edge-safe); doctrine locks it.

**Enforcement checkpoint:** Any PR that adds or modifies a step in D-14 must either demonstrate it fits inside these ceilings or attach an explicit doctrine-amendment note lifting them. No silent drift.

### D-07. What is the "Store surface"? (ChatGPT's biggest unresolved question)

**Conversation position:** Undecided. ChatGPT asked whether store is a minimal selector or a mini-OBP.
**My verdict:** ✅ **Locked: the store surface IS the OBP for that outlet.**
**Why:** We already emit `BrandOBPContent` at `/` for multi-store tenants (location selector) and `OBPContent` at `/` for single-store (full OBP). The right extension is: `/{outletSlug}` (multi-store only) also renders `OBPContent` — scoped to that outlet. One reusable surface type, three invocations:

1. `/` on single-store tenant → `OBPContent` (store = master, one outlet)
2. `/` on multi-store tenant → `BrandOBPContent` (location selector)
3. `/{outletSlug}` on multi-store tenant → `OBPContent` (store = that outlet)

This collapses the "Store vs OBP" false choice. Store surface ≡ outlet OBP.
**Gap:** Today, `/{outletSlug}` under a multi-store brand **jumps straight to the outlet's default project**, not the outlet OBP. See §11 Gap G-01 for the required fix.

### D-08. QR strategy — three layers

**Conversation position:** Three QR levels — Business (tenant), Store (outlet), Project (deep link). Default printed QR = Store.
**My verdict:** ✅ **Agreed — needs code change (major gap).**
**Why:** Today the only QR generator is project-level in the share modal (`@/src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:110-124, 281-291`). There is no "Business QR" or "Store QR" concept anywhere.
**Lock — three QR products, exposed side-by-side in owner UI:**

| QR              | Encodes                                                             | Default in dashboard                            | Use case                                                 |
| --------------- | ------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| **Business QR** | Tenant URL (root)                                                   | Secondary                                       | Instagram bio, brand marketing, multi-location discovery |
| **Store QR**    | Store URL (single-store: tenant root; multi-store: `/{outletSlug}`) | **Primary — this is the "Download QR" default** | Tables, storefront, packaging                            |
| **Project QR**  | `/{projectSlug}` or `/{outletSlug}/{projectSlug}`                   | Advanced / opt-in                               | Bar counter (bar menu), dessert stand, salon services    |

**Labeling in owner UI (locked wording — no "menu" jargon for business/store QRs):**

- "Business Profile Link" (QR for tenant)
- "Store Menu Link" (QR for store — primary recommendation)
- "Project Menu Link" (QR for specific project — advanced)

**Critical constraint:** For a single-store tenant, Business QR and Store QR encode the **same URL** (the tenant root). The UI must either (a) surface only the Store QR and mention it also serves as the Business QR, or (b) show both but mark them as equivalent. Never print the same QR twice as if they were different products.

### D-09. Owner prints QR per project? / Store-level QR as default

**Conversation position:** Store QR is the operational default; per-project QR is optional for physical contexts.
**My verdict:** ✅ **Agreed — aligns with D-08.**
**Lock:** Owner dashboard's primary "Get QR" action produces the **Store QR**. The project-level QR currently in the share modal stays, but is re-labeled and demoted to "Project Menu Link (advanced)". See G-06.

### D-10. PWA install target — respect install context

**Conversation position (user, final):** Install context is preserved — OBP install opens at OBP, Store install opens at Store, Project install opens at Project. Install from all three surfaces is allowed.
**My verdict:** ✅ **Agreed — needs code change.**
**Why:** Today `buildManifest()` always sets `start_url: '/'` (`@/src/lib/pwa/manifestGenerator.ts:104, 153`). Every PWA install lands at OBP regardless of where the install prompt fired. This violates "install source = launch source."
**Lock — PWA install context preservation:**

1. The `manifest.webmanifest` route must accept the current page path as context and emit a `start_url` matching the current canonical surface:
   - Called from `/` → `start_url: '/'`
   - Called from `/{outletSlug}` → `start_url: '/{outletSlug}'` _(multi-store)_
   - Called from `/{outletSlug}/{projectSlug}` → `start_url: '/{outletSlug}/{projectSlug}'`
   - Called from `/{projectSlug}` → `start_url: '/{projectSlug}'` _(single-store)_
2. `start_url` is **frozen at install time** by the browser. Subsequent navigation does not update the installed app's launch target. This is correct (predictability).
3. Only the three canonical surfaces (OBP root, Store, Project) are eligible install sources. Transient states (search filters applied, modal open, project selector mid-scroll) must not be install targets — guard by checking the canonical URL equals one of the three patterns before firing the install prompt.
4. The manifest `id` field (currently `/?store=${id}` @ `@/src/lib/pwa/manifestGenerator.ts:152`) must also encode the install surface, otherwise Chrome treats multiple install targets on the same origin as the _same_ app and blocks the second install. Proposed: `id: /?store=${id}&surface=obp` / `&surface=store:${outletSlug}` / `&surface=project:${projectSlug}`.
5. `scope` remains `/` (so the installed app can navigate across the full tenant), but `start_url` is the launch anchor.

**Fallback when the install target no longer resolves** (e.g., project deleted): the app must not show a hard 404. It must gracefully fall back up the hierarchy — Project → Store → OBP root. Implementation: `[[...slug]]/page.tsx` already has a "Menu Not Found" inline state (`@/src/app/client/[[...slug]]/page.tsx:826-837`); this needs a "Go to business home" link and, for installed PWAs (detected via display-mode: standalone), auto-redirect up one level after 2s with a visible hint.

### D-11. Install CTA on Store surface

**Conversation position (user):** Must be allowed.
**My verdict:** ✅ **Agreed** (aligned with D-10).

### D-12. Navigation semantics — back, logo, footer, switchers

**Conversation position (user + ChatGPT):** Back = up the hierarchy. Header logo = Store. Footer brand = OBP. Business info = explicit action → OBP. Store switcher lives only at OBP.
**My verdict:** ⚠️ **Partially agreed — browser back is not intercepted.**
**Why:** ChatGPT raised the critical edge case: if a user lands via Google search or a pasted link on `/pune/food-menu`, intercepting browser back forces them into a site surface they never intended to visit. It also fights the browser's own navigation model and can break Android gesture-back. Intercepting back is a well-known anti-pattern in public web surfaces. Conclusion: **use explicit in-app "up" controls; do not touch browser back.**

**Lock — navigation behavior matrix, Project page (`/{outletSlug}/{projectSlug}` or `/{projectSlug}`):**

| Control                                   | Destination                                                   | Rationale                          |
| ----------------------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| Browser back                              | Native (whatever history has)                                 | Never fight the browser            |
| Header logo click                         | Store OBP (= `/{outletSlug}` multi-store; = `/` single-store) | "Menu home" meaning                |
| Breadcrumb link to Business               | OBP root (`/` — master/tenant root)                           | Deliberate jump to brand           |
| Breadcrumb link to Store                  | Store URL                                                     | One-level up                       |
| In-menu project switcher                  | Navigate to other project URL (D-05)                          | Canonical URLs preserved           |
| Footer brand/logo                         | OBP root (`/`)                                                | Brand-level entry point            |
| "Business Info" explicit CTA (if exposed) | OBP root (`/`)                                                | Same as footer brand — consistency |
| Store switcher                            | **Not exposed inside menu.** Route via OBP.                   | Avoid level-mixing per ChatGPT     |

**Breadcrumb in schema.org:** already emitted (`buildBreadcrumbList` @ `@/src/app/client/[[...slug]]/page.tsx:896`). Extend to visually render on project pages so the "up" path is always visible — same reasoning as ChatGPT's breadcrumb suggestion. For multi-store, three nodes: Business → Store → Project. For single-store, two nodes: Business → Project.

---

## 5. QR strategy — detailed rules

See D-08 / D-09 for the core decision. Additional rules:

1. **Every QR encodes a canonical URL** — not a short link, not a redirect chain. Short links are acceptable only as display (`shortLink` in `MenuKitSection` @ `@/src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:373`), never as the QR value.
2. **QR URLs must include no query params that break caching** (no `?src=qr` in the QR itself — track via the scan landing using session attribution instead). The `?src=copy` seen in the share-modal URLs is for link sharing, not QR.
3. **Slug rename → QR survival** is already guaranteed by `previousSlugs[]` 301 redirect (ADR-3, implemented at `@/src/app/client/[[...slug]]/page.tsx:196-206`). This extends to Project QR automatically.
4. **Store-slug rename and subdomain rename do NOT currently have an equivalent redirect chain.** This is a cliff we are about to walk off. See §12 additions A-02 / A-03.

---

## 6. PWA install strategy — detailed rules

See D-10 for the core decision. Additional rules:

1. **Per-surface manifest** — the manifest route must produce a different `id` per install surface (OBP, Store:X, Project:Y). Without this, Chrome coalesces installs.
2. **Shortcuts inside manifest** stay store-level (phone, directions, WhatsApp). These are actions, not surfaces; they don't need to change per install target. `@/src/lib/pwa/manifestGenerator.ts:119-121` handles this via `shortcutsBuilder` — no change needed.
3. **Install prompt eligibility** (`CustomerAppController`) must check that the current URL matches one of the three canonical patterns before showing the prompt. Patterns that should suppress the prompt: inside a modal, on a not-found state, on a transient redirect page.
4. **Analytics on install** must record which surface triggered it (`install_surface: 'obp' | 'store' | 'project'`) so we can measure which surface converts best. Extend existing `CustomerAppController` instrumentation.

---

## 7. Slug governance (already architected — recorded for completeness)

| Concern                 | Current rule                                                                 | Source                                   |
| ----------------------- | ---------------------------------------------------------------------------- | ---------------------------------------- |
| Project slug generation | Auto from name via `slugify` on creation                                     | `@/src/lib/utils/slugify.ts`             |
| Project slug rename     | Max 2 renames, old slugs stored in `previousSlugs[]` (cap 5), 301 redirect   | ADR-3, ADR-10                            |
| Reserved project slugs  | 52 entries blocked at creation/rename                                        | `@/src/constants/reservedSlugs.ts:14-56` |
| Reserved outlet slugs   | Includes all project reserves + `locations, stores, outlets, branches, main` | `@/src/constants/reservedSlugs.ts:62-70` |
| Reserved subdomains     | 24 entries                                                                   | `@/src/constants/reservedSlugs.ts:76-81` |
| Slug uniqueness scope   | Unique _within a store_ (not global)                                         | ADR-3                                    |
| Slug format             | `slugify()` — lowercase, alphanumeric + hyphens                              | `@/src/lib/utils/slugify.ts`             |

**Doctrine additions (not yet implemented — see §12 A-02):**

- Outlet slug rename must follow the same `previousSlugs[]` + 301 mechanism as project slugs. Otherwise renaming Pune → Pune West breaks every printed Store QR in that outlet.
- Subdomain rename must follow the same mechanism (or be disallowed after first publish). Otherwise renaming breaks every link, every QR, every installed PWA on that subdomain.

---

## 8. Canonical URL rules

1. **One 200 response per resource.** All other paths that resolve to the same resource must 301-redirect.
2. Enforced by:
   - Subdomain → verified custom domain 301: `@/src/app/client/[[...slug]]/page.tsx:777-780`
   - Project `previousSlugs[]` → current slug 301: `@/src/app/client/[[...slug]]/page.tsx:846-855`
   - Trailing slash + lowercase normalization at middleware (ADR-6)
3. **`/menu` has two-layer resolution under R5.** If a project with slug `menu` exists on the store, `/menu` is its canonical URL (no alias involved). If no such project exists, `/menu` serves the default project as an alias with `<link rel="canonical">` pointing at the default project's real slug URL — resolving canonical ambiguity at the SEO layer. See §9 R5 for the full rationale.

---

## 9. `/menu` — two-layer resolution (R5, final)

**Corrected one final time (user+ChatGPT R5 synthesis, agreed after cross-challenge).** R4 was right that owners should be able to claim `/menu`. R3 was right that every business should have a working `/menu` endpoint. Neither position alone was correct because they were treated as exclusive. **R5 is the synthesis: owner-claim layer on top, universal-alias layer underneath.**

### The R5 model

1. **Layer 1 — owner claim (canonical):** `menu` is NOT reserved. If an owner creates a project named "Menu" (slug `menu`), it is theirs. `/menu` resolves to that project via normal slug lookup — `/menu` is the canonical URL for that project, indexed normally, no aliasing involved.
2. **Layer 2 — universal alias (fallback):** if no project on the store has slug `menu` (and no `previousSlugs[]` match for `menu` either), `/menu` returns 200 serving the project flagged `isDefault: true` as an alias. The response emits `<link rel="canonical" href="/{defaultProjectSlug}">`, so the real project slug (e.g., `/food-menu`, `/services`, `/carta`) is what Google indexes — not `/menu`.
3. **No reservation.** `menu` is removed from `RESERVED_PROJECT_SLUGS`. Owners who want `/menu` to be their canonical URL name their project "Menu". Owners who don't still get `/menu` as a working fallback.
4. **No ambiguity.** The resolver precedence is fixed in D-14 step 5: owner claim always wins over alias fallback. If both would match, Layer 1 takes precedence by construction (it's checked first).

### Why R5 is the correct final answer

**From R3, R5 keeps:**

- Universal `/menu` endpoint works on every MenuList business. Muscle memory, protocol-level predictability, voice affordance ("go to `mybrand.menulist.ai/menu`"), QR fallback, PWA fallback ladder (A-12).
- ChatGPT's principle — **do not make invariants depend on user-authored content** — is respected. `/menu` works regardless of whether the owner thought to name their project "Menu."

**From R4, R5 keeps:**

- Owner control. An owner who wants their project to _be_ at `/menu` (not just aliased there) can achieve this by naming it "Menu." The URL then tells the truth about what the project is called.
- Canonical URL cleanliness. SEO sees one indexed URL per project. The alias (Layer 2) emits a canonical tag pointing at the real slug, preventing duplicate-indexing.
- No platform magic beyond the single, explicit Layer 2 step in D-14.

**What R5 does not inherit from either R3 or R4:**

- From R3: it drops the reservation. Owners can claim `menu`.
- From R4: it drops the "no fallback" rigidity. `/menu` works even for stores that didn't name anything "Menu."

### Addressing the earlier objections

- **R3 objection (salon's `/menu` serves "Services" — misleading):** Re-evaluated and accepted as overweighted. `/menu` at platform scope means _primary customer-facing offering surface_, not restaurant-specific food menu. Platforms define their own conventions; customers learn them. Amazon's `/orders` serves different content on different business types; users handle it. This is not a real product problem.
- **R4 objection (R3 imposes a platform concept the slug system doesn't need):** Re-evaluated. The platform concept exists for a reason — universal invariants are load-bearing for QR, PWA, voice, and muscle-memory affordances. Eliminating the concept in the name of slug-system purity traded away real value for theoretical cleanliness.

### Implementation consequences (mirrored in G-05)

- `menu` is removed from `RESERVED_PROJECT_SLUGS` at `@/src/constants/reservedSlugs.ts:16`.
- `generateMenuUrl()` at `@/src/lib/obp/generateOBPUrl.ts:26-32` is retained but its role is now narrow: emit the URL `/menu` for contexts where the alias affordance matters (voice prompts, "easy URL for signage" helper text in the dashboard, QR download for the Store QR on stores without an owner-claimed `/menu` project). OBP's "View Menu" CTA still links to the default project's **real canonical slug** via a new helper `getDefaultProjectUrl(store)`, because the CTA is an internal emitter and must always use the canonical URL — not the alias. The alias is for human-facing contexts (manual URL entry, print, voice), not internal link emission.
- The resolver in `[[...slug]]/page.tsx` adds the Layer 2 fallback step corresponding to D-14 step 5: when `segment === 'menu'` and no project matched, fetch the `isDefault: true` project and serve it; emit `<link rel="canonical">` pointing at that project's real slug URL.
- **No migration needed.** Layer 2 alias makes `/menu` work on every store with an `isDefault` project the moment G-05 ships. The previously-planned `previousSlugs[]` backfill is obsolete — it was solving a problem that Layer 2 solves natively.

### Layer 1 and `isDefault` are independent by design (answering ChatGPT R5-round-2)

ChatGPT's final review proposed a hard invariant: **"if a project slug is `menu`, that project must automatically be `isDefault: true`."** Rejected. The two concepts govern different things and deliberately stay independent.

**Why they are independent:**

- **Slug `menu`** = "this project's canonical URL is `/menu`." It is an owner-chosen URL identity.
- **`isDefault: true`** = "this project is the one promoted by OBP's 'View Menu' CTA, brand OBP auto-selection, share-modal default, sitemap priority, and schema.org primary-entity selection." It is an owner-chosen promotion flag.

These genuinely serve different intents. Coupling them would eliminate a legitimate owner pattern: **stable-URL + rotating-feature** (e.g., restaurant keeps `/menu` as the stable full food menu; sets "Daily Specials" as `isDefault: true` so the OBP CTA promotes today's feature). Under the rejected invariant, that pattern is forbidden.

**What the doctrine locks instead:**

- Layer 1 (slug match) resolves `/menu` to whatever project owns the slug, regardless of `isDefault`.
- Layer 2 (alias fallback) resolves `/menu` to the `isDefault` project, **only if** Layer 1 did not match.
- OBP "View Menu" CTA links to the `isDefault` project's real slug, **always** — even if that project's slug is not `menu` and a different project owns `menu`.
- These three behaviors are deliberately independent. The customer who types `/menu` and the customer who clicks OBP's CTA can legitimately land on different content, because they have different intents (direct URL request vs. owner-curated promotion).

**Addressing ChatGPT's ambiguity concern without the invariant:**

The real UX concern — an owner who creates a `menu`-slug project while a different project is `isDefault`, unintentionally creating the divergent state — is handled by **G-13 (dashboard advisory)**, not by a resolver-level invariant. The advisory surfaces the divergence at creation/rename time with a one-click "set as default" action. Owners who want the divergent state (Scenario 1 above) dismiss the advisory; owners who don't, fix it in one click. Owner sovereignty preserved; confusion surface addressed at the correct layer.

### History of this decision (for future readers)

| Round                                    | Position                                                                                                                                                                                      | Status                                                                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| R1 (original doctrine)                   | `/menu` is a reserved alias, resolves to default project, stays forever                                                                                                                       | Partially correct — right about universal alias, wrong about the reservation mechanism                                               |
| R2 (ChatGPT second review)               | `/menu` is a transitional deprecation redirect, retire after usage drops                                                                                                                      | Wrong — correctly identified alias implementation issues, but overcorrected by removing universal value                              |
| R3 (user third review)                   | `/menu` is a permanent universal alias, 200 + canonical tag, `menu` reserved                                                                                                                  | Partially correct — restored universal value, but blocked owner control                                                              |
| R4 (user fourth review)                  | `/menu` is just a regular project slug. No reservation, no alias, no special case                                                                                                             | Partially correct — restored owner control, but lost universal invariant. Principle violation: made invariant depend on owner naming |
| **R5 (user+ChatGPT synthesis, current)** | **Two-layer resolution: owner claim (Layer 1) + universal alias fallback (Layer 2). `menu` unreserved. No `previousSlugs[]` migration needed because Layer 2 handles the fallback natively.** | **Final lock.**                                                                                                                      |

The iteration converged. Each round corrected a real flaw in the previous. R5 synthesizes the two legitimate concerns (owner control + universal invariant) that exclusive positions R3 and R4 had to trade against each other.

**Revisiting policy for §9 specifically:** the five reversals in the history above closed a loop. The doctrine has now examined every position in the solution space (universal-only, owner-only, universal-owner-hybrid). R5 is the synthesis. **Further reversal requires a concrete new operational signal that breaks one of R5's two layers — not a re-argument of the principles that have already been weighed across five rounds.**

---

## 10. Migration policy — single-store → multi-store

When a single-store tenant adds a second outlet, URLs evolve:

| Before (single-store)              | After (multi-store, first outlet inherits)                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `joespizza.com/` → OBP (store)     | `joespizza.com/` → Brand OBP (selector)                                                   |
| `joespizza.com/bar-menu` → project | `joespizza.com/bar-menu` → **must 301** to `joespizza.com/{original-outletSlug}/bar-menu` |

**Lock:**

1. At the moment a second outlet is added, the first (now-master) outlet must be assigned an explicit `outletSlug` if it doesn't already have one.
2. For a grace period (minimum 12 months), legacy single-store project paths (`joespizza.com/bar-menu`) must 301-redirect to the new nested path (`joespizza.com/{originalOutletSlug}/bar-menu`). This preserves all printed QRs and shared links from the single-store era.
3. The redirect logic lives in the resolver: if the request is `/{slug}` on a multi-store tenant, and `slug` matches a project on the **master** outlet (but not an outlet slug), resolve to the master-outlet project — do not 404, do not silently open a different outlet's menu.
4. Brand OBP (location selector) takes over the root URL the moment the second outlet becomes active. The previous owner must be warned before this happens.

This is not yet implemented; see §12 A-01.

---

## 11. Gaps between doctrine and current code (implementation checklist)

| ID       | Gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Required change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Priority |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **G-01** | `/{outletSlug}` on multi-store jumps to outlet's default project instead of rendering outlet OBP (D-07).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Change `[[...slug]]/page.tsx:787-798` so that when outlet match succeeds AND `slugSegments.length === 1`, it renders `OBPContent` scoped to that outlet store instead of calling `MenuContent`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | P0       |
| **G-02** | `HomePageNew` intro screen is still the default first render inside `/menu` (D-01).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `ClientMenuRenderer` must default `activePage = MENU` and `HomePageNew` must not render in the public path. Editor preview may retain for legacy authored designs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | P0       |
| **G-03** | PWA manifest `start_url` is hard-coded to `/` (D-10).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Rewrite `manifest.webmanifest` route to accept current canonical URL context and emit matching `start_url` + differentiated `id`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | P0       |
| **G-04** | Owner dashboard has no Store QR or Business QR generators — only Project QR (D-08).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Add "Store Menu Link" and "Business Profile Link" sections to the share/QR area of the dashboard. Re-label existing QR to "Project Menu Link". Make Store QR the default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | P1       |
| **G-05** | Under R5, the resolver needs two-layer `/menu` handling: owner-claim (slug match) first, universal alias (serve `isDefault` project with canonical tag) second. Current code does neither cleanly.                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Four changes, all shipping atomically: (1) Remove `menu` from `RESERVED_PROJECT_SLUGS` at `@/src/constants/reservedSlugs.ts:16` so owners can claim it. (2) Add the Layer 2 alias step in `[[...slug]]/page.tsx` matching D-14 step 5: when the request path is `/menu` (or `/{outletSlug}/menu`) and no project matched, fetch the `isDefault: true` project for that store and serve it with a `<link rel="canonical">` pointing at the default project's real slug URL. (3) Add a `getDefaultProjectUrl(store)` helper for OBP's "View Menu" CTA that emits the **real** canonical slug URL (not `/menu`). Keep `generateMenuUrl()` only as a utility for contexts that intentionally want the alias URL (e.g., "suggest an easy URL" hints in the dashboard). (4) Verify the canonical tag is emitted only on the Layer 2 path, never on Layer 1 (when a project with slug `menu` actually exists, `/menu` IS the canonical URL and should have no alternate-canonical tag). | P1       |
| **G-06** | OBP `View Menu` CTA always says "View Menu" regardless of project count/name (D-03 implies store-level OBP exposes project choices).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | When store has 1 project → CTA reads `View [projectName]`. When ≥2 → show the primary default as big CTA + secondary projects as smaller cards below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | P1       |
| **G-07** | Outlet slug rename has no `previousSlugs[]` redirect chain (§7).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Mirror the project-slug chain mechanism on outlet stores. Block renames after first QR print date if chain can't be honored.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | P1       |
| **G-08** | Subdomain rename has no redirect chain (§7).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Either mirror the chain or block subdomain renames after first publish. Decision needs separate product call; default is "block after first publish."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | P2       |
| **G-09** | Visible breadcrumb on project pages is not rendered (D-12). Schema-org breadcrumb is emitted but invisible to users.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Render a minimal visual breadcrumb (Business → Store → Project or Business → Project) in the menu page header area. Must use canonical URLs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | P2       |
| **G-10** | No analytics event for `project_switch` inside the menu (D-04).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Emit `project_switch` via the existing unified analytics when in-menu switcher is used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | P2       |
| **G-11** | Install-fallback behavior when PWA `start_url` target no longer exists (D-10 point 4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Detect standalone display-mode in the "Menu Not Found" branch and auto-redirect up the hierarchy after a visible 2-second hint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | P2       |
| **G-12** | `BrandOBPContent` outlet URL builder falls back to `store-${storeId}` when `outletSlug` is missing (`@/src/app/client/obp/BrandOBPContent.tsx:141-142`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Backfill `outletSlug` for all multi-store outlets. No outlet should ship without a slug.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | P2       |
| **G-14** | Multi-outlet Layer 2 canonical — `generateMetadata` in `@/src/app/client/[[...slug]]/page.tsx` emits the Layer 2 canonical tag for `/menu` correctly on non-outlet paths, but for multi-outlet `/{outletSlug}/menu` paths it reads the master store's default slug rather than the outlet's. Pre-existing limitation (generateMetadata has no outlet-switch logic — that lives in MenuContent); G-05 made the issue visible but did not cause it. Content still renders correctly via the resolver's outlet switch; only the canonical tag for outlet+menu combinations is imperfect. **Discovered during G-05 implementation, logged per user directive.** | Either (a) duplicate the outlet-switch logic in `generateMetadata` and fetch the outlet's projectsSummary for the default slug, or (b) move canonical emission into MenuContent (it already has outlet-resolved context) via a post-render metadata pattern. Option (b) is cleaner. Scope: `generateMetadata` in `[[...slug]]/page.tsx`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | P2       |
| **G-13** | Dashboard does not surface the Layer-1-vs-`isDefault` divergence when an owner creates or renames a project to slug `menu` while a different project has `isDefault: true` (§9 R5-round-2 response).                                                                                                                                                                                                                                                                                                                                                                                                                                                        | In the project-create and project-rename flows in the owner dashboard: detect when the target slug is `menu` AND another project on the same store has `isDefault: true` AND the target project is NOT `isDefault: true`. Show an advisory dialog explaining the divergence (customer typing `/menu` will see this project; customer clicking OBP's "View Menu" will see the default project). Offer two actions: **"Set as default"** (flips `isDefault: true` on this project, flips the other to false) and **"Keep as-is"** (owner chose the divergent state intentionally). No resolver-level enforcement; doctrine (§9) explicitly keeps Layer 1 and `isDefault` independent.                                                                                                                                                                                                                                                                                              | P2       |

### 11.1. Implementation status — code evidence per gap

Every gap G-01 → G-14 has landed. This table is the post-implementation parity record; line numbers are approximate anchors into the single doctrine deploy.

| Gap  | Status  | Primary file(s)                                                                                                                                                                                                                                                                                   |
| ---- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-01 | ✅ done | `@/src/app/client/[[...slug]]/page.tsx` (outlet-switch + `outletRenderedAsObp` → `OBPContent`), `@/src/app/client/obp/OBPContent.tsx` (accepts `storeOverride`, `masterSubdomain`, `masterCustomDomain`)                                                                                          |
| G-02 | ✅ done | `@/src/components/templates/website/clientWebsite/index.tsx:81-90` (public path defaults to MENU), `@/src/components/templates/website/mainContentRenderer/index.tsx:37-65`, `@/src/components/templates/main-app/projects/b2cView/output/MenuHeader.tsx:61-86`                                   |
| G-03 | ✅ done | `@/src/app/manifest.webmanifest/route.ts` (reads `?start=`, validates safe path), `@/src/lib/pwa/manifestGenerator.ts` (manifest `id` differentiated by `startUrl`)                                                                                                                               |
| G-04 | ✅ done | `@/src/components/templates/main-app/useMenuList/index.tsx` (three-QR row: Store Menu QR — Layer 2 alias, Business Profile QR, Project Menu QR advanced), `@/src/components/templates/main-app/businessSettings/OBPLinkCard.tsx` (OBP Menu QR uses real default-slug URL)                         |
| G-05 | ✅ done | `@/src/constants/reservedSlugs.ts:14-25` (`menu` unreserved with doctrinal comment), `@/src/app/client/[[...slug]]/page.tsx` (two-layer resolver — slug lookup first, Layer 2 fallback with `isMenuAliasFallback` + canonical), `@/src/lib/obp/generateOBPUrl.ts` (`getDefaultProjectUrl` helper) |
| G-06 | ✅ done | `@/src/app/client/obp/OBPMenuCTA.tsx` (1-project → "View [projectName]"; ≥2 → primary + secondary cards), `@/src/app/client/obp/obp.module.scss` (secondary card styles)                                                                                                                          |
| G-07 | ✅ done | `@/src/app/api/outlets/rename/route.ts` (new rename endpoint), `@/src/lib/firestore/clientStoreLookup.ts:66-117` (`previousOutletSlugs` fallback query), `@/src/app/client/[[...slug]]/page.tsx` (canonical-outlet 301 redirect), `@/src/types/platform/store.ts` (`previousOutletSlugs[]`)       |
| G-08 | ✅ done | `@/src/database/stores/index.tsx:207-250` (blocks subdomain mutation when `lastPublishedAt` is set), `@/src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx` (locked UI state post-publish)                                                                             |
| G-09 | ✅ done | `@/src/app/client/[[...slug]]/MenuBreadcrumb.tsx` (new component), `@/src/app/client/[[...slug]]/page.tsx` (master brand name captured pre-outlet-switch, rendered above TrustSignals)                                                                                                            |
| G-10 | ✅ done | `@/src/lib/analytics/unified.ts` (`PROJECT_SWITCH` enum + `trackProjectSwitch`), `@/src/app/client/obp/OBPMenuCTA.tsx` (fires on secondary-card clicks with source `obp_secondary_card`)                                                                                                          |
| G-11 | ✅ done | `@/src/app/manifest.webmanifest/route.ts` (`resolveStartUrlWithFallback` — degrades project → `/menu` alias → outlet OBP → brand OBP per A-12 ladder)                                                                                                                                             |
| G-12 | ✅ done | `@/src/app/client/obp/BrandOBPContent.tsx` (filters outlets missing slug + removes `store-${storeId}` fallback URL)                                                                                                                                                                               |
| G-13 | ✅ done | `@/src/components/templates/main-app/projects/index.tsx` (Modal.confirm advisory in `handleProjectEdit` when proposed slug = `menu` and another project is the `isDefault`; offers "Set as default" vs "Keep as-is")                                                                              |
| G-14 | ✅ done | `@/src/app/client/[[...slug]]/page.tsx` (`generateMetadata` extended: for `/{outletSlug}/menu` it looks up the outlet and emits Layer 2 canonical at `{base}/{outletSlug}/{realDefaultSlug}`)                                                                                                     |

**Cross-check follow-ups (not blockers, logged for later):**

- `@/src/lib/utils/slugify.ts:87` still emits `/menu/{slug}` when neither subdomain nor custom domain is present. That branch runs only in no-tenant contexts (marketing / legacy dev URLs) and is not reached by any live public URL. Leaving as-is; revisit when the no-tenant path is exercised.
- `@/src/database/campaigns/index.ts` writes `menuQrUrl` using the canonical default slug (audited during link-emitter sweep). Legacy flat-dotted writers elsewhere (`projects.${id}` merge pattern) are handled by `parseSummaryProjects`; no action needed for routing.

---

## 12. Items **not** raised in the ChatGPT conversation (Cascade additions)

Each of these is material; all are added to the doctrine.

### A-01. Migration policy for single-store → multi-store

ChatGPT touched it as an open question but never resolved. Locked at §10 above. **Unblocks owners who start as one location and add branches — a very common SMB path.**

### A-02. Outlet slug rename needs `previousSlugs[]` chain

QR permanence claim breaks the moment an owner renames an outlet. Locked at G-07.

### A-03. Subdomain rename policy — immutable after first publish

**Strengthened (ChatGPT second review, agreed).** A rename mechanism for subdomains does not exist today; nothing is lost by locking the door permanently.

**Lock:**

1. Subdomain is **immutable** from the moment the tenant's OBP first serves a 200 to a real customer (first public request, or first QR download — whichever comes first).
2. There is **no owner-facing rename UI, ever.**
3. If a rename is genuinely required (trademark dispute, acquisition, legal order), it happens via admin-tier support intervention with an explicit record, a 12-month redirect window, and the owner's written acknowledgment that prior printed QRs and installed PWAs will eventually break.
4. Custom domains remain owner-controlled (they are owned outside our system and can always be repointed). Only the `*.menulist.ai` subdomain is subject to this immutability lock.

### A-04. `homeStyle` design tokens become obsolete in the public path

With D-01 the `simple / premium / bold` home style is no longer rendered publicly. `@/src/components/templates/main-app/projects/b2cView/designSystem.ts` should keep the tokens for editor preview and marketing snapshots, but the code reading them in `MainContentRenderer` for public render can drop the HOME branch. Communicate this to any marketing/editor team members before deletion.

### A-05. Custom-domain scoping — store vs brand

Custom domains today are store-level (one domain → one store). A multi-store brand pointing a single custom domain at the brand root (`habibi.com` covering Pune, Mumbai, Delhi) is architecturally fine (domain maps to master store, brand OBP renders at root) but is **not explicitly tested in code**. Recommend adding a test case. No doctrine change required — this is already how `getStoreByCustomDomain` resolves, but it silently works only because the master store doubles as the brand.

### A-06. Install scope collision across installed surfaces

If a customer installs the OBP PWA and the Store PWA for the same brand on the same device, both have `scope: '/'`. Without distinct `id`s (see D-10 rule 4), Chrome treats them as one app and the second install silently replaces the first (or the prompt is suppressed). This is a real bug waiting to happen. G-03 fixes it.

### A-07. Analytics surface attribution for OBP → Menu conversion

OBP click tracking exists (`trackOBPMenuClick` @ `@/src/app/client/obp/OBPMenuCTA.tsx:24-27`). But with D-07 introducing outlet OBPs at `/{outletSlug}`, the tracking must distinguish brand-OBP → menu vs outlet-OBP → menu, otherwise we can't measure the location-selector step's drop-off.

### A-08. Sitemap implications

Current client sitemap (`@/src/app/client/sitemap.ts`) predates this doctrine. It must:

- Include the canonical project URL for each active project (not `/menu`).
- Include `/{outletSlug}` for each outlet on multi-store tenants.
- Include `/` (OBP) for every tenant.
- **Not** include `previousSlugs` (they 301 to the canonical slug; they must not self-index).
  (Already partly done; double-check after G-05 lands. Note: under R4, `/menu` is only in the sitemap if the store actually has a project with slug `menu` — no special-case inclusion or exclusion.)

### A-09. In-menu "View Business" CTA

D-12 mentions it as a "Business Info" action. Today there is **no such control in the menu UI**. Without it, once a customer is inside a menu, the only way back to OBP is via footer brand click (not yet implemented as a link) or browser back. Minimum viable: make the footer brand name a link to `/`. Preferred: explicit "View business" text button near the header.

### A-10. `promoteInstallation` opt-out is a store-level knob

`storeDetails.pwaSettings.promoteInstallation` already exists (`@/src/components/templates/website/clientWebsite/index.tsx:216`). Owner can already disable PWA install prompts. When we add per-surface install (G-03), this opt-out must continue to globally suppress the prompt across **all** surfaces — not per-surface. Confirm the flag is respected at the controller, not at the manifest.

### A-11. The phrase "primary public root of MenuList" — settled implicitly

ChatGPT asked this as a deep philosophical question ("Model A: OBP-first, Model B: Menu-first"). The user answered it by locking OBP-always-on (D-06). **Doctrine lock: MenuList is OBP-first.** OBP is the public identity layer; menu is consumption. All product copy, help docs, and marketing must reflect this. Phrases like "your digital menu" as the _product_ are fine; phrases like "your business profile" are more accurate for the root surface.

### A-12. Deleted project / deactivated outlet

What happens when a project linked from a QR is deleted?

- Project QR → owner deleted the project → currently returns "Menu Not Found" inline (`@/src/app/client/[[...slug]]/page.tsx:826-837`).
- Doctrine: instead of a terminal 404, fall back through a **PWA fallback ladder** (ChatGPT R5 framing): deleted project → try `/menu` alias (serves `isDefault` project if one still exists on that store) → store OBP with "this menu is no longer available" notice → brand OBP (for multi-store).
- Each rung of the ladder serves content, not a 404, so QR operational value survives any single deletion.
- Deactivating an outlet triggers the ladder from the `/menu`-alias rung downward (the outlet itself is gone, so Layer 2 alias on `/{outletSlug}/menu` also fails — the ladder skips to brand OBP).
- Deleted/inactive project's `slug` + `previousSlugs[]` must remain reserved for 90 days to prevent a same-slug replacement from hijacking incoming QR scans during the transition.

### A-13. Physical QR "print dates" metadata

For G-07 and G-08 to be enforceable, we need to know when a QR was first downloaded. The share modal already tracks PDF download time for freshness (`@/src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:95-105`). Extend to QR downloads (per surface — business/store/project). This unlocks "your QR has been in circulation since X; renames now require the redirect chain."

### A-16. Cross-surface state persistence doctrine

**Added from ChatGPT second review.** The codebase persists three things today in `sessionStorage` keyed by `menulist_customerMenu_{storeId}_{suffix}` — `activePage`, `activeLanguage`, and `scrollY` (`@/src/components/templates/website/clientWebsite/index.tsx:43-67, 81-107`). What survives which transition has never been doctrinally stated. With D-01 removing the HOME state, with D-07 introducing outlet OBP, and with PWA installs creating persistent sessions, this becomes material.

**Lock — state persistence scope matrix:**

| State                                       | Scope                                        | Survives transition                                                         | Does NOT survive                                                                      |
| ------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Selected language**                       | Per-store (keyed by `storeId`)               | Project → Project within same store                                         | Switching stores on a multi-store brand (language availability may differ per outlet) |
| **Selected currency**                       | Per-store                                    | Same as language                                                            | Cross-store switch                                                                    |
| **Dietary / veg-nonveg / allergen filters** | Per-project (keyed by `storeId + projectId`) | Project reload, menu refresh                                                | Any cross-project or cross-store switch — filters are project-schema-specific         |
| **Scroll position**                         | Per-project                                  | Router refresh, tab return                                                  | Cross-project or cross-store switch                                                   |
| **View mode** (e.g. grid/list, if added)    | Per-store                                    | Same as language                                                            | Cross-store switch                                                                    |
| **OBP "last viewed outlet" hint**           | Per-tenant (keyed by `tenantId`)             | Cross-visit on multi-store brand OBP — surfaces "Continue to [last outlet]" | Cross-tenant                                                                          |
| **PWA install consent / dismissals**        | Per-origin (browser-managed)                 | All surfaces in the tenant                                                  | Cross-tenant (different origin)                                                       |

**Reset rules:**

- On store switch (different `storeId`), language/currency/view-mode reset to the destination store's defaults. A one-time toast ("Showing menu in English — change") can offer a shortcut to reapply the previous choice, but does not auto-apply.
- On project switch within the same store (D-05), language/currency persist; filters and scroll reset.
- On tenant switch (different origin), everything resets. This is enforced by sessionStorage scope naturally.
- On PWA launch, state matches whatever `sessionStorage` holds for the launched surface's origin + storeId. A fresh PWA launch into `/pune/bar-menu` should not inherit the language chosen during a previous `/mumbai/food-menu` session, since `storeId` differs.

**Storage key convention (extend the existing prefix):**

```
menulist_customerMenu_{storeId}_language
menulist_customerMenu_{storeId}_currency
menulist_customerMenu_{storeId}_{projectId}_filters
menulist_customerMenu_{storeId}_{projectId}_scrollY
menulist_brandOBP_{tenantId}_lastOutlet
```

This is a direct extension of `@/src/components/templates/website/clientWebsite/index.tsx:43-49`. No new storage mechanism introduced.

**Why not localStorage:** `sessionStorage` is the correct boundary — one tab-session of menu browsing. `localStorage` leaks across all future visits, which is wrong for operational state (a customer who chose Spanish at one store does not necessarily want Spanish 3 months later on a different device). The one exception is PWA install dismissals, which the browser manages independently.

### A-15. Outlet slug vs project slug namespace collision on master stores

ChatGPT raised this as "What if store slug conflicts with project slug? `/services` (store) vs `/services` (project). Possible collision. Need reserved namespace strategy." The codebase has a **real collision risk** that the current reserved-slug system does not cover:

- A master store can have its **own projects** (it is still a store with menus).
- The same master store's tenant can have **outlets with outletSlugs**.
- The resolver at `@/src/app/client/[[...slug]]/page.tsx:787-798` tries outlet-slug matching **first** (when `storeData.isMaster`), and only falls through to project-slug matching if no outlet matches.
- Consequence: if a master-store project is named "Pune" (slug `pune`) and an outlet also has `outletSlug = 'pune'`, the outlet wins and the master project at `/pune` becomes **unreachable**.

**Lock:**

1. At outlet creation, reject any `outletSlug` that is already in use as a project slug (or `previousSlug`) on the **master store**.
2. At master-store project creation/rename, reject any slug that collides with an existing outlet `outletSlug` (or `previousSlug`) in the same tenant.
3. Enforce both checks in the same DAL layer used for slug validation today. This is a cheap check (both are already cached per store/tenant) and prevents an unreachable-URL trap.

### A-14. Editor preview vs public render divergence after D-01

The owner editor uses the same `HomePageNew`/`MenuPageNew` pair inside device-frame previews (`@/src/components/templates/website/mainContentRenderer/index.tsx:49-66`). If we delete `HomePageNew` from the public path, the editor preview diverges from the public surface. Options:

- Keep `HomePageNew` in the editor as a design preset preview only.
- Delete it from both (cleaner) and remove `pageOptions.HOME` from the editor tab bar.

**Recommended:** delete from both. Design tokens for home-style become dead code. Cleaner long-term.

---

## 13. Summary — the rules that govern all future decisions

1. `/` is always OBP. Never auto-forward.
2. `Tenant → Store → Project` is the only hierarchy. Store surface = outlet OBP.
3. Single-store collapses the store slug in public URLs; the store concept still exists in data.
4. Every public resource has exactly one canonical URL. All others 301.
5. **Identity = immutable ID. Slugs are lookup handles that can change.** (D-13)
6. **Resolution order is explicit and deterministic — no heuristic routing.** (D-14)
7. Printed QR is immortal. Any rename must come with a redirect chain, or the rename is disallowed. Subdomains are immutable after first publish, period.
8. The menu page opens straight to the menu — no intro screen, no second gateway.
9. Project switching inside the menu is a URL navigation, not a state swap, and never dominates the UI.
10. Store switching happens at OBP only, never inside the menu.
11. PWA install preserves context: install surface = launch surface, frozen at install. All three install surfaces are allowed; auto-prompt frequency is capped.
12. Browser back is sacred — never intercepted. In-app "up" navigation is an additional path, not a replacement.
13. **Cross-surface state (language, currency, filters, scroll) persists by the scope defined in A-16 — never broader, never narrower.**
14. **`/menu` uses two-layer resolution.** Layer 1: if a project has slug `menu`, it resolves directly (owner-claimed canonical). Layer 2: otherwise, serves the `isDefault: true` project as an alias with `<link rel="canonical">` pointing at that project's real slug URL. Universal invariant preserved; owner control preserved; canonical URL cleanliness preserved. `menu` is not reserved.
15. **Public routing is performance-bounded.** Maximum 3 cached Firestore reads per request; no sequential scan-and-match; no fanout; no middleware-level Firestore access. (D-15)
16. **Owner sovereignty over URL identity and promotion flags is independent.** The slug a project owns (e.g., `menu`) and whether it is `isDefault: true` are two separate owner choices that never force each other. Divergence between them is legal (a legitimate owner pattern) and surfaced only as a dashboard advisory at creation/rename time (G-13) — never enforced at the resolver layer. (§9 R5-round-2 lock)

---

## 14. Cross-check — every ChatGPT point accounted for

| Conversation topic                                                        | Handled in                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two distinct surfaces (OBP vs Menu)                                       | §2, §3, D-06                                                                                                                                                                                                                                                                                                                                                                                                              |
| Menu intro screen is redundant                                            | D-01, G-02                                                                                                                                                                                                                                                                                                                                                                                                                |
| Correct hierarchy: Tenant → Store → Project                               | §2                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Entity roles (identity / context / content)                               | §2                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Single-store single-project                                               | §3.2 row 1                                                                                                                                                                                                                                                                                                                                                                                                                |
| Single-store multi-project                                                | §3.2 row 2, D-04, G-06                                                                                                                                                                                                                                                                                                                                                                                                    |
| Multi-store single-project                                                | §3.2 row 3, D-07                                                                                                                                                                                                                                                                                                                                                                                                          |
| Multi-store multi-project                                                 | §3.2 row 4, D-07, G-01                                                                                                                                                                                                                                                                                                                                                                                                    |
| "Put switching at OBP, not inside Menu"                                   | D-04, D-12                                                                                                                                                                                                                                                                                                                                                                                                                |
| Canonical URL model `/storeSlug/projectSlug`                              | §3.2                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Each project has its own canonical URL                                    | §8                                                                                                                                                                                                                                                                                                                                                                                                                        |
| QR per project                                                            | D-08 Project QR row                                                                                                                                                                                                                                                                                                                                                                                                       |
| Default QR = business OR store — which?                                   | D-08, D-09 (Store wins)                                                                                                                                                                                                                                                                                                                                                                                                   |
| Two QR products vs three                                                  | D-08 (three, after store-level add)                                                                                                                                                                                                                                                                                                                                                                                       |
| Owner renames store "Pune" → "Pune West"                                  | §7 additions, G-07, A-02                                                                                                                                                                                                                                                                                                                                                                                                  |
| Slug governance                                                           | §7                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Reserved namespace                                                        | §7 table                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Must have store-level URL page                                            | §3, D-07, G-01                                                                                                                                                                                                                                                                                                                                                                                                            |
| Don't need `/menu` at all?                                                | §9 R4 — correct, we don't. `/menu` is not an alias; it resolves only if the owner named a project with slug `menu`                                                                                                                                                                                                                                                                                                        |
| If single-store, should we still show store slug?                         | D-02 — hide externally                                                                                                                                                                                                                                                                                                                                                                                                    |
| ChatGPT's "Option A vs Option B" (always show vs hide)                    | D-02 picks "hide"                                                                                                                                                                                                                                                                                                                                                                                                         |
| Tenant URL always OBP                                                     | D-06                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Store URL behavior (selector vs default)                                  | D-03, D-07                                                                                                                                                                                                                                                                                                                                                                                                                |
| Project switching inside menu                                             | D-04, D-05                                                                                                                                                                                                                                                                                                                                                                                                                |
| Canonical URL ownership                                                   | §8                                                                                                                                                                                                                                                                                                                                                                                                                        |
| What does tenant URL do for single-store?                                 | D-06 (always OBP), §3.2 row 1                                                                                                                                                                                                                                                                                                                                                                                             |
| Should OBP exist for single-store?                                        | D-06 (yes)                                                                                                                                                                                                                                                                                                                                                                                                                |
| Default-project behavior at store URL                                     | D-03                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Project switching mechanics (URL vs state)                                | D-05                                                                                                                                                                                                                                                                                                                                                                                                                      |
| QR governance                                                             | D-08, D-09, §5                                                                                                                                                                                                                                                                                                                                                                                                            |
| Migration plan for store URLs                                             | §10, A-01                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Slug immutability                                                         | §7                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Store rename                                                              | A-02, G-07                                                                                                                                                                                                                                                                                                                                                                                                                |
| Canonical tags / indexing                                                 | §8, A-08                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Primary public root of MenuList                                           | A-11 — OBP-first                                                                                                                                                                                                                                                                                                                                                                                                          |
| "What is Store surface?"                                                  | D-07                                                                                                                                                                                                                                                                                                                                                                                                                      |
| PWA install context                                                       | D-10, G-03, A-06, A-10                                                                                                                                                                                                                                                                                                                                                                                                    |
| Install from Store allowed                                                | D-11                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Install fallback when target gone                                         | D-10 rule 4, G-11, A-12                                                                                                                                                                                                                                                                                                                                                                                                   |
| Header logo destination                                                   | D-12 table                                                                                                                                                                                                                                                                                                                                                                                                                |
| Footer brand destination                                                  | D-12 table                                                                                                                                                                                                                                                                                                                                                                                                                |
| Breadcrumb                                                                | D-12 bottom, G-09                                                                                                                                                                                                                                                                                                                                                                                                         |
| Back button (browser vs in-app)                                           | D-12 ("never intercept browser back")                                                                                                                                                                                                                                                                                                                                                                                     |
| Store switcher not inside menu                                            | D-12 table                                                                                                                                                                                                                                                                                                                                                                                                                |
| Deep-linked arrival via Google                                            | D-12 (browser back stays native)                                                                                                                                                                                                                                                                                                                                                                                          |
| "Business Info" CTA                                                       | D-12, A-09                                                                                                                                                                                                                                                                                                                                                                                                                |
| What QR default in dashboard                                              | D-09 (Store)                                                                                                                                                                                                                                                                                                                                                                                                              |
| Canonical vs alias for single-store                                       | §8, G-05                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Slug namespace collision rules                                            | §7                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Tenant/store name collision                                               | Tenant has no public slug — only subdomain (reserved list at §7). No public collision possible                                                                                                                                                                                                                                                                                                                            |
| Store slug vs project slug collision (e.g. `/services`)                   | A-15 — cross-check both at creation/rename                                                                                                                                                                                                                                                                                                                                                                                |
| Install/PWA edge cases                                                    | A-06 (scope collision), A-12 (deleted target)                                                                                                                                                                                                                                                                                                                                                                             |
| Permission/governance over slugs                                          | Not in scope of this doctrine — belongs in a permissions doc. Noted.                                                                                                                                                                                                                                                                                                                                                      |
| Search/SEO indexing layer                                                 | A-08                                                                                                                                                                                                                                                                                                                                                                                                                      |
| What surface is "primary"?                                                | A-11                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Store UI distinct from OBP?                                               | D-07 (no — store surface _is_ OBP scoped to outlet)                                                                                                                                                                                                                                                                                                                                                                       |
| Identity vs slug doctrine (ChatGPT R2)                                    | D-13                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Deterministic resolver order (ChatGPT R2)                                 | D-14                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Cross-surface state persistence (ChatGPT R2)                              | A-16                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Subdomain immutability strengthened (ChatGPT R2)                          | A-03                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `/menu` status (R1 → R2 → R3 → R4 → R5)                                   | **Final: R5 lock** — two-layer resolution. Owner claim (Layer 1) + universal alias fallback (Layer 2). `menu` unreserved. See §9 R5 history table for the full five-round arc                                                                                                                                                                                                                                             |
| `/menu` as a real project slug (user proposal)                            | **Accepted in R4, retained in R5 as Layer 1.** Owner can claim `/menu` by naming their project "Menu."                                                                                                                                                                                                                                                                                                                    |
| Universal `/menu` invariant (ChatGPT R5 principle)                        | **Accepted in R5 as Layer 2.** Every business has a working `/menu` regardless of naming. Respects "do not make invariants depend on user-authored content."                                                                                                                                                                                                                                                              |
| Remove `isDefault` flag (user R3 proposal)                                | **Still rejected.** Flag drives OBP CTA, brand OBP auto-selection, sitemap, schema.org, special menu override, share modal, and now also Layer 2 alias fallback under R5. Every replacement heuristic is worse than the explicit flag                                                                                                                                                                                     |
| Performance doctrine (ChatGPT R5)                                         | D-15                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ChatGPT R5-round-2: force `menu` slug → `isDefault=true` (hard invariant) | **Rejected.** Would break the stable-URL + rotating-feature owner pattern (Scenario 1 in §9), contradicts R5's owner-sovereignty principle, and re-imposes platform semantics on top of owner choice. The real UX concern (unintentional Layer-1-vs-default divergence) is addressed by G-13 (dashboard advisory) at the correct layer. See §9 "Layer 1 and `isDefault` are independent by design" for the full reasoning |
| Install precedence product policy (ChatGPT R2)                            | A-06                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Outlet OBP UI prescription simplified (ChatGPT R2)                        | D-03 (delegates to design team)                                                                                                                                                                                                                                                                                                                                                                                           |

Every conversation point is addressed. No orphan items.

---

## 16. Implementation order and dependencies

The 14 gaps in §11 have priorities (P0/P1/P2) but can be sequenced to minimize risk and unblock each other. Below is the recommended sequence; items on the same row can proceed in parallel.

```
Wave 1 (P0 — parallel, no inter-deps):
  G-02  Remove HomePageNew from public path
  G-03  PWA manifest per-surface start_url + id

Wave 2 (P0 — requires G-01 design only, not waiting on anything else):
  G-01  /{outletSlug} renders outlet OBP  ──────────┐
                                                   │
Wave 3 (P1 — depends on G-01):                     │
  G-06  OBP "View Menu" CTA per project count  ◄───┤ (consumes G-01's outlet OBP surface)
  G-04  Store QR + Business QR generators      ◄───┘ (Store QR encodes /{outletSlug}, must behave as OBP first)
  G-05  Unreserve `menu` + delete alias           (independent, but naturally grouped with G-06 because both touch OBP CTA)
  G-07  Outlet slug rename chain                  (independent; uses existing previousSlugs mechanism)

Wave 4 (P2 — can land any time after their respective dependencies):
  G-09  Visible breadcrumb                         (consumes G-01's outlet OBP for the "Store" breadcrumb node)
  G-10  project_switch analytics event             (independent)
  G-11  PWA install fallback when target deleted   (consumes G-03's surface-aware id)
  G-12  Backfill outletSlug on existing outlets    (independent; data migration only)
  G-13  Dashboard Layer-1-vs-isDefault advisory    (depends on G-05; both touch the `menu` slug logic)
  G-14  Multi-outlet Layer 2 canonical fix          (depends on G-05; refines canonical emission for /{outletSlug}/menu)
  G-08  Subdomain rename decision                  (product call, not code)
```

**Cross-gap coupling to watch:**

- **G-01 → G-04 → G-06 → G-09:** the "outlet OBP exists" assumption threads through Store QR generation, the CTA UI, and the breadcrumb's middle node. Ship G-01 first; the others reference its output.
- **G-03 → G-11:** the install-fallback logic needs the surface-aware `id` from G-03 to know which surface the customer installed from. Don't ship G-11 before G-03.
- **G-02 is fully independent** and is the lowest-risk P0 to ship first — builds confidence in the doctrine's implementation track.
- **G-05 has no data migration under R5.** Layer 2 alias handles all stores natively: any store with an `isDefault` project automatically has a working `/menu` fallback the instant G-05 ships. No `previousSlugs[]` backfill required. This is a simplification over the pre-R5 migration plan.

**What must ship atomically (single deploy, not split across waves):**

- G-05's four sub-changes: unreserving `menu`, adding the Layer 2 alias fallback step, adding the canonical-tag emission, and adding the `getDefaultProjectUrl(store)` helper. Splitting these across deploys creates a window where `/menu` returns 404 for stores whose default project slug isn't `menu` — breaking the universal invariant. All four must land together.
- G-03's manifest-route changes and its analytics surface attribution. Splitting them means install events go untracked for the transition window.

**What can be reverted independently:**

- Every gap is behind an implementation toggle or reverts cleanly via git revert of a single PR. No destructive migrations (the `previousSlugs[]` append is additive).

---

## 17. Launch continuity — what breaks, what migrates, what needs communication

Consolidated view of customer/owner-visible effects for the implementation phase.

| Change                        | Customer-visible impact                                                                                                                                                                                                                                                                           | Owner-visible impact                                                                                                               | Continuity mechanism                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-01 outlet OBP               | Multi-store brand URL `/pune` now shows outlet OBP instead of jumping to menu — one extra click before reaching menu                                                                                                                                                                              | Owner gets a richer outlet surface for free (hours, actions, trust)                                                                | Pre-landing `/{outletSlug}/{projectSlug}` URLs unaffected                                                                                                       |
| G-02 remove intro screen      | Menu opens directly to listing, skipping the decorative intro                                                                                                                                                                                                                                     | Owner's configured `homeStyle` (simple/premium/bold) no longer renders in the public path                                          | Editor preview may retain HOME mode (A-14); marketing snapshots unchanged                                                                                       |
| G-03 PWA manifest             | Existing PWA installs may be orphaned when `manifest.id` changes from `/?store=X` to `/?store=X&surface=Y` — Chrome treats the new manifest as a different app                                                                                                                                    | None                                                                                                                               | Communicate to affected stores in advance; installed users see an "update available" prompt. This is a one-time migration cost for per-surface install support. |
| G-04 Store/Business QR        | No customer impact                                                                                                                                                                                                                                                                                | Owner dashboard gains two new QR products; existing Project QR is re-labeled but functionally identical                            | Printed QRs from old modal continue to work                                                                                                                     |
| G-05 `/menu` R5 two-layer     | Customer-visible behavior is unchanged on stores whose default project slug ≠ `menu` (Layer 2 alias still serves the default, now with a canonical tag pointing at the real slug). On stores where an owner names a project "Menu", Layer 1 gives `/menu` status as that project's canonical URL. | Owner can now name a project "Menu" and own `/menu` as canonical. Owners who don't get the universal-alias fallback automatically. | **No migration.** Layer 2 alias handles all stores natively the instant G-05 ships. No `previousSlugs[]` backfill required.                                     |
| G-06 per-project CTA          | OBP CTA text and project-card density change based on project count                                                                                                                                                                                                                               | None directly; owner sees their project names reflected in CTAs                                                                    | No migration                                                                                                                                                    |
| G-07 outlet rename chain      | Old outlet URLs 301 to new                                                                                                                                                                                                                                                                        | Owner can rename outlets with confidence that printed QRs keep working                                                             | New chain matches existing project rename chain                                                                                                                 |
| G-08 subdomain immutability   | None                                                                                                                                                                                                                                                                                              | Owner can no longer rename subdomain after first publish                                                                           | Needs explicit UX messaging: "Your subdomain is locked — it's used on your printed materials and installed apps." Show before first publish, not after.         |
| G-09 breadcrumb               | Visible "Business → Store → Project" on project pages                                                                                                                                                                                                                                             | None                                                                                                                               | Pure additive render                                                                                                                                            |
| G-10 project_switch analytics | None                                                                                                                                                                                                                                                                                              | Owner gets a new funnel metric                                                                                                     | No migration                                                                                                                                                    |
| G-11 PWA install fallback     | Installed PWA whose target is deleted now falls back gracefully to store OBP instead of showing hard 404                                                                                                                                                                                          | None                                                                                                                               | No migration                                                                                                                                                    |
| G-12 outletSlug backfill      | URLs like `/store-123` change to `/{actual-slug}`                                                                                                                                                                                                                                                 | None                                                                                                                               | One-time data migration; append old `/store-${id}` path to `previousSlugs[]` so old links 301                                                                   |

**Communication plan — things owners need to know before we ship:**

1. **Before G-08:** email/banner warning to owners who haven't set a subdomain yet, that the subdomain will lock after first publish. One-time. After the ship, the UI itself must state it permanently.
2. **Before G-03:** to owners whose customers have installed PWAs from the old single-surface manifest, one-time notice that the app may appear to reinstall. (Could be a silent transition depending on browser behavior — verify in staging.)
3. **No communication needed for G-01, G-02, G-04, G-05, G-06, G-07, G-09, G-10, G-11, G-12** — these are either invisible to owners or strictly additive.

---

## 18. What this doctrine does **not** cover (out of scope)

- Internal owner dashboard routing (the `/locations`, `/outlets`, `/projects` authenticated surfaces).
- Onboarding flow URL structure.
- Canonica and other product surfaces.
- Tenant-level permissions and who can rename slugs (belongs in an access-control doc).
- Emergency disable of OBP via flag (code-only rollback mechanism).
- Rollout/deployment tooling, feature-flag orchestration, and staging-verification checklists (belongs in the engineering runbook that consumes this doctrine, not the doctrine itself).

---

**Lock date:** To be stamped when implementation of G-01 through G-03 lands (the P0 gaps).

**Revisiting policy:** This doctrine may only be reopened with explicit CEO sign-off. A single ChatGPT conversation is not sufficient grounds to reopen. The cost of oscillating routing behavior (broken QRs, broken installs, broken SEO authority) is too high.

---

## 18. NEED TO DO — follow-ups discovered during G-01 → G-14 implementation

Compiled after the G-01 → G-14 implementation pass. These are items Cascade identified while cross-reading the codebase that were **deliberately left unshipped** because they fell outside the locked 14-gap scope. Each is recorded with its evidence and severity so a later session can pick up work without re-discovering.

Severity scale:

- **T1 (Material)** — ships broken or misaligned user-visible behavior; fix before the next major release.
- **T2 (Doctrine-shipped, thin UX)** — the doctrine decision is live but the owner/customer touchpoint is incomplete.
- **T3 (Latent tech debt)** — works today; degrades safety or clarity over time.
- **T4 (i18n + copy)** — hard-coded English surfaces introduced during G-01 → G-14.
- **T5 (Observability)** — missing signals that would let us measure whether the doctrine is working in production.

### Tier 1 — Material (explicit doctrine items) — ✅ all shipped

| ID      | Item                                     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1-N-01 | A-08 sitemap R5-violating ✅ done        | `@/src/app/client/sitemap.ts` rewritten: emits `/` + each active project's canonical slug URL; adds `/{outletSlug}` + outlet project URLs for multi-outlet tenants; indexes `/menu` only when an owner has claimed slug `menu`. `previousSlugs[]` excluded. Uses `parseSummaryProjects` + `unstable_cache` (5-min revalidate).                                                                                                                                                                                                                              |
| T1-N-02 | A-09 footer brand link ✅ done           | `@/src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx:134-153` — footer brand now renders as `<a href="/">` with an `aria-label` for screen readers. Preserves visual treatment; adds the "back to OBP" affordance required after G-02 made the header logo decorative.                                                                                                                                                                                                                                                               |
| T1-N-03 | A-12 render-side fallback ladder ✅ done | New client component `@/src/app/client/[[...slug]]/MenuNotFoundFallback.tsx` implements the ladder with standalone-mode detection + 2s countdown + explicit "Go to …" links. Wired at `@/src/app/client/[[...slug]]/page.tsx:1003-1018` replacing the prior terminal `<h1>Menu Not Found</h1>`. Offline PWA launches now degrade to outlet OBP (if inside one) or brand OBP instead of dead-ending.                                                                                                                                                         |
| T1-N-04 | A-12 slug reservation window ✅ done     | Helper `isSlugReservedByRecentlyDeleted` in `@/src/database/projects/index.ts:303-373` queries the projects subcollection for `deleted: true` + `deletedAt > now - 90d` + matching `slug` or `previousSlugs[]`. Wired into `addProject` (silent suffix) and `updateProjectMetadata` (explicit owner-facing error). 90-day window locked as `SLUG_RESERVATION_WINDOW_MS`.                                                                                                                                                                                    |
| T1-N-05 | A-03 subdomain admin rename ✅ done      | New admin-only endpoint `@/src/app/api/admin/subdomains/rename/route.ts` (`requiredPlatformRole: 'PLATFORM'`) performs atomic rename + appends to `previousSubdomains[]` with 12-month `expiresAt` + writes `subdomainRenameLog` audit record. Resolver consumer at `@/src/lib/firestore/clientStoreLookup.ts:36-88` adds chain-fallback via denormalized `previousSubdomainSlugs[]` shadow index. 301 redirect at `@/src/app/client/[[...slug]]/page.tsx:897-910`. New `StoreDataType.previousSubdomains` type at `@/src/types/platform/store.ts:116-137`. |

### Tier 2 — Doctrine shipped but thin UX — ✅ all shipped

| ID      | Item                                      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T2-N-01 | G-07 outlet rename UI ✅ done             | New `@/src/components/organisms/OutletRenameModal/index.tsx` calls `/api/outlets/rename` with the doctrinal 12-month redirect warning surfaced inline. Wired into the Chain Control Panel at `@/src/app/(main)/locations/page.tsx` with a "Rename URL" button per outlet row. Master-store row stays actionless — subdomain rename goes through T1-N-05 admin path.                                                           |
| T2-N-02 | A-07 OBP click surface ✅ done            | `trackOBPMenuClick(storeId, obpSurface, data)` now requires the `'brand'                                                                                                                                                                                                                                                                                                                                                      | 'outlet'`discriminator. Aggregation split into`obpMenuClicksBySurface.\*`counters in`@/src/lib/analytics/unified.ts`. Callers: `@/src/app/client/obp/OBPMenuCTA.tsx`accepts`obpSurface`prop;`@/src/app/client/obp/OBPContent.tsx`derives it from`storeOverride` (outlet when set, brand otherwise). | 'outlet'`and pipe outlet context in from`OBPContent`. |
| T2-N-03 | §6.4 install_surface ✅ done              | New `@/src/lib/pwa/surfaceDetection.ts` classifies the current pathname into `obp                                                                                                                                                                                                                                                                                                                                             | menu-alias                                                                                                                                                                                                                                                                                          | project                                               | unknown`. Wired into `fireInstalledEventOnce`and`detectAndTrackAppOpen`. Event payload adds `pwaInstallSurface`; aggregation adds `installsBySurface._`and`appOpensBySurface._`counters in`@/src/lib/analytics/unified.ts`. Comparing the two over time validates the install_surface == launch_surface invariant (D-10). | 'store' | 'project'`. The install controller currently fires a generic install event. With G-03 wiring surfaces via the manifest `start_url`, the same identification should flow to the controller. |
| T2-N-04 | G-04 outlet-scope QR ✅ done              | Added an "Other locations" QR section below the master QR row in `@/src/components/templates/main-app/useMenuList/index.tsx`. For each active outlet with an `outletSlug`, renders a Store Menu QR button targeting `/{outletSlug}/menu` (outlet-scoped Layer 2 alias). Master-user-gated; only master dashboard users see outlet QRs.                                                                                        |
| T2-N-05 | G-09 breadcrumb on outlet OBP ✅ done     | `MenuBreadcrumb` accepts optional `projectName`; when omitted it renders the 2-node Business → Outlet variant. `OBPContent` renders it ONLY on outlet OBPs (storeOverride set + outletSlug present). Brand OBPs remain breadcrumb-less — they are the top node. Master brand name is threaded through `masterBrandName` prop captured pre-outlet-switch by MenuContent.                                                       |
| T2-N-06 | A-06 manifest-id regression guard ✅ done | New `@/src/__tests__/manifestIdDifferentiation.ts` covers five surfaces (brand OBP, outlet OBP, default project, other project, outlet+project). Exports `checkManifestIdDifferentiation()` (returns a detailed report) and `assertManifestIdDifferentiation()` (throws on collision). Runnable via ts-node; drop-in test once a runner is added. Any regression that strips `start_url` from the manifest `id` fails loudly. |
| T2-N-07 | A-10 promoteInstallation parity ✅ done   | Discovered during verification that `CustomerAppController` ONLY mounted inside `ClientMenuRenderer` — OBP surfaces never showed the install prompt. Fixed: new `@/src/app/client/obp/OBPCustomerAppMount.tsx` client wrapper and mounted from `OBPContent` with the same `pwaSettings.promoteInstallation` check. The flag now genuinely suppresses prompts across ALL three install surfaces.                               |

### Tier 3 — Latent tech debt discovered — ✅ 4 shipped, 2 deferred with rationale

| ID      | Item                                      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T3-N-01 | slugify.ts no-tenant branch ✅ done       | Replaced the unreachable `/menu/{slug}` + bare `/menu` emitters in `@/src/lib/utils/slugify.ts:80-93` with a thrown R5-invariant error. Any future code path that calls `generateProjectUrl` without tenant context now fails loudly instead of silently emitting a doctrine-violating URL.                                                                                                                                                                                                                                                                                                                   |
| T3-N-02 | Dead SubdomainTab ✅ done                 | Deleted `@/src/components/templates/main-app/businessSettings/tabs/SubdomainTab.tsx` and removed its re-export from `tabs/index.ts`. DomainSettingsTab is now the sole subdomain surface; future edits can't hit the dead file.                                                                                                                                                                                                                                                                                                                                                                               |
| T3-N-03 | Flat-dotted writer pattern 🟡 partial     | New `@/src/lib/firestore/summaryProjectsWriter.ts` centralizes the write shape with `buildSummaryProjectPayload` / `buildSummaryProjectFieldPayload` / `buildSummaryProjectsBatchPayload` helpers and a `WRITE_NESTED` flag. Shape stays flat-dotted (reader-compatible); flipping the flag once a flat→nested migration ships will automatically convert all call sites that have been migrated to these helpers. **Deferred:** wholesale migration of the 5 existing writers to the helper would be a large mechanical refactor with zero behaviour change. The helper unblocks it for whoever picks it up. |
| T3-N-04 | Invalid collection path ✅ done           | `@/src/database/campaigns/index.ts:722-782` rewritten to query `projects/{tenantId}/{storeId}` (3-segment) directly with the `isDefault`/`active`/`deleted` predicates. The prior 4-segment `.../metadata` path would have thrown `FirebaseError: Invalid collection reference` at runtime. Side benefit: collapses the old 2-step metadata-then-data lookup into a single query (–1 Firestore read per screen load).                                                                                                                                                                                         |
| T3-N-05 | outletSlug backfill ✅ done               | New `@/scripts/backfill-outlet-slugs.ts` — dry-run by default, mirrors the outlet-creation slug rules (slugify + reserve-list + per-tenant uniqueness with `-N` suffix resolution). Idempotent. Writes `outletSlug` + `outletSlugBackfilledAt` audit timestamp. Operator runs once per environment before any multi-outlet tenant onboards at scale.                                                                                                                                                                                                                                                          |
| T3-N-06 | Auto-organizer strips imports 🟡 accepted | Observed again during Tier 2 (MenuBreadcrumb, detectInstallSurface, OBPCustomerAppMount, OutletRenameModal imports each required a second pass). **Accepted workflow friction**: fixing this requires editor-tool configuration changes outside the scope of doctrine. Mitigations applied during this cycle: (1) always re-verify with `tsc --noEmit` after a batch of new imports; (2) use absolute `@/` alias paths which survive organize-imports more reliably than relatives. No code change needed.                                                                                                    |

### Tier 4 — i18n + copy surfaces — ✅ all shipped (en-US keys added; other locales fall back to key names via getMessageFallback)

| ID      | Item                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T4-N-01 | G-08 locked-state strings ✅ done | `@/src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx:263-265` now uses `t('subdomainLockedMessage')` + `t('subdomainLockedDescription')`. Keys added to `BusinessSettings` namespace in `@/public/locales/menulist.ai/en-US.json:222-223`.                                                                                                                                                                                                                              |
| T4-N-02 | G-09 breadcrumb RTL ✅ done       | `@/src/app/client/[[...slug]]/MenuBreadcrumb.tsx:68-76` now sets `dir="auto"` on the nav. Browser derives reading direction from the first strong character in each node's text content — Arabic/Hebrew brand names render in native direction without any locale-branching code. Flex containers honor the inferred `dir` for node ordering. Separator kept as neutral `/` (direction-agnostic).                                                                                                   |
| T4-N-03 | G-04 QR card labels ✅ done       | `@/src/components/templates/main-app/useMenuList/index.tsx:527-574` routes QR titles/descriptions through `t('storeMenuQrTitle')`, `t('businessProfileQrTitle')`, `t('projectMenuQrTitle')`, `t('projectMenuQrDescription', { projectName })`, plus the T2-N-04 outlet helper (`outletQrSectionHelper`) and `downloadQrButton`. New top-level `UseMenuList` namespace added in `@/public/locales/menulist.ai/en-US.json:2479-2490`.                                                                 |
| T4-N-04 | G-13 advisory modal ✅ done       | `@/src/components/templates/main-app/projects/index.tsx:458-505` routes every line of the divergence advisory through `tDivergence(...)`. Paragraphs split around inline `<strong>`/`<code>` children into before/after fragments (next-intl-compatible pattern). New `Projects.divergence` namespace added in `@/public/locales/menulist.ai/en-US.json:2491-2505` — 12 keys covering title, 4 prose fragments, 2 bullet fragments, closing guidance, and both buttons with `{name}` interpolation. |

### Tier 5 — Observability gaps — ✅ all shipped

| ID      | Item                                      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T5-N-01 | Layer 2 alias-hit analytics ✅ done       | New `menuResolutionLayer?: 'layer1' \| 'layer2'` field in `@/src/lib/analytics/unified.ts:255`. Passed from `[[...slug]]/page.tsx:1189` → `ClientMenuRenderer` → `UnifiedAnalyticsTracking` → `AnalyticsContext:71` where it's included in `trackMenuView()`. Firebase aggregation updated at `unified.ts:344-348` to count `menuResolutionLayer.layer1` vs `.layer2`. Enables measurement of R5 Layer 2 adoption vs claimed-slug ownership. |
| T5-N-02 | Subdomain-guard block events ✅ done      | New `TrackingEvent.SUBDOMAIN_MUTATION_BLOCKED` at `unified.ts:140-144` with Firebase aggregation at `unified.ts:473-484`. Wired into `@/src/database/stores/index.tsx:238-245` — fires when G-08 guard blocks subdomain mutation on published store. Tracks `attemptedSubdomain`, `currentSubdomain`, `storeId`, `tenantId` for security/support signal analysis.                                                                            |
| T5-N-03 | G-11 manifest-degradation events ✅ done  | New `TrackingEvent.MANIFEST_START_URL_DEGRADED` at `unified.ts:146-151` with Firebase aggregation at `unified.ts:486-501` (tracks `totalManifestDegradations`, per-store counts, and degradation steps). Wired into `@/src/app/manifest.webmanifest/route.ts:193-207` — fires when `resolvedStartUrl !== startUrl`. Calculates degradation steps from path depth difference (project → /menu → outlet-OBP → brand-OBP).                      |
| T5-N-04 | G-10 alias-fallback switch source ✅ done | Extended `trackProjectSwitch()` source type from `'in_menu' \| 'obp_secondary_card'` to include `'menu_alias_layer2'` at `unified.ts:1015`. Fire-and-forget call added to `AnalyticsContext.tsx:76-83` — when `menuResolutionLayer === 'layer2'`, fires `PROJECT_SWITCH` with source `'menu_alias_layer2'`. Captures the "latent switch" from URL typed (/menu) to project rendered (default).                                               |

### Housekeeping

- **No item in §18 contradicts any locked doctrine decision.** Each is either (a) an explicit doctrine item whose implementation was deferred, (b) a follow-up the doctrine already anticipates ("double-check after G-05 lands" phrasing on §A-08), or (c) a discovery that should be evaluated — and if accepted, brought into the doctrine via a new `A-xx` or `G-xx` entry.
- **Prioritization for next cycle:** T1 > T2 > T5 > T3 > T4. T5 is promoted above T3 because observability gaps blind us to whether T1/T2 work is effective.
- **Nothing in §18 blocks the current deploy.** G-01 → G-14 are complete and type-clean; §18 is the backlog into the next doctrine cycle.
