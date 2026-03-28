# 📄 DOCUMENT 7: OPERATIONAL RUNBOOK

**File Name:** 07-OPERATIONAL-RUNBOOK.md  
**Last Updated:** 2026-01-11  
**Status:** 🔒 LOCKED — Production Ready  
**Audience:** Ops, Support, Engineering On-Call

---

## 1. DAILY OPERATIONS CHECKLIST

### Morning (08:00 Local)

- [ ] Verify CMI nightly run completed (02:30 UTC)
- [ ] Check Sentry for new errors
- [ ] Review Firebase usage dashboard
- [ ] Confirm summary documents updated

### Evening (18:00 Local)

- [ ] Review Today tab activity (skip/complete rates)
- [ ] Check screen uptime
- [ ] Monitor support queue

---

## 2. MONITORING & ALERTS

### Critical Alerts (Page Immediately)

| Alert               | Condition                             | Action                    |
| ------------------- | ------------------------------------- | ------------------------- |
| CMI Failure         | Nightly run did not complete          | Check Cloud Function logs |
| Summary Doc Missing | No `campaigns_{sId}` for active store | Manual trigger CMI        |
| Auth Failure        | Firebase Auth errors spike            | Check Firebase console    |
| Screen Blank        | Zero-blank guarantee violated         | Check fallback stack      |

### Warning Alerts (Review Within 2 Hours)

| Alert          | Condition                      | Action                  |
| -------------- | ------------------------------ | ----------------------- |
| High Skip Rate | >30% skips in 24h              | Review campaign quality |
| Slow API       | p95 > 500ms                    | Check Firestore queries |
| Cost Spike     | Firebase costs > 120% baseline | Audit read patterns     |

### Monitoring Tools

| Tool                 | Purpose                   | Access                      |
| -------------------- | ------------------------- | --------------------------- |
| Sentry               | Error tracking            | sentry.io                   |
| Firebase Console     | Database, Auth, Functions | console.firebase.google.com |
| Vercel Dashboard     | Deployments, logs         | vercel.com                  |
| Google Cloud Console | Gemini usage              | console.cloud.google.com    |

---

## 3. INCIDENT RESPONSE

### Severity Levels

| Level | Definition                               | Response Time |
| ----- | ---------------------------------------- | ------------- |
| P0    | All users affected, core feature down    | 15 minutes    |
| P1    | Many users affected, degraded experience | 1 hour        |
| P2    | Some users affected, workaround exists   | 4 hours       |
| P3    | Minor issue, low impact                  | 24 hours      |

### Incident Response Flow

```
1. Detect (Alert or Report)
   ↓
2. Assess (Determine severity)
   ↓
3. Communicate (Notify stakeholders)
   ↓
4. Mitigate (Apply temporary fix)
   ↓
5. Resolve (Deploy permanent fix)
   ↓
6. Post-Mortem (Document learnings)
```

### Communication Templates

**P0/P1 Alert:**

```
🚨 INCIDENT: [Brief description]
SEVERITY: P[0/1]
IMPACT: [Who is affected]
STATUS: Investigating / Mitigating / Resolved
NEXT UPDATE: [Time]
```

**Resolution:**

```
✅ RESOLVED: [Brief description]
DURATION: [Start - End]
ROOT CAUSE: [One sentence]
FIX: [What was done]
FOLLOW-UP: [Any pending actions]
```

---

## 4. FEATURE FLAG GOVERNANCE

### Current Flags

| Flag                      | Value | Description       |
| ------------------------- | ----- | ----------------- |
| CMI_ENABLED               | true  | Core intelligence |
| DECISION_BLOCKS_ENABLED   | true  | Menu blocks       |
| DIGITAL_SCREENS_ENABLED   | true  | Public screens    |
| PHYSICAL_SURFACES_ENABLED | true  | Print surfaces    |
| STAFF_PROMPT_ENABLED      | true  | Speech control    |
| SOCIAL_CONTENT_ENABLED    | true  | Today surface     |
| DIRECT_POSTING_ENABLED    | false | Future capability |
| OUTCOME_FRAMING_ENABLED   | false | Future capability |

### Flag Change Procedure

1. **Request:** Raise ticket with justification
2. **Review:** Engineering lead approval
3. **Test:** Verify in staging
4. **Deploy:** Update config
5. **Monitor:** 24h observation
6. **Document:** Update this runbook

### Emergency Flag Toggle

```typescript
// config/features.ts
export const FEATURE_FLAGS = {
  STAFF_PROMPT_ENABLED: false, // EMERGENCY DISABLE
};
```

---

## 5. SUPPORT SCRIPTS

### Script 1: Check Store Status

```bash
# Get store summary status
firebase firestore:read \
  --collection="platformSummary" \
  --document="campaigns_${STORE_ID}"
```

