# Configuration Safety

Configuration safety is the cross-product boundary for source feature flags,
deployment-stage identity, public/private environment separation, and
server-side provider or scheduler overrides.

## Current contract

- `src/config/features.ts` contains source-controlled build/runtime constants.
  They are not a remote flag service and changing them requires a release.
- `functions/src/constants/features.ts` owns MenuList Functions constants and
  accepts only explicit boolean environment overrides.
- `src/constants/deploymentTargets.ts` is the product/stage target matrix.
- `src/lib/env/validateEnv.ts`, wired through `src/instrumentation.ts`, reports
  missing, conflicting, and malformed target configuration.
- Spend/provider gates default off where the capability is not launched.
- Full product names are used in environment keys. `ML`, `AL`, `CC`, and `MC`
  remain internal product codes only.

See the [specification](./configuration-safety_spec.md), [implementation](./configuration-safety_impl.md),
[Firebase boundary](./configuration-safety_firebase.md), and
[verification record](./configuration-safety_verification.md).
