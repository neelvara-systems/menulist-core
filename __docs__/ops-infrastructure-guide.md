# Operational Infrastructure — Usage Guide

**Status:** ✅ IMPLEMENTED  
**Created:** February 20, 2026  
**Audience:** Founder, Developers  
**Purpose:** When to use what, where, how — single reference for all ops systems

---

## Quick Reference: What's Available

| System | Feature Flag | Status | What It Does |
|--------|-------------|--------|-------------|
| SAFE_MODE | `ENABLE_COST_PROTECTION` | OFF | Circuit breaker for expensive AI operations |
| Telegram Alerts | `ENABLE_OPS_ALERTS` | OFF | Push notifications for system failures |
| Menu Health Monitor | `ENABLE_MENU_HEALTH_MONITOR` | OFF | Post-publish menu verification |
| Ops Dashboard | N/A (route-level) | Built | System visibility at `/ops` |

**All flags are OFF by default.** Enable when ready for production.

---

## 1. SAFE_MODE — When & How

### When to Activate
- Firebase cost spike detected (GCP budget alert on Telegram)
- Suspected abuse (unusual AI generation volume)
- System bug causing repeated AI calls
- During emergency maintenance

### How to Activate
**Option A — Ops Dashboard:**
1. Go to `/ops`
2. Click "Enable SAFE_MODE"
3. Confirm in modal

**Option B — Firestore Console (emergency):**
1. Go to Firebase Console → Firestore
2. Navigate to `ops_config/system`
3. Set `SAFE_MODE: true`

**Option C — API (programmatic):**
```bash
curl -X POST /api/ops/safe-mode \
  -H "Content-Type: application/json" \
  -d '{"action": "activate", "reason": "Cost spike detected"}'
```

### What Happens During SAFE_MODE
| Operation | Behavior |
|-----------|----------|
| AI image generation | Returns 503 "System maintenance" |
| AI descriptions | Returns 503 |
| AI translations | Returns 503 |
| Campaign generation | Returns 503 |
| Batch operations | Returns 503 |
| **Menu viewing (public)** | **UNAFFECTED** |
| **Menu publishing** | **UNAFFECTED** |
| **Dashboard login** | **UNAFFECTED** |

### How to Deactivate
1. Fix the root cause first
2. Check Firebase Console — usage back to normal?
3. Go to `/ops` → "Disable SAFE_MODE"
4. Monitor for 30 minutes

### Files
| File | Purpose |
|------|---------|
| `src/lib/ops/safeMode.ts` | Frontend check utility |
| `functions/src/monitoring/safeMode.ts` | Cloud Functions check + activate/deactivate |
| `src/app/api/ops/safe-mode/route.ts` | API route for toggle |
| `src/config/features.ts` | `ENABLE_COST_PROTECTION` flag |

---

## 2. Telegram Alerts — When & How

### Prerequisites (One-Time Setup)
1. Create Telegram bot via @BotFather → get `TELEGRAM_BOT_TOKEN`
2. Create private channel for alerts
3. Add bot to channel → get `TELEGRAM_CHAT_ID`
4. Set Firebase Functions secrets:
   ```bash
   firebase functions:secrets:set TELEGRAM_BOT_TOKEN
   firebase functions:secrets:set TELEGRAM_CHAT_ID
   ```
5. Set `ENABLE_OPS_ALERTS: true` in `src/config/features.ts`

### When Alerts Fire
Alerts fire automatically when `createAlert()` is called anywhere in the system:
- Menu publish verification failure
- Health check failures
- Manual alert creation

### How to Mute (Before Deploys)
**Option A — Ops Dashboard:**
1. Go to `/ops`
2. Click "Mute Alerts 20min"

**Option B — API:**
```bash
curl -X POST /api/ops/mute-alerts \
  -H "Content-Type: application/json" \
  -d '{"durationMinutes": 20}'
```

### Files
| File | Purpose |
|------|---------|
| `functions/src/monitoring/telegramAlert.ts` | Telegram HTTP POST utility |
| `functions/src/monitoring/deployMute.ts` | Mute window logic |
| `functions/src/monitoring/alerts.ts` | Alert framework (wired to Telegram) |
| `src/app/api/ops/mute-alerts/route.ts` | API route for mute |

---

## 3. Menu Health Monitor — When & How

### Prerequisites
1. Set `ENABLE_MENU_HEALTH_MONITOR: true` in `src/config/features.ts`
2. Deploy Cloud Functions: `firebase deploy --only functions`

### How It Works
After every publish, call the `verifyMenuPublish` Cloud Function:
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(firebaseApp, 'us-central1');
const verifyPublish = httpsCallable(functions, 'verifyMenuPublish');

