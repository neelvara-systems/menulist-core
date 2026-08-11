# Multi-Product Doctrine

> **v1.0.0** | 2025-03-05
> Permanent rules for ALL products in this platform.
> Follow this when building any new product or separating an existing one.

---

## 1. Identity Model (Universal, Non-Negotiable)

Every document in every product uses: `pId` / `tId` / `sId` / `docId`

- `pId` = 2-char uppercase product code (ML, AL, SF, GR, KS)
- `tId` = tenant ID within that product's scope
- `sId` = store/workspace/scope ID within that tenant
- No custom identity fields. Never `accountId`, `locationId`, `orgId`, `workspaceId`.

## 2. Product Registry

| Product    | pId | Firebase Project |
| ---------- | --- | ---------------- |
| MenuList   | ML  | menulist-qa          |
| Answerlattice   | AL  | answerlattice         |
| SurfaceOS  | SF  | menulist-qa          |
| GrowthOS   | GR  | menulist-qa          |
| KitStamp | KS  | menulist-qa          |

New product? Assign a 2-char code. Codes never change. Names may rebrand.

## 3. Firebase Project Rules

- Products sharing user base + tenant data = same Firebase project
- Products serving external clients = separate Firebase project
- No cross-project Firestore queries. Communication via tokens/APIs only.

## 4. Answerlattice Integration (CCT Pattern)

Any product using Answerlattice follows the same flow:

1. Register as Answerlattice client (get `clientId`, `secretKey`, `tId`, `sId`)
2. Generate signed JWT (CCT) containing: `clientId`, `traceId`, `requestId`, user identity, optional source scope
3. Answerlattice decodes CCT → builds `AnswerlatticePlatformContext` → writes documents
4. `sourceContext` on every cross-product document

## 5. DAL Separation Pattern

Each separated product gets its own Firebase client:

```
src/lib/firebase/{product}Config.ts
src/lib/firebase/{product}FirebaseClient.ts
src/lib/firebase/{product}FirebaseAdmin.ts
```

Product DAL files import from their own client, never from another product's client.

## 6. Cloud Functions Separation

Each separated product gets its own functions directory:

```
functions/               → MenuList (local/preview menulist-qa, production menulist)
functions-answerlattice/      → Answerlattice (local/preview answerlattice-qa, production answerlattice)
functions-{product}/     → Future product
```

Deploy independently: `firebase deploy --only functions --project {project} --config firebase-{product}.json`

## 7. Environment Variables

Each separated product gets prefixed env vars:

| Environment | MenuList canonical project ID | Answerlattice `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID` |
| --- | --- | --- |
| Local development | `menulist-qa` | `answerlattice-qa` |
| Vercel Preview / QA | `menulist-qa` | `answerlattice-qa` |
| Vercel Production | `menulist` | `answerlattice` |

Answerlattice env vars stay prefixed with `ANSWERLATTICE_` / `NEXT_PUBLIC_ANSWERLATTICE_`, and `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate` is the active local, preview, and production path. The server reuses non-secret public Firebase identifiers; only Admin credentials remain private. Prefer env-based Admin credentials over a local service-account JSON file.

## 8. When to Separate a New Product

Separate Firebase project when ANY of these are true:

- Product serves external clients (not just MenuList users)
- Product needs independent billing visibility
- Product needs independent Auth
- Product needs independent scaling/quotas

Otherwise keep in menulist-qa with MenuList ecosystem.

## 9. New Product Checklist

1. Assign `pId` code in Product Registry
2. Decide Firebase project (menulist-qa or new)
3. If new project: create Firebase files + env vars
4. Create DAL directory: `src/database/{product}/`
5. Create lib directory: `src/lib/{product}/`
6. Create types: `src/types/{product}.ts`
7. Create functions directory if needed: `functions-{product}/`
8. Add feature flags: `ENABLE_{PRODUCT}_*`
9. Register as Answerlattice client if using Answerlattice
10. Add collection constants to `src/constants/database.ts`
11. Update `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md` detection rules

## 10. Permanent Prohibitions

- Never share Firestore between separated projects
- Never read another product's session directly
- Never use custom identity fields (always pId/tId/sId)
- Never let one product's failure crash another (graceful degradation)
- Never duplicate data ownership (one product owns each data type)

## 11. Reference Documents

- `07-multi-product-tenancy.md` — Architecture + rules + implementation plan (v4.3.0)
- `08-product-separation-playbook.md` — File-level audit + execution steps + implementation status
- `09-multi-product-doctrine.md` — This file (universal rules for all products)
- `10-implementation-action-items.md` — Founder manual action items (Firebase project, env vars, CF moves)
