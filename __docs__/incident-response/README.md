# Incident Response Protocol

**Status:** 📝 DOCUMENTED — Active protocol  
**Priority:** 🟡 P2 — Reference document for when incidents occur  
**Created:** February 20, 2026  
**Source:** ChatGPT launch infra review → Cascade critical review  
**Governance:** Constitution §13 — Operational Infrastructure Doctrine

---

## Purpose

When a system failure occurs and an alert fires, this document defines **exactly what to do** — step by step. No thinking required during an incident.

---

## Severity Levels

| Level  | Description                  | Response Time | Example                                                                |
| ------ | ---------------------------- | ------------- | ---------------------------------------------------------------------- |
| **P0** | Public truth delivery broken | <15 min       | Menu not loading, OBP down, publish not reflecting for multiple stores |
| **P1** | Degraded but functional      | <1 hour       | Images broken, cache delay, one store specific issue                   |
| **P2** | Cosmetic/internal            | Same day      | Minor formatting glitch, non-critical schema warning                   |

---

## P0 Incident Response (Menu Down / Publish Broken)

### Step 1 — Confirm (2 minutes)

1. Open the public menu URL from the alert
2. Check: Does it load? Is it blank? Is it showing old data?
3. Check Sentry for error spike
4. Check Firebase Console for quota/permission errors

**If false alarm:** Acknowledge alert. Done.

### Step 2 — Contain (5-10 minutes)

**Goal: Restore customer-facing service FIRST. Do NOT debug yet.**

| Action               | When to Use            | How                                                                                           |
| -------------------- | ---------------------- | --------------------------------------------------------------------------------------------- |
| **Force republish**  | Canonical menu truth is correct but public output is stale | Use the platform Ops recovery action. It marks current active project scope, requires `/api/revalidate/menu` acknowledgement, touches an initialized Digital Screen version, then verifies the canonical public URL. |
| **Owner republish**  | The project data/design itself must change | Open the owner editor, review current truth, and publish the intended change. Do not use incident recovery to overwrite data. |
| **Check Firestore**  | Data missing/corrupt   | Firebase Console → verify project doc exists                                                  |
| **Enable SAFE_MODE** | Cost spike / abuse     | Ops dashboard → Enable SAFE_MODE (or Firestore Console: `ops_config/system.SAFE_MODE = true`) |

### Step 3 — Verify Recovery (2 minutes)

1. Load the public menu URL again
2. Confirm it shows correct, current data
3. Check 1-2 other stores to confirm not systemic

### Step 4 — Root Cause (Later, when calm)

After service is stable:

1. **What failed?** Check Sentry errors, Cloud Function logs, Firebase Console
2. **Why did it fail?** Code bug? Infrastructure issue? Abuse? Config error?
3. **Could monitoring detect earlier?** If not, add detection
4. **Is this reproducible?** Test in dev environment
5. **Is this systemic or isolated?** Check if other stores affected

### Step 5 — Document (5 minutes)

Log in incident record:

```
Date:
Store(s) affected:
Failure type:
Detection time:
Resolution time:
Root cause:
Fix applied:
Prevention added:
```

---

## P1 Incident Response (Degraded Service)

### Step 1 — Assess Impact

- How many stores affected?
- Is the issue getting worse or stable?
- Are customers seeing the degradation?

### Step 2 — Fix or Workaround

| Issue                       | Quick Fix                                                              |
| --------------------------- | ---------------------------------------------------------------------- |
| Images broken for one store | Check Firebase Storage, re-upload if needed                            |
| Cache serving old data      | Trigger cache invalidation via `revalidateTag()`                       |
| One store's publish stuck   | Check `menuImageProcessingJobs` for stuck job, manually update status  |
| Slow menu loads             | Check Vercel function logs, likely cold start or Firestore query issue |

### Step 3 — Monitor

Watch for 30 minutes to confirm issue doesn't escalate to P0.

---

## P2 Incident Response (Cosmetic/Internal)

Log the issue. Fix during normal work hours. No urgency.

---

## Emergency Contacts & Tools

| Tool                 | Purpose                                     | Access                      |
| -------------------- | ------------------------------------------- | --------------------------- |
| **Firebase Console** | Firestore data, Cloud Function logs, usage  | console.firebase.google.com |
| **Sentry**           | Error tracking, stack traces                | sentry.io                   |
| **Vercel Dashboard** | Deployment status, function logs, analytics | vercel.com                  |
| **Telegram**         | Alert notifications                         | Mobile app                  |
| **Ops Dashboard**    | System state, SAFE_MODE toggle              | `/ops` (✅ built)           |

---

## Recovery Tools

| Tool             | What It Does                     | Location                            |
| ---------------- | -------------------------------- | ----------------------------------- |
| Force Republish  | Refresh already-correct public output, touch initialized screen version, then verify the canonical public URL; fails closed if cache refresh is not acknowledged | Ops dashboard → selected store |
| Cache Reset      | Internal implementation detail of the guarded recovery/cache routes; do not redeploy Vercel merely to clear one store | `/api/revalidate/menu` / server revalidation helpers |
| SAFE_MODE Toggle | Disable expensive operations     | Ops dashboard or Firestore Console  |
| Alert Mute       | Suppress alerts during deploy    | Ops dashboard                       |

---

## Key Principles (from Constitution §13)

1. **Restore first, debug later** — Get service working, THEN investigate
2. **Alert on patterns, not instances** — Don't panic over single errors
3. **Stale but visible > broken** — Old cached menu is better than blank page
4. **Manual fix is fast** — One-click republish, one-click cache reset
5. **Document every incident** — Each incident makes the system stronger

---

## Incident History Log

| Date | Severity | Issue            | Detection | Resolution | Root Cause | Prevention |
| ---- | -------- | ---------------- | --------- | ---------- | ---------- | ---------- |
| —    | —        | No incidents yet | —         | —          | —          | —          |

_Update this table after each real incident._

---

**Version History:**

| Version | Date              | Changes                              |
| ------- | ----------------- | ------------------------------------ |
| 1.0     | February 20, 2026 | Initial protocol from ChatGPT review |
