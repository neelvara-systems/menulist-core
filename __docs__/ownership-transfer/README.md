# Ownership Transfer Protocol

**Status:** 📝 DEFERRED — Architecture documented, implementation deferred until 200+ stores  
**Feature Flag:** `ENABLE_OWNERSHIP_TRANSFER: false` (placeholder, not yet added)  
**Priority:** 🟡 DEFERRED — Not needed at <50 stores  
**Created:** February 20, 2026  
**Source:** ChatGPT launch infra review → Cascade critical review

---

## Quick Navigation

| Document | Audience | Purpose |
|----------|----------|---------|
| [ownership-transfer_spec.md](./ownership-transfer_spec.md) | CEO/PM | Architecture overview (DEFERRED) |

---

## One-Liner

Protocol for transferring store ownership between users — direct transfer, organization takeover, and forced recovery for disputes.

## Why DEFERRED

At <50 stores managed by a solo founder:
- Ownership changes are rare (maybe 1-2 per year)
- Can be handled manually via Firebase Console (change `ownerUserId` on store doc)
- Building a full transfer protocol with reversal windows, token acceptance, and audit trails is over-engineering for current scale

**Build when:** 200+ stores, OR first ownership dispute occurs, OR franchise/chain customers appear.

## Architecture Preview (For When We Build)

### 3 Transfer Types

| Type | Description | When Needed |
|------|------------|-------------|
| **Direct Transfer** | Owner → new owner (email invite, token accept, 24h reversal) | Business sold, partner change |
| **Organization Takeover** | Chain/franchise acquires individual store | Multi-store expansion |
| **Forced Recovery** | Admin transfers ownership (lost access, dispute) | Emergency, requires evidence |

### Schema (Planned)

```typescript
// Added to store document
ownerUserId: string;                    // Already exists
ownershipStatus: 'active' | 'transfer_pending' | 'locked';
pendingTransfer?: {
  newOwnerEmail: string;
  token: string;
  initiatedAt: Timestamp;
  expiresAt: Timestamp;                 // 48h expiry
};
transferHistory: Array<{
  from: string;
  to: string;
  ts: Timestamp;
  type: 'direct' | 'org_takeover' | 'forced';
}>;
```

### ChatGPT Suggestions — Cascade Assessment

| Suggestion | Decision | Reason |
|-----------|----------|--------|
| Organization entity (separate collection) | **REJECTED** | Multi-outlet already handles multi-store. `organizationId` adds schema complexity without value until franchise customers exist |
| 24h reversal window | **ACCEPT (when built)** | Good safety mechanism. Standard in ownership transfers |
| 48h transfer link expiry | **ACCEPT (when built)** | Prevents stale transfer links |
| 48h transfer cooldown | **ACCEPT (when built)** | Prevents hijack loops |
| Forced recovery with evidence | **ACCEPT (when built)** | Required for disputes. Admin-only action |
| Audit trail (transferHistory) | **ACCEPT (when built)** | Low cost, high value for legal protection |

### Manual Workaround (Current)

Until this feature is built, ownership changes are handled by:
1. Founder receives request (via support)
2. Verify identity (email, phone, business registration)
3. Directly update `ownerUserId` in Firebase Console
4. Log the change manually in incident/support records

---

## Dependencies (When Building)

- Email service for transfer invitation
- Token generation + verification
- Admin panel integration (for forced transfers)
- Audit logging

---

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | February 20, 2026 | Architecture documented (DEFERRED) |
