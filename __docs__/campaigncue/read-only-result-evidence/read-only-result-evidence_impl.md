# Read-Only Result Evidence Implementation

## Active flow

1. The Results tab selects the current campaign.
2. An authorized member chooses report source, scope, dates, and at least one allowlisted total.
3. The client sends `record_result_evidence` through the existing campaign action route with a retry-stable idempotency key.
4. Zod rejects malformed dates, unbounded windows, invalid metrics, extra fields, or evidence attached to another action.
5. The server independently rechecks the feature flag, required payload, current transactional role, workspace membership, location access, and whether the end date is in the future for the current workspace timezone.
6. The server compacts metrics, creates a SHA-256-derived source fingerprint, and updates the campaign transactionally.
7. A metadata-only event records that evidence was saved.
8. The analytics summary and Campaign Memory are not written.

## File map

- `src/constants/campaigncue/resultEvidence.ts`: providers, scopes, metrics, role allowlist, connector posture.
- `src/lib/campaigncue/resultEvidence.ts`: compaction, fingerprint, and durable record builder.
- `src/lib/validation/campaigncueSchemas.ts`: request runtime validation.
- `src/lib/campaigncue/recordBoundary.ts`: persisted record validation.
- `src/lib/campaigncue/server.ts`: authorization, transaction, audit event, and no-summary boundary.
- `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx`: Results-tab owner form.
- `scripts/verification/test-campaigncue-read-only-result-evidence.ts`: deterministic and static regression coverage.

## Provider connector boundary

The active runtime does not call provider APIs. `src/database/integrations/gbp.ts` continues to fail closed for token storage. A future API adapter must be implemented separately and may only activate after all gates in `CAMPAIGNCUE_READ_ONLY_RESULT_CONNECTOR_POSTURE.activationGate` are satisfied.

Provider model:

```text
provider response
-> server-only adapter
-> runtime schema validation
-> bounded allowlisted metrics
-> imported evidence candidate
-> owner-visible confirmation
-> same campaign evidence record
```

It must not reuse MenuList provider tokens implicitly or turn provider totals into campaign attribution.

## Error behavior

- invalid request: HTTP 400 at route validation;
- disabled feature: 404;
- unauthorized role or location: 403;
- report window ending after the current workspace-local date: 409;
- idempotency identity mismatch: existing CampaignCue conflict behavior;
- provider API unavailable: not applicable to the active owner-copied flow.
