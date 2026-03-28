# Founder Trust Layer — Help Documentation

> **Version:** 1.0.0
> **Created:** 2026-03-09

---

## §1 — What is the Trust Dashboard?

The Trust Dashboard shows you how well your AI support system is performing. It answers one question: **"Can I trust the AI to answer my users correctly?"**

You'll find it in your Canonica Governance Hub.

---

## §2 — Understanding the 4 Metrics

### Coverage Rate

**What it means:** The percentage of user questions that AI handles using your knowledge base.

**Example:** If 100 users ask questions and AI finds answers for 85 of them, your coverage is 85%.

**What to do:**
- **Green (70%+):** Your knowledge base covers most topics. No action needed.
- **Amber (40-69%):** Some topics are missing. Check the failing entities list below.
- **Red (below 40%):** Many topics lack documentation. Add canonical answers for your top entities.

### Resolution Rate

**What it means:** The percentage of AI-handled questions that are resolved without needing human support.

**Example:** If AI handles 85 questions and 75 are resolved without escalation, your resolution rate is 88%.

**What to do:**
- **Green (85%+):** AI is resolving well. No action needed.
- **Amber (70-84%):** Some answers need improvement. Check escalation breakdown.
- **Red (below 70%):** Many users still need human help. Review low-confidence answers.

### Drift Rate

**What it means:** The percentage of your answers that may be outdated due to product changes.

**Example:** If you have 50 active answers and 3 are flagged as drifted, your drift rate is 6%.

**What to do:**
- **Green (5% or less):** Answers are current. No action needed.
- **Amber (6-15%):** Some answers need review. Check drifted answers in the governance panel.
- **Red (above 15%):** Many answers are stale. Prioritize reviewing flagged content.

### Entity Health

**What it means:** The average health score across all your knowledge entities (product features, workflows, etc.).

**Example:** If you have 20 entities with an average health of 81, your system is in good shape.

**What to do:**
- **Green (80+):** Entities are well-documented and healthy.
- **Amber (60-79):** Some entities need attention. Check the failing list.
- **Red (below 60):** Multiple entities have problems. Focus on critical ones first.

---

## §3 — Top Failing Entities

Below the metrics, you'll see a list of up to 5 product areas where AI performs worst.

Each entry shows:
- **Entity name** — The product feature or area
- **Reliability** — How often AI answers correctly for this topic
- **Query count** — How many times users asked about this

**What to do:** Click on a failing entity to see its canonical answers. Add or improve answers for that topic.

---

## §4 — Escalation Breakdown

This section shows WHY AI fails, not just that it fails:

- **Knowledge Gap** — Users asked about something with no documentation
- **Low Confidence** — AI found an answer but wasn't confident enough
- **Entity Mismatch** — AI matched the wrong product area
- **Retrieval Failure** — AI couldn't understand the question at all
- **User Requested** — User asked for a human (this is normal)

**What to do:**
- High "Knowledge Gap" → Write more canonical answers
- High "Low Confidence" → Improve existing answer quality
- High "Entity Mismatch" → Add synonyms to entity search index
- High "Retrieval Failure" → Add more entities to your ontology

---

## §5 — Trend Indicators

Each metric shows a trend arrow:
- **↑** — Improving compared to yesterday
- **→** — Stable (less than 2% change)
- **↓** — Degrading compared to yesterday

Note: For drift rate, ↓ means improvement (drift is decreasing).

---

## §6 — When Does Data Update?

The Trust Dashboard updates **once per day** during the nightly maintenance window (3:00 AM UTC). You'll see the most recent data from the previous day's activity.

---

## §7 — FAQ

**Q: Why does my dashboard show "No data yet"?**
A: The Trust Dashboard needs at least one nightly run after enabling the feature. Data will appear the next morning.

**Q: Why don't I see any failing entities?**
A: Entities need at least 20 queries in a day to appear in the failing list. This prevents noise from low-volume topics.

**Q: Can I customize the thresholds?**
A: Not in v1. The thresholds are based on industry standards and work well for most SaaS products.

**Q: Does the Trust Dashboard cost extra?**
A: No. It's included in all Canonica plans at no additional cost.
