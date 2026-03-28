# Ownership Transfer — Product Specification (DEFERRED)

**Status:** 📝 DEFERRED — Architecture only, no implementation planned  
**Created:** February 20, 2026  
**Audience:** CEO, PM, Non-developers

---

## Executive Summary

**What:** Protocol for transferring store ownership between users.  
**Why:** As MenuList scales, businesses get sold, partners change, and disputes arise.  
**When:** Deferred until 200+ stores or first ownership dispute. Currently handled manually.

---

## Transfer Types

### Type A — Direct Owner Transfer (Most Common)

**Scenario:** Business sold, partner exits, owner changes email.

**Flow:**
1. Current owner initiates transfer (enters new owner's email)
2. System creates pending transfer with token + 48h expiry
3. New owner receives email with acceptance link
4. On accept: ownership transfers, 24h reversal window begins
5. After 24h: transfer finalized, irreversible

### Type B — Organization Takeover (Future)

**Scenario:** Chain/franchise acquires individual store.

**Note:** REJECTED for now. Multi-outlet already handles multi-store management. Organization entity is premature until franchise customers exist.

### Type C — Forced Recovery Transfer (Rare)

**Scenario:** Owner lost email access, business sold without transfer, legal dispute.

**Flow:**
1. Admin receives request with evidence (business registration, phone verification)
2. Admin executes forced transfer via admin panel
3. Mandatory audit log entry
4. No reversal window (admin-approved action)

---

## Security Requirements (When Built)

- Only current owner can initiate direct transfer
- Managers/staff CANNOT initiate transfers
- Transfer link expires in 48 hours
- 24-hour reversal window after acceptance
- 48-hour cooldown between transfers (prevents hijack loops)
- All transfers logged in immutable audit trail
- Forced transfers require admin + evidence

---

## Current Manual Workaround

At <50 stores, ownership changes are handled manually:
1. Founder verifies identity
2. Updates `ownerUserId` in Firebase Console
3. Logs the change

This is sufficient for current scale. Full protocol implementation deferred.

---

**Document Policy:** Spec only. Implementation deferred.