// Call after publish completes
await verifyPublish({
  storeId: 'store123',
  tenantId: 'tenant456',
  publicMenuUrl: 'https://joespizza.menulist.ai/menu',
});
```

### What Gets Checked
1. HTTP 200 — Menu page loads
2. Non-empty body — Content renders (>500 chars)

### What Happens on Failure
1. Store `health` field updated to `FAILED`
2. Alert created in `systemAlerts`
3. Telegram notification sent (if `ENABLE_OPS_ALERTS` is on)

### Store Health Field
After verification, the store document has:
```
store.health = {
  status: "OK" | "WARNING" | "FAILED",
  lastCheckedAt: Timestamp,
  lastPublishAt: Timestamp,
  lastPublishStatus: "OK" | "FAILED",
  lastFailureReason: string | null,
  consecutiveFailures: number
}
```

### Files
| File | Purpose |
|------|---------|
| `functions/src/monitoring/publishVerification.ts` | Verification + health update logic |
| `functions/src/index.ts` | `verifyMenuPublish` callable function |

---

## 4. Ops Dashboard — When & How

### Access
- URL: `/ops`
- Access: Superadmin only (`platformRole === 'PLATFORM'`)
- Not in sidebar — direct URL access only

### Sections
1. **System State** — SAFE_MODE status, alert mute status, last alert
2. **Adoption Pulse** — New stores (24h), active stores (7d)
3. **Integrity Signals** — Stores with no publish in 60 days
4. **Recent Alerts** — Last 5 alerts with severity
5. **Emergency Controls** — SAFE_MODE toggle, alert mute

### When to Use
- Morning check: "Is everything OK?"
- After deploys: Check for new alerts
- During incidents: Toggle SAFE_MODE, check health
- Weekly review: Adoption + integrity signals

### Files
| File | Purpose |
|------|---------|
| `src/app/(main)/ops/page.tsx` | Route page |
| `src/components/templates/main-app/platform/opsControlRoom/index.tsx` | UI component |
| `src/database/ops/index.ts` | DAL (read-only queries) |

---

## 5. Firebase Cost Summary

| System | Monthly Cost (50 stores) | Impact |
|--------|------------------------|--------|
| SAFE_MODE checks | ~₹0.05 | 1 read per AI route call (cached) |
| Telegram delivery | ₹0.00 | Telegram API is free |
| Publish verification | ~₹8 | 1 read + 1 write per publish |
| Ops dashboard | ~₹0.22 | ~8 reads per page load |
| **Total** | **~₹8.27/month** | **Negligible** |

**Cost safety:** All systems are feature-flag gated. If cost is a concern, set flags to `false` for instant disable with zero Firestore reads.

---

## 6. Incident Response Quick Reference

| Severity | What | Do This |
|----------|------|---------|
| **P0** | Menu not loading | Check `/ops` → Force republish → Reset CDN cache |
| **P1** | Images broken | Check Firebase Storage → Re-upload if needed |
| **Cost spike** | Unexpected Firebase bill | Enable SAFE_MODE → Check Sentry → Fix root cause |
| **Deploy issue** | Errors after deploy | Mute alerts → Investigate → Redeploy if needed |

Full protocol: `__docs__/incident-response/README.md`

---

## 7. Shared Firestore Document

All ops features share ONE Firestore document: `ops_config/system`

```
ops_config/system = {
  SAFE_MODE: boolean,
  activatedAt: Timestamp | null,
  activatedBy: string | null,
  reason: string | null,
  deactivatedAt: Timestamp | null,
  alertsMutedUntil: Timestamp | null,
}
```

This document is read by:
- SAFE_MODE check in API routes (1 read per check, feature-flag gated)
- Deploy mute check when alerts fire (1 read per alert)
- Ops dashboard system state section (1 read per page load)

---

## 8. Enabling for Production

### Step 1: Set up Telegram (5 minutes)
1. Create bot via @BotFather
2. Create channel, add bot
3. Set secrets in Firebase Functions

### Step 2: Enable feature flags
```typescript
// src/config/features.ts
ENABLE_COST_PROTECTION: true,    // SAFE_MODE checks
ENABLE_OPS_ALERTS: true,         // Telegram delivery
ENABLE_MENU_HEALTH_MONITOR: true, // Post-publish verification
```

### Step 3: Deploy
```bash
firebase deploy --only functions
```

### Step 4: Set up GCP budget alerts
1. Go to Google Cloud Console → Billing → Budgets
2. Set alerts at ₹500, ₹1000, ₹2000
3. For webhook delivery, route Budget → Pub/Sub → `gcpBudgetAlertWebhook`
4. Configure the Pub/Sub push endpoint with the `GCP_BUDGET_WEBHOOK_SECRET` query parameter or `x-menulist-budget-secret` header. Never leave the budget webhook open without this secret.
5. Add Telegram as notification channel

### Step 5: Verify
1. Go to `/ops` — should load with current data
2. Toggle SAFE_MODE on/off — verify AI routes return 503
3. Trigger a test alert with the webhook secret — verify SAFE_MODE and Telegram notification

---

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | May 14, 2026 | Added budget webhook secret requirement for production-safe alert delivery |
| 1.0 | February 20, 2026 | Initial guide from implementation |
