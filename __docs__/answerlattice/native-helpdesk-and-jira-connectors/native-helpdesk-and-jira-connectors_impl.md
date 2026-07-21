# Native Helpdesk and Jira Connectors - Implementation

> **Status:** No runtime implementation exists
> **Last Updated:** 2026-07-20

## Current Source Boundary

- No provider-specific feature flag exists.
- No matching Answerlattice Functions flag exists.
- No Zendesk, Intercom, Freshdesk, Help Scout, or Jira source adapter exists.
- No OAuth callback, credential document, webhook, poller, cursor, sync worker, setup UI, or scheduler task exists.
- Existing Slack/email/Linear/GitHub code delivers bounded governance events outward; it does not ingest helpdesk or Jira sources.
- Knowledge Intake and Repeated Reply Import provide the current export-based route.

## Future Implementation Order

If the admission gate passes:

1. Select one provider from paying-client evidence.
2. Complete a provider-specific RFC, threat model, scope matrix, and cost envelope.
3. Prove a concierge export import produces useful reviewed outcomes.
4. Implement server-only read-only credential ownership and revocation.
5. Implement selected-resource initial import with bounded pagination.
6. Implement source identity, change, deletion, and dependent-answer review.
7. Prove manual refresh and recovery.
8. Add background sync only after measured repeated use.

Do not create a generic connector framework before the first provider demonstrates real shared requirements.
