# Store Onboarding — Current Implementation Contract

**Feature:** #4C — Multi-Outlet Store Onboarding
**Status:** Implemented source evidence; not current launch certification
**Last Reviewed:** July 16, 2026
**Primary authority:** current routes, DALs, shared boundaries, and verifiers in this repository

> **Launch boundary:** Release approval still requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md), authenticated desktop/mobile Locations QA, linked-menu save/public-output QA, Razorpay sandbox evidence where billing is involved, and deployment evidence for the target environment.
>
> The former design blueprint is preserved at [`../_archive/store-onboarding_impl-historical-through-2026-07-14.md`](../_archive/store-onboarding_impl-historical-through-2026-07-14.md). It is historical evidence, not a runtime contract.

## 1. Current invariants

- One tenant has one canonical active HQ/master store in `tenants/{tId}.storesList`; legacy single-store tenants can be promoted during the first create or policy save.
- Outlet identity is a canonical `stores/{sId}` document plus a matching compact tenant row and `platformSummary/storesSummary` projection.
- An outlet is never hard-deleted. Deactivation sets `active: false` while preserving projects, local records, slug history, and audit identity.
- Linked outlet projects store `masterProjectId`, local `L_I_`/`L_C_` records, allowed overrides, and local mutation state. They do not persist resolved master records.
- Master/outlet/customer output is derived from current project/store truth. Public cache, Digital Screens, and Owner Business Assistant effects run after durable writes and report bounded pending state instead of reversing committed data.
- Current source gates are enabled in `src/config/features.ts`; `MAX_OUTLETS_PER_TENANT` is 30 active non-master outlets. Launch certification is a separate decision.

## 2. Admission and authority

Every owner route is authenticated, body-bounded, schema-validated, rate-limited, and tenant-scoped before expensive or mutating work. The write transaction then rechecks current authority:

| Route | Current transaction authority |
| --- | --- |
| `POST /api/outlets/create` | HQ store, tenant, creator user mapping, current role permission, compact membership, active outlet count, paid capacity, current master projects and summary |
| `POST /api/outlets/policy` | Current HQ store/tenant, `MANAGE_OUTLETS`, compact master membership |
| `POST /api/outlets/rename` | Current HQ/outlet/tenant, `MANAGE_OUTLETS`, both compact rows, slug claims |
| `POST /api/outlets/deactivate` | Current HQ/outlet/tenant, `MANAGE_OUTLETS`, both compact rows, current slug claim |
| `POST /api/projects/outlet-save` | Current caller/outlet/master stores, tenant membership, `MANAGE_MENU`, outlet/master project linkage and version |
| `POST /api/outlets/brand-propagation` | Current HQ/tenant, current permission, canonical active outlet list, current outlet documents |

Missing, inactive, deleted, blocked, cross-tenant, stale-role, or membership-drifted state fails closed before the write.

## 3. Billing handoff

`POST /api/outlets/create` owns the orchestration boundary. Billing or prepaid-capacity admission succeeds before internal creation. See [store-onboarding-billing_impl.md](./store-onboarding-billing_impl.md) for Razorpay, UPI replacement, manual capacity, compensation, and deactivation behavior.

## 4. Atomic internal creation

After acquiring `tenant.outletCreationLock` in a transaction and satisfying billing capacity, the creation transaction:

1. Re-reads platform counters, tenant, HQ, creator user, all current HQ projects, and the HQ compact project summary.
2. Revalidates master authority, permission, active counts, the 30-outlet cap, and paid quantity.
3. Allocates a collision-safe store ID and tenant-scoped outlet slug claim.
4. Writes the outlet store, `storesSummary`, tenant `storesList`, creator access mapping, and platform counter.
5. Replicates each eligible HQ project into an inherited outlet project and compact summary entry.
6. Clears the creation lock in the same transaction.

Eligible replication excludes deleted, already-linked, and `projectType: "localOnly"` projects. Creation rejects more than 200 eligible HQ projects so project-plus-summary writes remain below Firestore's 500-write transaction ceiling.

## 5. Success acknowledgement and derived effects

The route returns the canonical store ID, outlet slug/name, tenant name, quantity, and any legacy master promotion only after commit. It then attempts cache tags, Digital Screens content-version touch, and Owner Business Assistant invalidation for the new outlet (and repaired HQ where applicable). A derived failure returns `effectsPending`/`failedEffectCount`; it does not report the committed outlet as failed or roll quantity back.

## 6. Add Outlet owner flow

Desktop `AddOutletModal` and mobile `MobileLocationsScreen`:

1. Show active-store count and eligible billing/proration context.
2. Disable submit when there is no active plan, manual prepaid capacity is exhausted, or UPI requires a paid-location replacement checkout.
3. Call `POST /api/outlets/create` with the shared no-store, same-origin, manual-redirect policy.
4. Parse a bounded 16KB response and update local tenant/HQ state only after a valid success shape.
5. Route `OUTLET_LOCATION_PAYMENT_REQUIRED` to Billing; fixed owner copy is used for other failures.

### 6.3 Failure and retry behavior

There is no current `provisioning` partial-store state. The internal store, access, summary, slug, and inherited-project writes are one transaction. If failure occurs before commit, any provider/local quantity increase is compensated best-effort and only the acquired lock is released. A post-commit derived-effect failure is acknowledged as pending without undoing the outlet.

## 7. Creation compensation

