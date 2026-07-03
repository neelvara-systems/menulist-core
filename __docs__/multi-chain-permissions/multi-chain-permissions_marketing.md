# Multi-Chain Permissions — Sales & Marketing Copy

**Feature:** #4B — Multi-Chain Permissions  
**Status:** Marketing evidence; not current launch certification
**Last Updated:** May 19, 2026

> **May 19, 2026 review:** The sales positioning remains accurate after server-owned policy writes, active-store claim refresh, and server-side linked outlet save enforcement were verified. The correct claim is still "guardrails you set", not approval workflows or surveillance.
>
> **Launch Boundary:** This file records approved marketing/support positioning, not current production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:multi-location-boundary`, permission-policy browser QA, linked outlet save QA, Firebase deploy evidence where rules/functions change, and target-environment smoke.

---

## One-Line Pitch

> **"Run every store from one menu. Each store works within the guardrails you set."**

---

## Sales Messaging (What Sales Can Say)

### ✅ Allowed Claims

| Claim                                     | Why It's True            |
| ----------------------------------------- | ------------------------ |
| "HQ controls what each store can do"      | Store-level permissions  |
| "Brand stays consistent across locations" | Theme/layout/logo gating |
| "Control AI costs per location"           | AI feature gating        |
| "Staff knows exactly what they can do"    | Clear role boundaries    |
| "No manual sync needed"                   | Silent enforcement       |
| "Works out of the box"                    | Defaults configured      |

### ❌ Forbidden Claims

| Claim                            | Why It's Forbidden                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| "Approval workflows for changes" | We don't build approval flows                                                        |
| "Per-action approval workflows"  | No approval flows; permissions are instant boolean gates, not request-approve cycles |
| "Analytics on permission usage"  | No surveillance features                                                             |
| "Franchise management system"    | We're not an ERP                                                                     |
| "AI-powered access control"      | It's just boolean flags                                                              |

---

## Feature Page Copy

### Headline

**Run your chain. Control every store.**

### Subheadline

Each location gets exactly the features you allow. No more, no less.

### Body Copy

Running multiple stores shouldn't mean losing control.

With MenuList, your HQ menu is the single source of truth. Each store inherits it automatically. You decide what each location can change:

- Which stores can use AI tools
- Which stores can customize their look
- Which stores can add their own categories

Your staff works within clear boundaries. Store managers handle their store. HQ admins handle the chain. Everyone knows their lane.

No approval forms. No permission requests. Just clear guardrails that work silently.

### CTA

**Start your chain today →**

---

## Objection Handling

| Objection                                          | Response                                                                                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| "What if I need custom permission levels?"         | "Three default roles (Owner, Manager, Staff) cover 95% of use cases. You can also create custom roles with exactly the permissions you need." |
| "Can individual staff have different permissions?" | "Yes. Assign different roles to different staff. Owner, Manager, Staff, or create custom roles. Everyone knows their lane."                   |     |
| "What if a store needs an exception?"              | "HQ can enable any feature for any store anytime. It takes 2 clicks."                                                                         |
| "Is there an approval process for store changes?"  | "No approval process. Changes either happen or they don't based on what you've enabled. This keeps things moving."                            |

---

## Competitive Positioning

| Competitor            | Their Approach          | Our Approach                    |
| --------------------- | ----------------------- | ------------------------------- |
| Toast                 | Complex POS permissions | Simple menu-focused permissions |
| Square                | No chain features       | Built for chains                |
| Generic menu builders | No permissions at all   | HQ control built-in             |

**Our Advantage:** Purpose-built for 2-10 store chains. Not too simple, not too complex.

---

## Demo Script (60 Seconds)

1. **Show master menu** (10s)
   - "This is your HQ menu. Every store inherits this."

2. **Show store view** (10s)
   - "Here's how it looks at an outlet. Same menu, their prices."

3. **Show permission toggle** (20s)
   - "Let's enable AI images for this store..."
   - Toggle `canGenerateImages` to true
   - "Now they can generate images. Before, that button wasn't there."

4. **Show role difference** (20s)
   - "Managers can override prices and publish menus"
   - "Owners control billing, branding, and the master menu"
   - "Staff can handle customer chat. Clear lanes. No confusion."

---

## Target Customer Quotes (For Case Studies)

> "I don't want my outlets changing the logo or brand colors. Now they can't."
> — Restaurant Chain Owner

> "My store managers can adjust prices for their location. That's all they need."
> — Café Group Founder

> "AI tools are expensive. I only enable them for stores that need them."
> — Salon Chain Owner

---

## FAQ (For Support/Sales)

**Q: How many permission levels are there?**
A: Two layers. 15 store-level policies (what features each outlet can use) and 23 staff-level permissions across 3 default roles (Owner, Manager, Staff) plus custom roles.

**Q: Can I create custom roles?**
A: Yes. Create custom roles with exactly the permissions you need. The 3 default roles cover most use cases.

**Q: What happens if I change a permission?**
A: It takes effect immediately. Features appear or disappear for that store.

**Q: Do staff get notified when permissions change?**
A: No. Features simply become available or unavailable. No notifications.

**Q: Can a Store Manager see what they can't access?**
A: No. Features they can't use are hidden, not shown as disabled.

---

## Pricing Implication

Multi-chain permissions is included in MenuList Pro at no extra cost.

**Not a separate tier. Not an add-on. Just part of running a chain.**

---

**DOCUMENT STATUS:** Marketing evidence - not current launch certification
**USAGE:** Sales calls, demo scripts, website copy, support training
