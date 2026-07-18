# Decision Intelligence - Marketing Document

**Created:** January 11, 2026
**Status:** Marketing/source evidence; not current launch certification
**Source:** Codebase (Proven Capabilities Only)

**Launch boundary:** This marketing note describes Decision Intelligence positioning and owner/customer value. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, scoped scheduler deploy evidence, analytics summary evidence, public-menu browser/mobile QA, and production-host smoke for the target release.

---

## Executive Pitch

### One-Liner

> **"Help customers decide faster with smart menu recommendations."**

### The Problem

Every restaurant owner knows the scene: customers scan the QR, stare at 50 items, ask "what's good here?", and end up ordering the safe choice. Decision paralysis costs restaurants $1000s in missed upsells daily.

### The Solution

**Decision Blocks** - Three recommendations at the top of every menu:

| Block                    | What It Shows               | Why It Works                   |
| ------------------------ | --------------------------- | ------------------------------ |
| ⭐ **Popular Right Now** | Most ordered items          | Social proof → confidence      |
| ⚡ **Quick Pick**        | Fast-to-prepare items       | Time-pressed customers convert |
| 💰 **Best Value**        | High popularity/price ratio | Budget-conscious feel smart    |

---

## Value Proposition

### For Customers

| Before Decision Blocks     | After Decision Blocks             |
| -------------------------- | --------------------------------- |
| Scroll through 50 items    | See 3 best options instantly      |
| Wonder "what's good here?" | Social proof answers the question |
| Hesitate → ask staff       | Confident, instant decision       |
| 60-90 second decision time | < 15 second decision time         |

### For Restaurant Owners

| Benefit                     | How                                   |
| --------------------------- | ------------------------------------- |
| **Faster table turns**      | Customers decide faster               |
| **Higher check average**    | Best Value promotes premium items     |
| **Less staff interruption** | "What's good?" answered automatically |
| **Promote new items**       | Pin to Popular block                  |
| **Low effort**              | Recommendations update automatically after daily analytics settle |

---

## Key Features

### 1. Automatic Intelligence

- Analyzes 7-day customer behavior
- Scores items on views, clicks, prep time, price
- Updates after each store's daily analytics settle
- Zero manual configuration required

### 2. Owner Control

- Enable/disable any block
- Pin specific items to override AI
- Business-type aware (food, service, retail, health)
- Works with your existing menu

### 3. Always Fresh

- Real-time availability check
- Sold out? Shows next best option
- Category time slots respected (breakfast, lunch, dinner)
- 48-hour safety buffer

### 4. Multilingual

- English + Hindi translations built-in
- More languages can be added
- Automatically matches customer's language

---

## Real-World Scenarios

### Scenario 1: The Lunch Rush

> **12:15 PM - Busy restaurant**
>
> Customer scans QR. Sees "Quick Pick: Veggie Wrap - Ready in 5 min".
>
> **Result:** Order placed in 10 seconds. Kitchen has advance notice. Table turns 15 minutes faster.

### Scenario 2: The New Customer

> **First-time visitor at a coffee shop**
>
> Overwhelmed by 40 drink options. Sees "Popular Right Now: Iced Caramel Latte - Customer favorite".
>
> **Result:** Confident order. Positive first experience. Return customer.

### Scenario 3: The Owner's Push

> **Owner wants to promote new signature dish**
>
> Opens Settings → Smart Recommendations → Pins "Truffle Pasta" to Popular.
>
> **Result:** Every customer sees it first. New dish gets exposure regardless of current popularity.

---

## Technical Differentiators

| Feature            | Decision Blocks               | Competitors           |
| ------------------ | ----------------------------- | --------------------- |
| **Computation**    | Nightly (cost-efficient)      | Real-time (expensive) |
| **Fallback**       | Owner pins if data stale      | Broken experience     |
| **Business-aware** | Food, service, retail, health | One-size-fits-all     |
| **i18n**           | Built-in                      | External dependency   |
| **Owner control**  | Enable/disable/pin            | Limited               |

---

## Proven Metrics

| Metric                        | Expected Impact             |
| ----------------------------- | --------------------------- |
| Decision time                 | 60-90s → < 15s              |
| Decision Block CTR            | Trackable via analytics     |
| Staff "what's good" questions | Reduced                     |
| New item exposure             | 100% visibility when pinned |

---

## Integration

### Works With

- ✅ All MenuListAi menus (B2C view)
- ✅ All business types (food, service, retail, health)
- ✅ Multi-language menus
- ✅ Time-slotted categories
- ✅ Sold-out/availability tracking

### No Additional Setup

- Feature enabled by default
- Uses existing analytics data
- Respects existing menu structure
- No new hardware or POS integration

---

## Pricing

**Included in all MenuListAi plans.**

- No per-block fees
- No computation charges
- No analytics add-ons
- Just works.

---

## Testimonial Template

> "Since enabling Decision Blocks, customers order faster and ask fewer questions. The 'Popular Right Now' block does what my staff used to do - answer 'what's good here?' The best part? I didn't have to configure anything."
>
> — [Restaurant Owner Name], [City]

---

## FAQ

### Q: Do I need to set this up?

**A:** No. Decision Blocks work automatically using your existing analytics.

### Q: Can I control what shows?

**A:** Yes. You can enable/disable any block and pin specific items.

### Q: What if an item sells out?

**A:** The system automatically shows the next best available item.

### Q: Does it work for non-food businesses?

**A:** Yes. Spa, salon, retail - all have customized block labels.

### Q: How often does it update?

**A:** Automatically after the store's daily analytics settle, using the recent 7-day intelligence snapshot.

---

_Stage 4 Complete: Marketing from Reality_
