# Automatic Knowledge Creation — Marketing

> **Status:** DOCUMENTED
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** Sales / Marketing

---

## §1 — Positioning

### One-Liner
"Canonica writes your documentation drafts. You just review and publish."

### Elevator Pitch (30 seconds)
Every support ticket your users submit is a signal that documentation is missing. Canonica detects these patterns automatically — when users repeatedly ask about the same topic with no canonical answer, the system generates a draft answer from the evidence. You review it, edit if needed, and publish. Your knowledge base grows itself from real user confusion, not from guesswork.

### Category
Self-improving knowledge infrastructure. Not "AI content generation" — this is signal-driven documentation evolution.

---

## §2 — Key Differentiators

| Feature | Canonica | Intercom Fin | Zendesk AI | Generic AI KB Tools |
|---------|----------|-------------|------------|-------------------|
| Signal source | Unified (ticket + chat + escalation) | Conversation only | Ticket only | Single source |
| Clustering method | Entity-based (deterministic) | Semantic (probabilistic) | Topic modeling | Embedding similarity |
| Gap detection | Automatic + threshold-based | Manual AI recommendations | Spike detection only | None |
| Draft generation | Structured canonical format | Suggested content | Article suggestions | Generic articles |
| Human review | Mandatory (doctrine-enforced) | Optional | Optional | Often auto-publish |
| Cost | <$1/month at scale | Per-resolution pricing | Per-agent pricing | Varies |
| Architecture freeze | 3-year guaranteed stability | Changes frequently | Changes frequently | No guarantee |

---

## §3 — Pitch Angles

### Angle 1: "Your Knowledge Base Stops Decaying"
- Problem: Documentation is written once during launch. Product evolves. Docs fall behind.
- Solution: Canonica detects when support signals indicate missing documentation and drafts answers automatically.
- Proof: Signal-based gap detection means every user question that can't be answered becomes a draft article.

### Angle 2: "80% Less Writing Time"
- Problem: Founders spend hours writing documentation from scratch.
- Solution: AI generates structured draft answers from actual user confusion patterns. Founder reviews and publishes.
- Proof: Draft includes title, summary, explanation, steps, warnings — all from real signal evidence.

### Angle 3: "Documentation That Matches Real User Problems"
- Problem: Traditional KB articles are written from internal perspective, not user perspective.
- Solution: Drafts are generated from actual support signals — the exact questions users ask.
- Proof: Signal examples included alongside draft for full context.

---

## §4 — Target ICP

| Segment | Why They Care |
|---------|---------------|
| SaaS founders (1-50 employees) | Don't have dedicated docs team. Need documentation to grow itself. |
| Support leads | Tired of answering same questions. Want self-serve documentation. |
| Product managers | Want to know what confuses users most. Signal patterns reveal product friction. |

---

## §5 — Objection Handling

| Objection | Response |
|-----------|----------|
| "AI-generated docs will be low quality" | Drafts are structured skeletons, not final articles. Founder reviews every word before publishing. Human oversight is mandatory — it's in our architecture doctrine. |
| "We already use [Zendesk/Intercom]" | Those tools detect gaps but don't generate structured canonical answers. Canonica's entity-based approach produces more accurate drafts because it understands your product ontology, not just keywords. |
| "Sounds expensive" | <$1/month at 100-tenant scale. Gemini 2.5 Flash is extremely cost-efficient. Most of the infrastructure already exists — this is a last-mile enhancement. |
| "What if the AI hallucinates?" | Three safeguards: (1) Drafts grounded in actual signal evidence + existing KB, (2) Prompt explicitly says "do not invent features", (3) Human review is mandatory — nothing auto-publishes. |

---

## §6 — Sales Demo Script

1. **Show the gap:** "Here's your governance dashboard. See these 5 pending proposals? Each one represents a topic where users are confused but you have no canonical answer."
2. **Show the evidence:** "This proposal was triggered by 34 support signals about API key rotation. Here are the actual questions users asked."
3. **Show the draft:** "Canonica generated this draft answer from the evidence. Title, summary, step-by-step instructions, warnings — all structured."
4. **Show the action:** "Click 'Approve' and this becomes a live canonical answer. Or edit first — it takes 2 minutes instead of 30."
5. **Show the outcome:** "Next time someone asks about API key rotation, they get a deterministic canonical answer instead of an AI-guessed response."