### Script 2: Trigger Manual CMI Run

```bash
# Only if nightly failed
firebase functions:call cmiNightlyRun \
  --data='{"storeId":"${STORE_ID}"}'
```

### Script 3: Clear Screen Cache

```bash
# Force screen refresh
curl -X POST "https://api.menulist.ai/screens/${SCREEN_TOKEN}/invalidate"
```

### Script 4: Export Campaign History

```bash
# For debugging
firebase firestore:export \
  --collection="campaigns/${TENANT_ID}/${STORE_ID}" \
  --output="./export_${DATE}.json"
```

---

## 6. SUPPORT RESPONSE TEMPLATES

### "Why am I seeing this item?"

```
MenuList observes what your customers like and surfaces
items that are working well. If you're seeing something,
it means it's performing.

You can skip if you prefer, but we recommend following
what MenuList suggests.
```

### "Why is there nothing today?"

```
If there's nothing in your Today tab, it means there's
nothing urgent to promote right now. That's okay!

MenuList only shows actions when they matter.
Check back tomorrow.
```

### "How do I change what's shown?"

```
MenuList decides what to show based on customer behavior.
You can't manually change it, but you can skip any
suggestion you don't want to use.

The system will learn and adjust over time.
```

### "Can I see the data behind this?"

```
MenuList doesn't expose raw data to keep things simple.
Just follow what the Today tab shows — it's based on
real customer behavior.
```

---

## 7. BACKUP & DISASTER RECOVERY

### Backup Schedule

| Data          | Frequency | Retention  |
| ------------- | --------- | ---------- |
| Firestore     | Daily     | 30 days    |
| Cloud Storage | Daily     | 90 days    |
| Config        | On change | Indefinite |

### Recovery Procedure

**Firestore Recovery:**

```bash
# Restore from backup
gcloud firestore import gs://backup-bucket/[TIMESTAMP]
```

**Application Rollback:**

```bash
# Revert to previous deployment
vercel rollback
```

### RTO/RPO Targets

| Metric                         | Target   |
| ------------------------------ | -------- |
| Recovery Time Objective (RTO)  | 4 hours  |
| Recovery Point Objective (RPO) | 24 hours |

---

## 8. COST MANAGEMENT

### Budget Thresholds

| Component | Monthly Budget | Alert At   |
| --------- | -------------- | ---------- |
| Firebase  | $500           | $400 (80%) |
| Vercel    | $100           | $80 (80%)  |
| Gemini    | $200           | $160 (80%) |
| Total     | $800           | $640 (80%) |

### Cost Reduction Actions

| Trigger              | Action                    |
| -------------------- | ------------------------- |
| Firebase reads spike | Check for N+1 queries     |
| Gemini costs spike   | Audit AI generation calls |
| Storage costs rise   | Prune old exports         |

### Cost Monitoring

- Firebase Console → Usage tab
- Vercel Dashboard → Usage
- Google Cloud Console → Billing

---

## 9. ANTI-PATTERNS (DO NOT DO)

| Anti-Pattern           | Why It's Wrong         | Correct Approach      |
| ---------------------- | ---------------------- | --------------------- |
| Explain logic to users | Invites debate         | Use authority scripts |
| Override confidence    | Breaks trust           | Let system decide     |
| Add manual controls    | Creates support burden | Maintain silence      |
| Expose analytics       | Undermines authority   | Hide all metrics      |
| Rush feature flags     | Causes incidents       | Follow governance     |
| Skip post-mortems      | Miss learnings         | Always document       |

---

## 10. ESCALATION MATRIX

| Issue Type        | First Contact    | Escalation             |
| ----------------- | ---------------- | ---------------------- |
| Technical (P0/P1) | On-call Engineer | Engineering Lead → CTO |
| Technical (P2/P3) | Support Queue    | Engineering Triage     |
| Business/Legal    | CEO              | Legal Counsel          |
| Security          | Security Lead    | CEO + CTO              |
| Cost Overrun      | Ops Lead         | Finance → CEO          |

---

## 11. RUNBOOK MAINTENANCE

| Task                | Frequency | Owner            |
| ------------------- | --------- | ---------------- |
| Review alerts       | Weekly    | Ops Lead         |
| Update scripts      | As needed | Engineering      |
| Test backups        | Monthly   | Ops Lead         |
| Cost review         | Monthly   | Finance + Ops    |
| Full runbook review | Quarterly | Engineering Lead |

---

## Cross-References

- Implementation → [DOC4-IMPLEMENTATION-BLUEPRINT]
- Verification → [DOC5-PRODUCTION-VERIFICATION]
- Architecture → [DOC3-ARCHITECTURE-BLUEPRINT]

---

_Document Status: ✅ COMPLETE_
