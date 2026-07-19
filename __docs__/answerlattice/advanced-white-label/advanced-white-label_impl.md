# Advanced White Label Implementation

## Verified Flow

```text
default-off flag
-> governance route and permission boundary
-> exact positive workspace scope
-> platformSummary branding document read
-> AL/product/workspace ownership check
-> strict stored-profile normalization
-> private editor
-> strict save parsing
-> Answerlattice document composition
-> one tenant-scoped Firestore write
-> local editor state update
```

There is intentionally no next step into widget, hosted help, KB, email, public API, compiled context, or public-cache invalidation.

## File Map

| Concern | Source |
|---|---|
| Rollout gate | `src/config/features.ts` |
| Navigation/permission | `src/constants/answerlattice/navigations.ts`, `src/constants/answerlattice/permissions.ts` |
| Editor | `src/components/templates/answerlattice/governance/WhiteLabelBranding.tsx` |
| Governance load/save wiring | `src/components/templates/answerlattice/governance/index.tsx` |
| Validation | `src/lib/answerlattice/advancedBrandingContracts.ts` |
| DAL | `src/database/answerlattice/branding.ts` |
| Type | `src/types/answerlattice/index.ts` |
| Dedicated/shared authorization | `firestore-answerlattice.rules`, `firestore.rules` |

## Failure Behavior

- Invalid scope throws before a Firestore reference is built.
- Cross-product or cross-workspace stored data throws and is logged by the governance boundary.
- Missing documents return a copy of the default profile.
- Invalid stored profile data degrades to the default profile; it is never projected publicly.
- Invalid form or schema input writes nothing.
- Firestore rejection is not converted into a successful save result.

## Existing Widget Boundary

The current customer-facing appearance workflow remains Widget settings. It stores `stores/{sId}.widgetConfig`, is compiled into the widget bootstrap, and controls bounded header, greeting, accent, launcher, and powered-by fields. Advanced branding must not silently override that independent working contract.
