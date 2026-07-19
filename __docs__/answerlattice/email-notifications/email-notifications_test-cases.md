# Answerlattice Email Notification Test Cases

> **Last verified:** July 19, 2026

## Automated contract coverage

| Case | Expected result |
|---|---|
| Unauthenticated send request | Denied |
| Request over 16 KiB | Rejected before schema or Firestore work |
| Unknown field such as recipient or metadata | Rejected by strict schema |
| Missing/invalid `tId` or `sId` | Rejected |
| Same-scope user without `MANAGE_SUPPORT` | Denied before ticket read |
| Wrong-scope or deleted ticket | Not projected |
| Created event | Recipient/content derived from persisted ticket |
| Reply with missing message | Rejected |
| Reply for system message | Rejected |
| Requester self-reply | Suppressed |
| Eligible support reply | Exact message projected |
| Ordinary ticket edit without status change | No status notification request |
| Real status transition | Latest status evidence projected once |
| Concurrent deterministic sends | One active delivery claim |
| Exact already-sent retry | Suppressed |
| Unexpired in-flight retry | Suppressed |
| Expired lease | Reclaimable |
| Mismatched finalization claim | Rejected |
| Rate-limit query failure | Fail closed |
| Unsafe template HTML or subject newline | Escaped/sanitized |
| Non-HTTPS ticket URL | Not rendered |
| Invalid SMTP port or missing credential | Sender not ready |

## Focused commands

```bash
npm run verify:ticket-notification-boundary
npm run test:notification-delivery-claim:emulator
npm run test:answerlattice-ticket-contracts
node scripts/verification/verify-answerlattice-runtime-truth.js
```

## Manual QA

1. Send the Activation test to the scoped workspace support inbox.
2. Create a ticket and verify one confirmation reaches the persisted requester.
3. Reply as the requester and verify no self-reply email is sent.
4. Reply as support and verify the persisted reply preview is used.
5. Change status and verify the latest status and remark are used.
6. Replay the same event identity and verify no second direct delivery.
7. Remove SMTP configuration and verify the ticket still persists while delivery reports failure.
8. Close the browser immediately after a ticket mutation and confirm the product does not promise that the request reached the email route.

## External evidence

SMTP provider acceptance, inbox placement, spam handling, real mobile mail clients, and production delivery latency require environment-level verification. Source tests cannot prove them.
