# AI Failure Escalation — Help Documentation

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** Answerlattice Customers (SaaS Founders)

---

## What is Intelligent Escalation?

When Answerlattice's AI can't confidently answer a user's question, it automatically detects the failure and offers a smooth path to human support. Instead of a dead end, users see a "Still need help?" option that creates a pre-filled support ticket with full context.

---

## How It Works

### For Your End Users

1. **User asks a question** in your help widget or knowledge base
2. **AI answers** — but if the answer has low confidence, the system detects it
3. **"Still need help?"** button appears below the AI answer
4. **User clicks** — a ticket form opens, pre-filled with:
   - Their original question as the subject
   - The conversation context attached
   - Category auto-detected
5. **User submits** — ticket goes to your inbox with full debugging context

Your users never hit a dead end. They never have to re-explain their problem.

### For You (the Founder)

When you open an escalation ticket, you see:
- The user's exact question
- What the AI searched for
- What documents were found (with confidence scores)
- How the AI interpreted the query (entity resolution)
- The product context (which page, feature, plan the user was on)

This means you can answer most escalation tickets in under a minute — the investigation is already done for you.

---

## Escalation Triggers

Answerlattice uses five independent signals to detect when escalation is needed:

| Signal | What It Means |
|--------|--------------|
| Low confidence | AI found something but isn't sure it's correct |
| No entity match | AI couldn't understand what product concept the question relates to |
| Repeated failures | User asked 2+ questions with poor answers in the same session |
| Explicit request | User typed "talk to a human" or "create a ticket" |
| Weak search results | AI's best search result has very low relevance |

These triggers work automatically. No configuration needed.

---

## Knowledge Improvement Loop

Every escalation automatically signals a knowledge gap in your system. Here's what happens behind the scenes:

1. Escalation creates an **ESCALATION signal** in Answerlattice's mutation engine
2. If the same topic gets escalated multiple times, the system **auto-proposes a new canonical answer**
3. You review and approve the proposal
4. Future users get a confident, instant answer instead of escalation

This means your knowledge base literally improves from its own failures.

---

## FAQ

### How do I enable Intelligent Escalation?
It's enabled automatically when you activate Answerlattice's canonical answer engine. No separate setup required.

### Will escalation overwhelm my inbox?
No. Escalation is rate-limited to prevent floods. Typical escalation rate is 3-5% of conversations. As your knowledge base improves, this rate decreases.

### Can I customize the escalation triggers?
In v1, triggers are pre-configured with industry-standard thresholds. Custom threshold configuration is planned for a future release.

### Does escalation work in the embeddable widget?
Widget-side escalation UI is planned for a future release. Currently, escalation is available in the help center chat interface.

### What happens if no one is available to answer?
Answerlattice creates an asynchronous ticket — there's no live chat queue. Users are notified when their ticket is answered, just like regular support.

### Can I see escalation analytics?
Escalation metrics (rate, top failure topics, knowledge conversion rate) will be available in the Founder Trust Dashboard (coming soon).
