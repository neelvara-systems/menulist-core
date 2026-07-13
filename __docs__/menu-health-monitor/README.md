# Menu Health Monitor

**Status:** ✅ IMPLEMENTED — Feature flag OFF by default  
**Feature Flag:** `ENABLE_MENU_HEALTH_MONITOR: false`  
**Priority:** 🔴 P0 — Build before launch  
**Created:** February 20, 2026  
**Source:** ChatGPT launch infra review → Cascade critical review

---

## Quick Navigation

| Document                                                                         | Audience     | Purpose                                     |
| -------------------------------------------------------------------------------- | ------------ | ------------------------------------------- |
| [menu-health-monitor_spec.md](./menu-health-monitor_spec.md)                     | CEO/PM       | What it does, why it matters                |
| [menu-health-monitor_impl.md](./menu-health-monitor_impl.md)                     | Developers   | Technical blueprint, schema, file structure |
| [menu-health-monitor_firebase.md](./menu-health-monitor_firebase.md)             | Cost Control | Firebase reads/writes/cost estimates        |
| [menu-health-monitor_mobile-support.md](./menu-health-monitor_mobile-support.md) | Mobile       | Admission test (DESKTOP ONLY)               |

---

## One-Liner

Automatically verifies that published menus are actually loading correctly, and detects silent failures before customers or owners notice.

## Architecture Overview (60-second summary)

```
Owner clicks Publish
  → Existing publish pipeline runs
  → NEW: Post-publish verification Cloud Function triggers
    → Fetches public menu URL
    → Checks HTTP 200, non-empty response, images accessible
    → Updates store.health field
    → If FAILED → triggers alert (via ops-alerting-delivery)
```

No new collections. Each admitted publish uses six canonical user/tenant/store reads and one existing-store health write; failures also use the existing alert cooldown/read and alert write.

## Key Files

| File                                              | Purpose                         |
| ------------------------------------------------- | ------------------------------- |
| `functions/src/monitoring/publishVerification.ts` | Post-publish health check logic |
| `functions/src/index.ts` → `verifyMenuPublish`    | Callable Cloud Function trigger |
| Store document `health` field                     | Per-store health status         |

## Feature Flag

```typescript
ENABLE_MENU_HEALTH_MONITOR: false; // in src/config/features.ts
```

## Dependencies

- **Ops Alerting Delivery** — For sending Telegram alerts on failure
- **Existing publish pipeline** — Hook runs after publish completes

---

**Version History:**

| Version | Date              | Changes                                   |
| ------- | ----------------- | ----------------------------------------- |
| 1.0     | February 20, 2026 | Initial documentation from ChatGPT review |
