# Ticket System — Marketing & Sales Collateral

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Sales, Marketing (Internal)

---

## 1. Elevator Pitch

**One-liner:** "Structured support requests with SLA tracking, real-time updates, and conversation threading — built into your dashboard."

**30 seconds:** MenuList's ticket system lets business owners submit structured support requests directly from their dashboard — categorized, prioritized, and tracked with SLA timers. Platform administrators see every ticket in real-time with conversation threading, internal notes, and automatic breach detection. No external tools. No email chains. Everything in one place.

---

## 2. Feature Narrative

### For SMB Owners
When something isn't working, you shouldn't have to figure out where to get help. The ticket system is right there in your dashboard — describe the issue, attach a screenshot, and submit. You'll see your ticket's status update in real-time, and you can continue the conversation right inside the same view. No emails to track, no portals to remember.

### For Platform Operators
Every support request is tracked from creation to resolution. SLA timers start automatically based on priority — you see at a glance which tickets are at risk of breaching. Conversation threading keeps all context in one place. Internal notes and tags help your team coordinate without the customer seeing behind the scenes. Browser logs are captured automatically so you can debug without asking "what browser are you using?"

---

## 3. Key Selling Points

| Point | Evidence |
|-------|---------|
| **Real-time updates** | Firestore `onSnapshot` — owner sees status changes instantly |
| **SLA tracking** | 3-tier SLA with automatic on_time/at_risk/breached calculation |
| **Zero-config** | Works out of the box, no setup required |
| **Browser log capture** | Debugging context captured automatically on ticket creation |
| **Conversation threading** | Chat-style messaging with system messages for status changes |
| **Tenant isolation** | Every ticket scoped to tenant + store |
| **Soft delete** | Tickets can be restored — never permanently lost from UI |
| **File attachments** | Paste or upload, up to 4 files, tenant-scoped storage |

---

## 4. Competitive Comparison

| Feature | MenuList | Zendesk | Freshdesk | Intercom |
|---------|:--------:|:-------:|:---------:|:--------:|
| Built into product | ✅ | ❌ External | ❌ External | ❌ External |
| Same auth | ✅ | ❌ Separate login | ❌ Separate login | ❌ Separate login |
| Real-time updates | ✅ | ⚠️ Polling | ⚠️ Polling | ✅ |
| SLA tracking | ✅ | ✅ (paid) | ✅ (paid) | ❌ |
| Browser log capture | ✅ | ❌ | ❌ | ❌ |
| Conversation threading | ✅ | ✅ | ✅ | ✅ |
| Internal notes | ✅ | ✅ | ✅ | ✅ |
| Cost | $0/mo | $19-115/agent | $15-79/agent | $39-139/seat |

---

## 5. Pricing Context

This feature is included in all MenuList subscriptions as core infrastructure. No separate pricing. The Firestore cost is negligible (~$0.007/month for 10 stores).
