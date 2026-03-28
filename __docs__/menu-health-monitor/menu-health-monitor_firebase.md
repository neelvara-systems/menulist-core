# Menu Health Monitor — Firebase Cost Analysis

**Created:** February 20, 2026

---

## Cost Model

### Per Publish (healthy)

| Operation                                | Count            | Cost        |
| ---------------------------------------- | ---------------- | ----------- |
| Read store doc (for consecutiveFailures) | 1                | ~₹0.003     |
| Update store.health field                | 1 write          | ~₹0.002     |
| HTTP fetch to public URL                 | 0 Firestore cost | ₹0          |
| **Total per healthy publish**            |                  | **~₹0.005** |

### Per Publish (failure detected)

| Operation                    | Count   | Cost       |
| ---------------------------- | ------- | ---------- |
| Read store doc               | 1       | ~₹0.003    |
| Update store.health field    | 1 write | ~₹0.002    |
| Check alert cooldown         | 1 read  | ~₹0.003    |
| Create alert doc             | 1 write | ~₹0.002    |
| **Total per failed publish** |         | **~₹0.01** |

### Monthly Estimates

| Scenario                     | Publishes/day | Monthly Cost |
| ---------------------------- | ------------- | ------------ |
| 20 stores × 2 publishes/day  | 40/day        | ~₹6/month    |
| 50 stores × 3 publishes/day  | 150/day       | ~₹22/month   |
| 200 stores × 3 publishes/day | 600/day       | ~₹90/month   |

**Verdict:** Negligible cost. No concern.

---

## Collections Affected

| Collection                | Operation             | Frequency     |
| ------------------------- | --------------------- | ------------- |
| `stores/{storeId}`        | Update `health` field | Every publish |
| `systemAlerts` (existing) | Write on failure only | Rare          |

**No new collections created.**

---

## Cloud Function Cost

| Function            | Trigger           | Memory | Est. Invocations/day           |
| ------------------- | ----------------- | ------ | ------------------------------ |
| `verifyMenuPublish` | onCall (callable) | 256MiB | 40-600 (matches publish count) |

Each invocation: ~2-5 seconds (HTTP fetch + Firestore update).  
Monthly Cloud Function cost at 50 stores: ~₹5-10/month.

---

## Cost Safety

- Feature flag: `ENABLE_MENU_HEALTH_MONITOR` — instant disable
- No recursive triggers (writes to store doc, not project doc)
- HTTP fetch has 15s timeout — prevents hanging invocations
- Alert cooldown prevents repeated writes for same failure
