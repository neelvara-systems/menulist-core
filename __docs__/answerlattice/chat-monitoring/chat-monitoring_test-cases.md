# Conversation Monitoring Test Cases

- Same-workspace viewer without support permission cannot read sessions or analytics.
- Authorized support role and `PLATFORM_SUPPORT` can read support conversations.
- Other workspace and public access fail.
- Invalid product, actor, scope, mode, time, unknown fields, and empty/oversized messages fail.
- Valid append succeeds; immutable actor/creation/scope fields cannot change.
- Feedback updates session and search history atomically and cannot be rewritten.
- Internal note preserves original creator metadata.
- Image upload rejects remote URLs, MIME mismatch, malformed base64, oversize, and cross-workspace URLs.
- Session deletion reports deferred persisted-image cleanup truthfully.
- User/admin/statistics/volume queries retain their caps.

```bash
npm run test:answerlattice-chat-session-contracts
npm run test:answerlattice-chat-sessions:rules
npm run test:answerlattice-chat-sessions:shared-rules
npm run test:answerlattice-chat-analytics-contracts
npm run test:answerlattice-chat-analytics:rules
npm run test:answerlattice-chat-analytics:shared-rules
npm run test:answerlattice-storage:rules
npm run test:answerlattice-storage:shared-rules
```
