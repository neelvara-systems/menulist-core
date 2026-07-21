# Native Helpdesk and Jira Connectors - Test Cases

> **Last Updated:** 2026-07-20

## Current Boundary

1. No provider-specific app or Functions feature flag exists.
2. No provider-named adapter, OAuth, credential, webhook, poller, sync, route, or UI path exists.
3. No provider environment variable or credential constant exists.
4. Public copy does not claim native provider connection or synchronization.
5. Existing export/import and repeated-reply intake remains the supported workflow.
6. Imported support history remains evidence requiring human review.
7. Current Firebase and provider operation count is zero.
8. Feature 43 remains a do-not-build-now decision until one provider passes the admission gate.
9. Provider-specific logic hidden in a generic runtime file fails the source gate.
10. Public copy cannot imply a native provider connector through alternate wording.

## Future Provider Tests

Test exact scope, selected resources, cross-tenant denial, token expiry/revocation, reconnect, cursor replay, bounded pagination, 401/403/429/5xx, partial sync, duplicate/change identity, permission loss, source deletion, dependent-answer review, attachment/internal-note/requester-profile exclusion, privacy projection, citation authorization, retention, cost caps, and no automatic truth publication.

## Command

- `npm run verify:answerlattice-native-helpdesk-connectors`
