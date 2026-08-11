# Approval and Comment Inbox - Validation Ledger

**Status:** Code-complete and locally verified; authenticated multi-role evidence remains pending

- [x] Bounded pure approval lifecycle implemented.
- [x] Comment and resolution actions added to strict validation.
- [x] Existing campaign and approval documents reused atomically.
- [x] No overview read or listener added.
- [x] Output and location membership revalidated in transaction.
- [x] Role gates and idempotency preserved.
- [x] Request/comment/resolve roles share one policy, and current role is rechecked inside the transaction.
- [x] Open comments block approval.
- [x] Raw comments excluded from event metadata.
- [x] Backward-compatible persisted parser added.
- [x] Owner Agency Workspace UI implemented.
- [x] Focused regression suite added.
- [x] Firestore emulator and aggregate CampaignCue verifier pass in the final expansion pass.
- [ ] Authenticated owner/reviewer/agency/mobile evidence recorded against CampaignCue QA.

The remaining authenticated evidence depends on CampaignCue Firebase configuration and test accounts.
