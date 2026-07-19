# Workspace Profile Specification

## Customer Job

Let an authorized workspace manager correct the product details and operating-time context that Answerlattice uses, while preventing a second browser session or partial backend write from silently overwriting or desynchronizing support truth.

## Required Inputs

| Field | Contract |
|---|---|
| `productName` | Required trimmed string, 1-120 characters |
| `productUrl` | Optional HTTP(S) URL, maximum 300 characters, no embedded credentials |
| `supportEmail` | Optional valid email, maximum 160 characters |
| `billingModel` | `subscription`, `usage`, `one_time`, or `not_sure` |
| `primarySurfaces` | At most 8 normalized labels, each at most 80 characters |
| `timeZone` | Valid IANA timezone, maximum 80 characters |
| `businessDayEndTime` | Exact local `HH:mm` |
| `expectedRevision` | Non-negative safe integer from the latest GET |

## Admission

- The user must have an authenticated Answerlattice scope.
- The workspace feature gate must be enabled.
- GET and PUT require `MANAGE_WORKSPACE`.
- The stored document must match exact `AL` product, tenant, store, and document identity.
- PUT is bounded to 32 KB and rate-limited to 20 attempts per minute per workspace.

## Save Invariants

1. The submitted revision must equal the persisted profile revision.
2. An unchanged profile performs no write and does not bump source versions.
3. A changed profile increments the revision once.
4. The store profile, scheduler registry entry, source-version increment, and compiled-bundle stale marker commit in one transaction.
5. A stale editor receives `409 ANSWERLATTICE_WORKSPACE_PROFILE_CONFLICT`; the browser reloads current values instead of retrying an overwrite.
6. Every route-owned response is private, no-store, and `nosniff`.
7. The original `answerlatticeLaunchProfile.createdAt` value is retained across profile edits.
8. If onboarding did not create source-version or manifest records, the first changed save creates complete, scope-valid control-plane documents. Existing malformed or cross-scope records fail closed.

## Failure Behavior

- Malformed or unsafe values: `400`.
- Missing workspace: `404`.
- Wrong product or scope: `403`.
- Stale revision: `409`.
- Rate limit: `429` with `Retry-After`.
- Firebase unavailable: `503`.
- Malformed persisted profile or compiled-context control-plane state: `500`, without returning a partial success shape.
- Transaction failure: `500`, with no partial transaction commit.

## Non-Goals

- No arbitrary custom settings schema.
- No automatic source approval.
- No billing-plan mutation.
- No workflow-notification secret ownership.
- No replacement for detailed Product Surface mapping.
