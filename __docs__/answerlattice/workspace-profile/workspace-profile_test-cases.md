# Workspace Profile Test Cases

## Contract

- Accept a complete valid profile and non-negative revision.
- Reject JavaScript, FTP, protocol-relative, and credential-bearing product URLs.
- Reject invalid email, unknown billing model, invalid IANA timezone, invalid `HH:mm`, negative revision, extra fields, and more than 8 surfaces.
- Normalize duplicate and unsafe surface labels.
- Sanitize malformed persisted URL, email, billing model, timezone, and support-day values.
- Reject malformed browser response revisions and incomplete profile shapes.
- Reject a persisted profile that cannot produce a complete valid response, including a missing product name.
- Project malformed persisted name/URL/email/billing/time fields identically in app and Functions bundle runtimes.
- Never copy an object-valued legacy name, credential/unsafe URL, malformed email, or undeclared store field into compiled public/private product objects.

## Route

- GET requires the workspace flag, read limiter, `MANAGE_WORKSPACE`, Answerlattice scope, configured DB, and exact stored scope.
- PUT resolves signed workspace scope, applies the save limiter, verifies database availability, requires permission, then reads bounded strict JSON.
- Every route-owned response has `private, no-store` and `nosniff`.
- PUT rate limit includes `Retry-After`.

## Transaction

- Changed save writes the store, tenant-summary shard, source version, and stale manifest.
- Revision increments exactly once.
- Original launch-profile `createdAt` is preserved.
- Missing source-version and manifest records become complete scope-valid records.
- Malformed or cross-workspace manifest state rejects the save with no store or source-version mutation.
- Stale expected revision returns conflict and does not overwrite.
- Unchanged save performs no version bump.
- Wrong tenant cannot mutate the store.
- A transaction failure commits none of the four target writes.

## Browser

- Save remains disabled until a strict GET response is accepted.
- Successful save replaces form values and revision from the response.
- `409` shows conflict copy and reloads latest values.
- Redirected, oversized, malformed, rejected, or wrong-shape responses never show success.
- Desktop and mobile use the same form and save handler.

## Commands

```bash
npm run test:answerlattice-workspace-profile-contracts
npm run test:answerlattice-workspace-profile:emulator
node scripts/verification/verify-answerlattice-runtime-truth.js
npx tsc --noEmit --pretty false --incremental false
```
