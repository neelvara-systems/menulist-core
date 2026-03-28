# MenuList vs Industry Gaps — Alignment Analysis

**Version:** 2.0 | **Date:** February 22, 2026  
**Companion:** `analysis.md`, `next-build-phases.md`

---

## 1. What MenuList ALREADY Solves

| Industry Problem                  | MenuList Solution                           | Status         |
| --------------------------------- | ------------------------------------------- | -------------- |
| No canonical source of truth      | Single Firestore → all surfaces             | ✅ Built       |
| Multi-platform menu inconsistency | Update once → OBP, QR, screens, Google      | ✅ Built       |
| Google/Maps decay                 | GBP Sync (drift detection)                  | ✅ Infra ready |
| Outdated QR/PDF                   | Dynamic QR + Menu Kit                       | ✅ Built       |
| Price integrity                   | MCE + Pricing Integrity Engine              | ✅ Built       |
| Hours accuracy                    | Working hours + special hours + open/closed | ✅ Built       |
| Temporary closure                 | Temp Status Layer + auto-expiry             | ✅ Built       |
| Staff wrong versions              | Single official link (OBP)                  | ✅ Built       |
| Multi-language                    | next-intl integration                       | ✅ Built       |
| Schema for search                 | JSON-LD + llms.txt                          | ✅ Built       |
| Physical dependency               | QR, screens, Menu Kit                       | ✅ Built       |
| Chain governance                  | Master → outlet hierarchy                   | ✅ Built       |

**MenuList solves ~70% of top 10 industry problems.**

---

## 2. Gaps & Doctrine Check

### Doctrine-Eligible (Feature Gate 5/5 PASS) — ALL SHIPPED

| Gap                        | Gate Score | 5-Filter Score | Verdict                       |
| -------------------------- | ---------- | -------------- | ----------------------------- |
| Search/indexing dominance  | 5/5        | 23/25          | ✅ **SHIPPED** (Feb 22, 2026) |
| Real-time status expansion | 5/5        | 23/25          | ✅ **SHIPPED** (Feb 22, 2026) |

### Previously Deferred → Now Shipped (Infrastructure Ready)

| Gap                 | Gate Score | 5-Filter Score | Verdict                                 |
| ------------------- | ---------- | -------------- | --------------------------------------- |
| Platform pull model | 4.5/5      | 19/25          | ✅ **SHIPPED** (flag OFF, Feb 22, 2026) |

### Permanently Rejected

| Gap                    | Rejection Reason       | Doctrine Ref        |
| ---------------------- | ---------------------- | ------------------- |
| Delivery platform sync | Transactional layer    | Doc 11 Rule 2       |
| POS/inventory sync     | Internal operations    | Doc 08 pre-rejected |
| Analytics dashboards   | Dashboard culture      | Doc 08 pre-rejected |
| Marketing/growth tools | Wrong identity         | Doc 11 Rule 2       |
| Review expansion       | Reputation SaaS drift  | Doc 08              |
| Website builder        | Infinite customization | Doc 01 Law 6        |
| CRM/loyalty            | Wrong category         | Doc 08 pre-rejected |

---

## 3. The Strategic Paradox (Validated)

> To become essential infrastructure, MenuList must solve fewer problems than customers request. Over-solving increases usage but decreases inevitability.

---

## 4. Cascade Independent Web Validation

1. **Menu inflation accelerating:** CPI food-away-from-home +3.8% YoY (BLS/Restroworks). 82% Americans notice price climbs (YouGov). More frequent updates = more sync burden.
2. **Google menu control fragile:** Orama Digital (2025) — Google scrapes from Yelp/DoorDash. Owners who don't manage GBP lose control.
3. **QR backlash nuanced:** Static PDF QR = rejected. Dynamic QR = accepted. MenuList on right side.
4. **NRAI vs Zomato/Swiggy:** Legal action for monopolistic practices (TOI 2025). Validates aggregator dependency is dangerous.
5. **Toast 2025 data:** 24% FSR operators rank inflation as #1 pain. 51% plan to raise menu prices. Price change frequency increasing.
