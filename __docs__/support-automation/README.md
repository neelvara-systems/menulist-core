# Support Automation

**Status:** 📝 DEFERRED — Assessment only, no implementation planned  
**Priority:** ⬜ DEFERRED — Not needed at <50 stores  
**Created:** February 20, 2026  
**Source:** ChatGPT launch infra review → Cascade critical review

---

## One-Liner

Automated WhatsApp-based support system with structured decision trees, pre-written responses, and keyword-based escalation.

## Why DEFERRED

At <50 stores with a solo founder:
- Support volume will be 5-10 messages/day at most
- Manual WhatsApp responses with pre-written templates are sufficient
- Building WhatsApp Business API automation is a separate product/ops project, not infrastructure
- Support automation only works if the underlying product is clear (Constitution §13, Law 6)

**Build when:** Support volume exceeds 30+ messages/day consistently, OR repeated patterns justify automation.

---

## ChatGPT Proposals — Cascade Assessment

| Proposal | Decision | Reason |
|----------|----------|--------|
| WhatsApp Business API automation (Wati/Interakt/Zoko) | **DEFER** | ₹2,000-5,000/month for tools that handle 5-10 msgs/day is poor ROI |
| Decision tree auto-reply | **DEFER** | Good concept but needs product stability first |
| Video response library (10 videos) | **ACCEPT as content task** | Useful but not code/architecture — just screen recordings |
| Keyword escalation triggers | **DEFER** | Manual reading of 5-10 msgs/day doesn't need keyword detection |
| Menu status engine for support | **PARTIAL — already covered** | Menu health monitor provides this visibility |
| Weekly auto-report | **DEFER** | At <50 stores, manual weekly review is sufficient |

---

## Current Manual Approach (Sufficient for Launch)

### Support Channel
- One WhatsApp Business number (not personal)
- Response time: <1 hour during business hours

### Pre-Written Response Templates (Prepare These)

**Template 1: Edit Menu**
```
To edit your menu:
1. Open dashboard
2. Edit items
3. Click publish
Customer menus can take up to 60 seconds to refresh.
```

**Template 2: Change Price**
```
Dashboard → edit item → change price → save.
If the screen shows Publish, click Publish. Customer menus can take up to 60 seconds to refresh.
```

**Template 3: Menu Not Updating**
```
Please click "Publish" once in the dashboard.
If issue persists, send your store name and I'll check.
```

**Template 4: Share Link**
```
Your menu link works everywhere:
• Instagram bio
• Google Business
• WhatsApp status
• QR code (print from dashboard)
This opens the owner-published menu. Customer menus can take up to 60 seconds to refresh after changes.
```

**Template 5: How to Add Image**
```
In the editor, click any item → upload photo → save → publish.
```

### Escalation Rule
If owner says "not working" or "broken" → check store health immediately.

---

## When to Revisit

Triggers for building automation:
1. Support volume >30 msgs/day for 2+ weeks
2. Same question appears >10 times (indicates UX problem to fix first)
3. Hiring support staff (automation reduces training)
4. WhatsApp Business API becomes cheaper or required

---

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | February 20, 2026 | Initial assessment (DEFERRED) |
