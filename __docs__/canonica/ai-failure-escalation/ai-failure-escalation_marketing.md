# AI Failure Escalation — Marketing & Sales Collateral

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** Sales, Marketing

---

## §1 — Feature Name & Positioning

**Feature Name:** Intelligent Escalation
**Category:** Core Infrastructure
**Tagline:** "When AI can't answer, Canonica doesn't just say sorry — it creates a structured, debuggable ticket in seconds."

---

## §2 — Value Proposition

### For SaaS Founders (Buyer)

**Problem:** When AI support fails, users hit a dead end. They either leave frustrated or submit a blank ticket that takes 10+ minutes to investigate.

**Solution:** Canonica detects AI failure in real-time, offers a one-click escalation to human support, and auto-fills the ticket with full debugging context — what was searched, what entities matched, what confidence the AI had.

**Result:** Founders answer escalation tickets in under 30 seconds because every failure comes with its own investigation report.

### For End Users (User)

**Problem:** "The AI couldn't help me and now I have to start over explaining my problem to support."

**Solution:** One click creates a ticket with your full conversation and question already attached. No re-explaining.

---

## §3 — Key Differentiators

| Feature | Zendesk AI | Intercom Fin | Canonica |
|---------|-----------|-------------|---------|
| AI failure detection | Basic (confidence only) | Good (multi-signal) | Multi-signal (5 triggers) |
| Ticket auto-fill | Partial (conversation only) | Good (conversation + metadata) | Full (conversation + retrieval debug + entity debug + product context) |
| Knowledge gap detection | Manual | Manual | Automatic (every escalation feeds mutation engine) |
| Self-improving knowledge | No | No | Yes (escalation → signal → proposal → new answer) |
| Retrieval debugging | No | No | Yes (what AI searched, what matched, why it failed) |
| Entity resolution trace | No | No | Yes (how AI interpreted the query) |

**Unique selling point:** Canonica is the only support infrastructure that turns AI failures into structured debugging context AND automatic knowledge improvement signals.

---

## §4 — Sales Pitch Points

1. **"Your AI never fails silently"** — Every AI failure is captured, contextualized, and routed to the right person with full debugging data.

2. **"30-second ticket resolution"** — Escalation tickets come pre-filled with the user's question, conversation history, what the AI searched, and why it failed. Founders answer in seconds, not minutes.

3. **"Self-healing knowledge base"** — Every escalation automatically signals a knowledge gap. After enough escalations on the same topic, Canonica proposes a new canonical answer. Your KB literally writes itself from failures.

4. **"Zero configuration"** — Five built-in escalation triggers work out of the box. No rules to configure, no thresholds to tune.

5. **"Developer-grade debugging"** — Entity resolution trace shows exactly how the AI interpreted the query. Retrieval logs show what documents were found and their confidence scores. This is debugging, not just support.

---

## §5 — Competitive Positioning

### vs Zendesk AI
Zendesk detects when AI is uncertain and routes to human. But the human gets a bare conversation transcript — no debugging context, no retrieval trace, no entity resolution data. Investigation starts from scratch.

### vs Intercom Fin
Intercom Fin is sophisticated in escalation detection but treats failures as routing problems, not knowledge problems. Escalated conversations don't feed back into knowledge improvement.

### vs Generic RAG Chatbots
Most RAG chatbots show "I couldn't find an answer" and offer a contact link. No context preservation, no structured ticket creation, no debugging data, no knowledge loop.

---

## §6 — Pricing Implications

AI Failure Escalation is **included in all Canonica plans** — it's core infrastructure, not a premium add-on.

Escalation volume is naturally self-correcting:
- More escalations → more knowledge gaps detected → more canonical answers created → fewer future escalations

This creates a positive flywheel where the system gets better over time, reducing support load.

---

## §7 — Demo Script

1. Ask the AI widget a question about a feature that has no canonical answer
2. AI gives a RAG-based answer with low confidence
3. Show the "Still need help?" button that appears
4. Click it — ticket form opens pre-filled with:
   - Subject: the user's question
   - Category: auto-detected
   - Debugging context visible in a collapsible section
5. Submit ticket — show it appearing in founder's inbox with full context
6. Show the escalation signal appearing in the mutation engine
7. After enough escalations, show the auto-generated mutation proposal for a new canonical answer

**Key demo moment:** "Notice the founder didn't need to investigate anything. The ticket told them exactly what the AI searched, what it found, and why it failed."
