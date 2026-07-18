# Configuration Safety Specification

## Requirements

1. Conflicting or unknown deployment-stage markers must not silently select a
   production target.
2. Public and private Firebase project IDs must match the stage target matrix.
3. `NEXT_PUBLIC_*` values may contain public client configuration only.
4. Boolean environment values must use an explicit recognized true or false
   form. Invalid override text must not enable work.
5. Model/provider rollout percentages must remain within 0–100. Zero means no
   admission; 1–99 requires a stable caller-derived rollout bucket.
6. A source feature flag is a release-time capability boundary, not an
   instant remote kill switch.
7. App, Functions, mobile, and documentation must use the same feature and
   environment names; shorthand product environment prefixes are forbidden.
8. Configuration checks must not log secrets or raw credential values.

## Non-goals

- No Firestore-backed remote flag collection.
- No owner-facing configuration dashboard.
- No runtime dependency or extra Firebase read on application boot.
- No attempt to make missing provider credentials appear operational.
