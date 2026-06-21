# ConstantLayer Main Website - Firebase And Cost Tracking

**Status:** Implemented  
**Scope:** ConstantLayer Systems parent website v1  
**Firebase impact:** None

---

## 1. Cost Decision

ConstantLayer main website v1 has zero Firebase runtime cost.

The site is implemented as static public Next pages in the shared Vercel app. It does not introduce Firestore, Storage, Firebase Auth, Cloud Functions, Firebase Hosting, rules, indexes, product metadata, owner notifications, or billing plans.

---

## 2. Firebase Resources

| Firebase resource | V1 usage | Cost impact |
| --- | --- | --- |
| Firestore | None | 0 reads / 0 writes / 0 deletes |
| Firebase Auth | None | 0 |
| Cloud Functions | None | 0 invocations |
| Firebase Storage | None | 0 storage / 0 bandwidth |
| Firebase Hosting | None | 0 |
| Firestore rules | No change | 0 |
| Firestore indexes | No change | 0 |
| Scheduled functions | None | 0 |

---

## 3. Product Metadata Boundary

Do not create:

- ConstantLayer `pId`
- ConstantLayer Firebase project
- ConstantLayer Firestore collections
- ConstantLayer Storage bucket
- ConstantLayer billing plans
- ConstantLayer owner notifications
- ConstantLayer Cloud Functions
- ConstantLayer feature flags

Allowed and implemented:

- ConstantLayer route/domain slug in `ProductSiteId`
- ConstantLayer deployment target with empty `firebaseProjectId`
- ConstantLayer static public website under `src/app/sites/constantlayer/`

Source evidence:

- Product codes do not include ConstantLayer: `src/constants/product.ts:13`.
- ConstantLayer deployment targets use an empty Firebase project id: `src/constants/deploymentTargets.ts`.
- Environment validation maps ConstantLayer to no Firebase env requirements: `src/lib/env/validateEnv.ts`.

---

## 4. Hosting Cost

Expected runtime cost:

- normal Vercel static/Next page serving
- no database operations
- no provider calls
- no image generation
- no form submission storage

Default v1 decision: no analytics until explicitly reviewed.

---

## 5. Data Collection Cost

No website-owned data collection in v1.

| Feature | Decision | Reason |
| --- | --- | --- |
| Contact form | Excluded | Avoids storing personal data |
| Newsletter | Excluded | No mailing-list system needed |
| Account creation | Excluded | Not a product app |
| Visitor database | Excluded | Not needed for entity trust |
| Product onboarding | Excluded | Belongs to MenuList |

Contact should use email links or displayed email addresses only.

---

## 6. Future Change Triggers

Create a new Firebase/cost review before any of these are added:

- contact form
- lead capture
- newsletter signup
- analytics beyond basic hosting logs
- product login
- vendor portal
- billing or checkout
- downloadable gated assets
- admin editor
- CMS
- product-specific account data

If any future implementation touches Firebase rules, indexes, or Cloud Functions, the repo's Firebase validation and deploy rules apply at that time.

---

## 7. Cost Summary

```text
Firestore reads: 0
Firestore writes: 0
Firestore deletes: 0
Storage writes: 0
Cloud Function invocations: 0
Provider calls: 0
Firebase deploys: 0
```

No Firebase deployment is required.
