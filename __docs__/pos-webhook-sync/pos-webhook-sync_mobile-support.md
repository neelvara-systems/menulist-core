# POS Webhook Sync — Mobile Support

**Last Updated:** July 2, 2026
**Decision:** ⚠️ LIMITED MOBILE SUPPORT — Status and light configuration supported

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ⚠️ MIXED | Full setup is rare, but status checks happen on phone |
| **Speed** | ⚠️ MIXED | Light edits and test ping are acceptable on mobile |
| **Touch** | ⚠️ MIXED | URL input is not ideal, but manageable for urgent fixes |
| **Value** | ✅ PASS | Owners may need to verify sync health away from desk |

**Decision:** Mobile supports operational visibility and light-touch edits:
- understand what External Menu Sync does before seeing technical fields
- view a simple MenuList -> connected systems explanation and "Who should use this?" guidance
- enable/disable sync
- view status
- edit provider connection URL
- view masked verification secret preview, reveal deliberately, copy secret, and regenerate with typed confirmation
- test the connection

Heavy integration setup and provider coordination are still desktop-preferred. Mobile must not expose the full signing secret by default.

## Failure Boundary

`MobilePosSyncScreen` saves external sync settings and secret-rotation metadata through the shared `updateStore()` path. It must require `assertStoreUpdateSucceeded()` before local POS Sync state or saved copy changes. Rejected store acknowledgements use `mobile_pos_sync_store_update_rejected` and route through the same bounded failure handler. Failed settings saves must log `mobile_pos_sync_settings_save_failed` with bounded store, tenant, status presence/length, enabled-state booleans, webhook URL/secret presence-length metadata, pending-secret-rotation presence, and changed-field booleans before showing fixed owner-facing copy.

Failed signing-secret copy actions must log `mobile_pos_sync_secret_copy_failed` with bounded store/tenant context, secret presence/length, reveal state, pending-rotation presence, and clipboard/fallback support booleans only. Signing-secret copied feedback must wait for Clipboard API success or acknowledged textarea fallback success.

Connection-test requests must import the shared `POS_SYNC_TEST_REQUEST_POLICY` from `src/lib/posSync/testResponse.ts`, preserving same-origin credentials, no-store cache policy, and manual redirect handling before the same shared 16KB bounded `/api/pos-sync/test` response guard as desktop. Mobile shows reachable feedback only after an OK HTTP response plus `isSuccessfulPosSyncTestResponse()`. Malformed or oversized responses log `mobile_pos_sync_test_response_parse_failed`; invalid acknowledgements log `mobile_pos_sync_test_response_invalid`; provider-side test failures continue to log `mobile_pos_sync_test_failed`.

The mobile screen must not log raw webhook URLs, webhook secrets, provider responses, API response text, or exception text. Connection tests continue to show the fixed `Could not reach connected system` message.

## Source Gate

POS Sync boundary source gate: `npm run verify:pos-sync-boundary`. This locks MobileShell More routing, the shared URL validator and `/api/pos-sync/test` acknowledgement boundary, debounced delivery URL+secret admission, fixed owner-facing failure copy, and docs/audit parity. It is source-only and does not call an external POS provider.
