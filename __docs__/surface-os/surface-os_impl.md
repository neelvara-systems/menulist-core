# SurfaceOS - Implementation Boundary

**Status:** No runtime implementation
**Last verified:** July 17, 2026

## Existing Source

Only reservation metadata exists:

| Source | Current role |
| --- | --- |
| `src/constants/product.ts` | reserves `SF` |
| `src/constants/productDomains.ts` | holds a disabled domain placeholder |
| `src/lib/multiTenant/domainResolver.ts` | reserves the local namespace from tenant routing |
| `src/constants/urls.ts` | includes future product domains in collision protection |
| `firestore.rules` | permits `SF` only as bounded cross-product source provenance |

The deployment-target matrix has no SurfaceOS entry. No
`src/app/sites/surfaceos`, application route, API route, component tree,
database constant, feature flag, Functions package, or Firebase configuration
exists.

## Current Behavior

- `surfaceos.app` does not resolve as an enabled product site.
- `/__surfaceos` bypasses tenant rewriting but has no page and therefore does
  not activate a product.
- The domain remains reserved against tenant custom-domain claims.
- MenuList production behavior is unchanged.

## Change Gate

Do not add a flag, route, placeholder page, API, collection, scheduler, provider
adapter, or shared-product write merely to prepare for a possible build.
Activation must begin with an explicit architecture/product decision and a new
implementation contract.