- If a provider quantity increase succeeded but creation did not commit, MenuList attempts to restore the previous provider quantity.
- If the local subscription quantity changed but creation did not commit, MenuList attempts to restore the previous local quantity.
- Failed compensation uses bounded diagnostics for operational follow-up; it never creates an unpaid outlet to hide the mismatch.
- Failed onboarding compensation uses `src/lib/onboarding/compensatedStoreMappings.ts`, a pure exact-ID boundary that can be tested without loading Firebase Admin credentials.

## 8. Store switching

Switch controls are shown only for active stores mapped to the signed-in user and allowed by `SWITCH_STORES`. `POST /api/auth/switch-store` validates current caller permission, active tenant membership, current target store truth, and mapped access. It does not grant access.

### 8.4 Browser context contract

- Selecting the already-current location is a no-op.
- Selecting an outlet requires a successful switch acknowledgement, then refreshes Firebase claims for that outlet before writing `activeStoreContext`.
- Returning to HQ refreshes HQ claims before clearing `activeStoreContext`.
- Persisted context is accepted only as structured JSON containing exact positive numeric `tenantId`, login `baseStoreId`, and target `storeId`; legacy scalar, partial, malformed, or unreadable values are evicted before `SessionProvider` can consume them.
- Desktop and mobile derive `Current`/disabled `View` state from the active context, not only the login-store session row.
- If target hydration fails, session loading falls back to the login store with bounded diagnostics.
- Permission state is cleared before a target/login-store transition and missing or unmatched role data projects an all-denied permission set instead of retaining the previous store's permissions.

## 9. New master-project propagation

`addProject()` creates only the empty master draft. Firestore Rules require an inherited
outlet project to reference a single-source master, so propagation starts after the first
successful master save that changes `files` from empty to exactly one source. Later saves
do not repeat the fan-out. `propagateNewProjectToOutlets()` then runs only for a verified
active master source. The propagation boundary:

- admits a unique compact store list capped at 200 entries;
- rejects linked, deleted, local-only, malformed, or cross-scope source projects;
- derives a deterministic outlet project ID for retry safety;
- rechecks each current target store inside its transaction; and
- writes the inherited project plus its compact public summary atomically per outlet.

Per-outlet failure is bounded and does not corrupt successful targets. No scheduled integrity repair currently invents missing legacy rows; existing-data repair remains an explicit authorized audit.

## 10. Linked outlet persistence

Desktop editor, mobile menu, publish, image selection, and extraction-review apply use `POST /api/projects/outlet-save`. The route stores only approved local records/overrides, enforces optimistic version/linkage checks, increments local/menu versions as appropriate, and writes summary `active` only when explicitly changed.

## 11. Outlet policy ownership

Policy lives on the HQ store and is saved through `POST /api/outlets/policy`. The server merges only known boolean flags. Existing disabled overrides may remain unchanged or be removed; new prohibited mutations are rejected.

## 12. Policy enforcement

The linked-save route enforces price, availability, description, image, language, local-item/category, project-deactivation, theme, brand, and layout rules. Description/image/translation endpoints and extraction jobs enforce the relevant policy before provider spend. Public and server renderers validate the linked master scope and availability before merge.

## 13. Outlet rename

Rename is a single transaction across the outlet store, tenant compact row, `storesSummary`, current slug claim, and redirect claim. Current and historical slug collisions fail closed; `previousOutletSlugs` is deduplicated and capped at five.

## 14. Outlet deactivation

Deactivation atomically marks the store, tenant compact row, and `storesSummary` inactive and releases the current outlet slug claim. It is idempotent. An already-inactive request skips repeated store/public-effect work but can re-attempt an unfinished Razorpay-managed quantity reduction. Manual/offline prepaid capacity is retained. Any unresolved reduction returns `billingReductionPending: true` and `billingActionRequired: "CONTACT_SUPPORT"`.

There is no owner reactivation endpoint in the current contract. Replacement locations receive new store IDs; inactive history does not consume the 30-active-outlet cap.

## 15. Chain identity propagation

HQ changes to the controlled identity/classification field set use `POST /api/outlets/brand-propagation`. The route derives targets from current tenant `storesList`, cross-checks each current store document, and commits HQ, eligible outlet, and summary changes in one transaction. If HQ policy allows brand identity override, outlet propagation is skipped by design.

## 16. Public output and cache

Public outlet project lookup filters compact summary IDs to the requested tenant/store. Linked master references must be well-formed, same-tenant, different-store, active, and not deleted. Invalid references fail closed. Successful owner mutations use the shared public-truth post-commit runner for menu/store/client-store tags, Digital Screens, and assistant cache effects.

## 17. Desktop and mobile Locations

Both surfaces support active/inactive lists, active counts, billing summary, switching, create, rename, deactivate, and policy. Subscription prices remain stored in currency minor units; desktop and mobile Locations use the shared minor-unit formatter before owner-visible display. Mobile remains inside `MobileShell`. Touch actions are at least 44px. Inactive stores remain visible but cannot be switched into or renamed. Billing-reduction failures show the explicit support action; normal derived cache pending state stays operationally logged because no owner action is required.

## 18. Verification and pending external evidence

Local gates:

- `npm run verify:multi-location-boundary`
- `npm run verify:multi-outlet-store-access-boundary`
- `npm run test:store-switch-access-boundary`
- `npm run test:project-propagation-boundary`
- `npm run verify:menulist-api-tenant-safety`
- `npm run verify:billing-entitlement-boundary`
- `npx tsc --noEmit`

Owner/deployment evidence remains pending for authenticated desktop/mobile create/switch/rename/deactivate/policy QA, linked-menu public output/cache QA, Razorpay sandbox quantity increase/decrease and UPI replacement, manual reseller capacity, and any requested Vercel deployment.

---

**DOCUMENT STATUS:** Implemented source evidence - not current launch certification
