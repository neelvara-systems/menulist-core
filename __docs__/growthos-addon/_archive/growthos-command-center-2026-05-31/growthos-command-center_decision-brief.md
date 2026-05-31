# GrowthOS Command Center - Decision Brief

**Status:** Separate GrowthOS still requires founder decision. MenuList Today wedge implemented but paused behind a disabled flag.  
**Created:** May 31, 2026

---

## Decision Needed

Should GrowthOS Command Center become an active implementation target now, or remain a deferred product plan while MenuList continues toward system-of-record dominance?

## Recommended Decision

Do not implement a separate GrowthOS app now.

Use this doc set to preserve the architecture, and mine the strongest ideas into existing MenuList Social Content/Today work only if they do not blur product identity.

May 31 implementation decision: add only `ENABLE_TODAY_WEEKLY_GROWTH_PACK` inside MenuList Today. It is deterministic, client-side, export/copy only, and disabled by default.

May 31 owner-value review: do not freeze or roll it out now. The feature is technically safe but owner usability and need are not proven. It should come back only as a small pilot if owners show real pull.

## Why

| Evidence | Meaning |
| --- | --- |
| GrowthOS is documented as deferred and not active development (`__docs__/growth-execution-strategy/README.md:7`). | A separate app needs explicit unlock. |
| GrowthOS prerequisites include MenuList stability, Control Layer daily use, primary menu-link adoption, retention, and founder unlock (`__docs__/growth-execution-strategy/README.md:34`). | The pasted conversation does not prove these gates. |
| Product Evolution Doctrine forbids building GrowthOS before MenuList is system-of-record (`__docs__/constitution/11-product-evolution-doctrine.md:48`). | Starting code now would violate locked doctrine. |
| Social Content already implements GrowthOS v0 (`__docs__/strategy/product-universe-ssot.md:221`). | The fastest proof path is inside current capability, not a new app. |
| KitStamp is Stage 3 content preparation and Final Content Kit export (`__docs__/kitstamp/README.md:3`, `__docs__/kitstamp/README.md:728`). | The paused weekly pack should not be shifted into KitStamp. |
| Product Separation Doctrine forbids GrowthOS writes to MenuList (`__docs__/constitution/12-product-separation-doctrine.md:80`). | The proposed action loop needs a write-boundary decision first. |

## Decision Options

| Option | What it means | Pros | Risks | Recommendation |
| --- | --- | --- | --- | --- |
| A - Preserve only | Keep docs, no product work. | Protects MenuList focus. | GrowthOS momentum waits. | Recommended default. |
| B - Strengthen Social Content | Add only docs/plans for `GrowthAction`-like structure inside existing Today/Social Content after a narrow spec. | Reuses current engine. Low routing overhead. | Must avoid making MenuList feel like marketing software. | Possible after narrow spec. |
| C - Build separate GrowthOS shell | Create product route, flags, app surface, and read-only action queue. | Clean product identity. | Violates timing gates unless founder unlocks Stage 2. More routing and support complexity. | Not recommended now. |
| D - Change doctrine | Amend GrowthOS to write back to MenuList after approval. | Enables full loop. | Major architecture change and trust risk. | Only with explicit founder override. |

## Today Wedge Pause Gate

The Today Weekly Growth Pack can be reconsidered only when all are true:

| Gate | Required evidence |
| --- | --- |
| Owner comprehension | A non-technical owner understands the pack without explanation. |
| Owner action | Owners copy/share at least one output during a real session. |
| Product hierarchy | The pack stays secondary to Today business-truth readiness. |
| Mobile fit | Mobile shows a compact optional action, not a long default card. |
| Critical-first behavior | Hours, public link, inactive items, and stale truth outrank growth copy. |

## Stage 2 Unlock Checklist

Implementation should not start until all are true:

| Gate | Required evidence | Current status |
| --- | --- | --- |
| MenuList stability | Real SMB usage and low support burden. | Not proven by this conversation. |
| System-of-record proof | Owners use MenuList as primary public truth source. | Not proven by this conversation. |
| Existing Social Content insufficiency | Current Today/Social Content cannot prove the same loop. | Not proven; current code already covers large parts. |
| Product identity decision | Founder approves GrowthOS as active product line. | Pending. |
| Write-boundary decision | Founder decides whether GrowthOS can create MenuList truth-change drafts. | Pending. |
| Routing/domain decision | GrowthOS target domain, stage matrix, and product id are defined. | Pending. |
| Cost model | Reads/writes/provider usage fit paid plan. | Drafted in Firebase doc, not validated in production. |

## If Founder Says "Build It Anyway"

Use the smallest safe build:

1. Separate GrowthOS app route behind a disabled flag.
2. Read-only MenuList truth inputs.
3. On-demand Freshness Check that creates `GrowthAction` drafts.
4. Weekly Growth Pack generation with export/copy only.
5. No direct external posting.
6. No MenuList truth writes.
7. No scheduler until on-demand usage proves value.

## Cost Impact

No runtime Firebase cost change. The implemented Today wedge adds no reads, writes, functions, schedulers, provider calls, or external posting.
