# Internal Ops Monitoring — Operator Runbook

**Audience:** Authorized MenuList platform operator only
**Last updated:** July 16, 2026

1. Open `/ops` and refresh once.
2. If “state unavailable” appears, do not interpret missing numbers as healthy. Check session status, Upstash/limiter availability, Firebase permissions/indexes and the linked specialist monitor.
3. If SAFE_MODE is needed, read the confirmation, activate it once and verify the returned state. It stops guarded AI generation/upload paths; it does not stop public menus or publishing.
4. Use Mute Alerts only for a bounded deploy window. Muting delivery does not resolve or delete alerts.
5. Use Force Republish only after selecting the intended tenant/store. Treat `unavailable` verification as incomplete recovery.
6. In Scheduler Monitor, select one canonical store and run recovery once. `partial` requires inspection; `failed` is not success. Keep the validated run-log ID for diagnosis.
7. In Extraction Monitor, retry only a failed/retryable job after checking its scoped details. Another active job or invalid source ownership must be left rejected.
8. Use Platform/Owner Notification recovery actions with stable action IDs; repeated acknowledgement/handoff/retry must remain idempotent.
9. Entity block changes affect auth/public/cache behavior. Confirm the exact entity and reason, then inspect post-commit effect status.

Stop and escalate if the current-access check returns 403, the limiter returns 503, target scope is missing/mismatched, a response fails validation, or a committed mutation reports pending effects.
