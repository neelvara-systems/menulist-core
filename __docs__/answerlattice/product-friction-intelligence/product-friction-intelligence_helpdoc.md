# Product Friction Intelligence — Help Documentation

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Audience:** Answerlattice customers (SaaS founders)

---

## What is Product Friction Intelligence?

Product Friction Intelligence automatically identifies which areas of your product are causing confusion for your users. It works by analyzing your support conversations — questions, escalations, and feedback — and converting them into a prioritized list of product friction areas.

You don't need to set anything up. If you're already using Answerlattice for support, friction intelligence works automatically.

---

## Where to find it

1. Open your Answerlattice dashboard
2. Navigate to **Governance Hub**
3. Click the **Friction** tab

---

## What you'll see

### Friction Health Badge
A simple indicator showing your overall friction level:
- **LOW** (green) — Your product friction is minimal
- **MODERATE** (yellow) — Some areas need attention
- **HIGH** (red) — Multiple product areas are causing significant confusion

### Top Friction Areas
A ranked list of product entities (features, workflows, integrations) causing the most support friction. Each entry shows:
- **Entity name** — The product area (e.g., "Stripe Integration Setup")
- **Entity type** — Feature, workflow, integration, or error
- **Signal count** — How many support questions this area generated in the last 7 days
- **Escalation rate** — What percentage of questions required human escalation
- **Trend** — Whether friction is rising (↑), stable (→), or improving (↓)

### Emerging Topics
New friction areas that appeared in the last 7 days. These are flagged early so you can investigate before they become major issues.

### Weekly Summary
An AI-generated summary of the week's friction patterns, including what changed and suggested next steps.

---

## How it works

1. **Every support interaction creates a signal.** When a user asks a question, gives negative feedback, or escalates to a human agent, Answerlattice records a friction signal tied to the relevant product entity.

2. **Every night, signals are aggregated.** Answerlattice calculates friction scores per entity — factoring in query volume, escalation rate, and answer confidence.

3. **Every week, an insight report is generated.** An AI summary highlights the top friction areas, emerging patterns, and trends.

---

## How to use the insights

### Reduce friction for top entities
If "Stripe Integration Setup" is your #1 friction area:
- Review the documentation for that feature
- Check if the UI labels are clear
- Consider adding a setup wizard or guided workflow
- Update your Answerlattice canonical answer for that entity

### Investigate emerging topics
If a new topic appears in the Emerging section:
- Look at the recent support conversations for that entity
- Determine if it's caused by a product change, documentation gap, or bug
- Create or update the canonical answer

### Track improvement
After making changes, check the trend arrow over the following weeks. If friction is decreasing (↓), your changes are working.

---

## Frequently Asked Questions

**Q: Do I need to tag tickets or conversations manually?**
No. Friction intelligence works automatically from your existing support data. Answerlattice's entity graph handles the mapping.

**Q: How often is the data updated?**
The friction list updates every night. The AI summary updates every week (on Sundays).

**Q: What if I don't see any data?**
You need at least 5 support signals in a week for insights to appear. If your support volume is very low, data may not populate immediately.

**Q: Can I see historical trends beyond 7 days?**
The current view shows a 7-day comparison. Historical data is retained for 90 days internally, but the dashboard shows the most recent snapshot.

**Q: Does this track user behavior in my product?**
No. Friction intelligence works exclusively from support signals — questions, escalations, and feedback. It does not use product analytics, session replay, or user telemetry.
