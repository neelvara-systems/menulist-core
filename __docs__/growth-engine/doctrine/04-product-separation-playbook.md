# Growth Engine Product Separation Playbook

**Status:** Planning playbook
**Product:** Growth Engine

---

## 1. Separation Target

Growth Engine is separate from MenuList, GrowthOS, KitStamp, Answerlattice, MyCodex, and Canonica.

Recommended code and runtime shape:

| Layer | Growth Engine target |
| --- | --- |
| Product ID | `GE` proposed |
| Docs | `__docs__/growth-engine/` |
| App route | `src/app/(growth-engine)/growth-engine/` |
| API route | `src/app/api/growth-engine/` |
| Components | `src/components/templates/growth-engine/` |
| Hooks | `src/hooks/growth-engine/` |
| DAL | `src/database/growth-engine/` |
| Lib | `src/lib/growth-engine/` |
| Types | `src/types/growth-engine/` |
| Constants | `src/constants/growth-engine/` |
| Firebase client | `src/lib/firebase/growthEngineFirebaseClient.ts` |
| Functions | `functions-growth-engine/` |
| QA Firebase | `growth-engine-qa` proposed |
| Prod Firebase | `growth-engine` proposed |
| Public website | None at launch |

## 2. Same Repo Rule

Use the same repo initially because Growth Engine needs current MenuList onboarding, public surface, discovery, and feedback contracts.

Shared root infrastructure may be reused:

- auth/session helpers if scoped correctly
- secure logging
- rate limit patterns
- Zod validation patterns
- product-domain resolver patterns
- shared design primitives where safe
- deployment verification scripts where product-aware

Do not share:

- Firestore data project
- lead collections
- distribution target collections
- discovery publish job collections
- surface health collections
- source payloads
- provider secrets
- message histories
- suppression evidence
- Growth Engine admin UI layouts with MenuList owner layouts

## 3. MenuList Bridge

Allowed bridge:

- create tracked growth route to an existing MenuList onboarding flow
- receive route clicked / onboarding started / completed / dropped feedback
- receive canonical surface publish state from MenuList
- receive structured data, sitemap, feed export, truth packet, and freshness events
- create owner-authorized GBP handoff records without bypassing MenuList/Google policy
- optional prefill only through approved onboarding contract

Blocked bridge:

- Growth Engine writes menu/store/project/customer truth
- Growth Engine publishes candidate-only facts to MenuList public pages
- Growth Engine bypasses MenuList claim/onboarding validation
- Growth Engine uses MenuList owner UI as its campaign surface
- MenuList dashboards query Growth Engine lead data
- Growth Engine uses Google Business Profile APIs or GoogleLocations for lead generation
- Growth Engine uses Google Indexing API for MenuList menu/business pages

## 4. GrowthOS Collision Rule

GrowthOS/Growth Kits is for existing MenuList owners and current MenuList truth.

Growth Engine is for internal distribution target acquisition, claim routing, owned surface distribution, and attribution.

Do not reuse:

- `GR` product code
- GrowthOS routes
- GrowthOS docs folder
- GrowthOS owner-facing names
- GrowthOS entitlement model

## 5. Extraction Rule

Move Growth Engine to a separate repository only if at least one condition is true:

- separate engineering team owns it
- separate deploy cadence becomes necessary
- external customers use it directly
- compliance requires a hard repo boundary
- build/deploy blast radius becomes unacceptable
- provider/security secrets require isolated CI

Until then, same repo with strict product folders is lower-risk.
