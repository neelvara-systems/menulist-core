# Instant Response Infrastructure — Marketing

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Audience:** Internal Sales/Marketing

---

## §1 — Elevator Pitch

Canonica delivers answers in under 20 milliseconds for repeated questions. While other AI support tools recompute every answer from scratch (2-5 seconds), Canonica caches deterministic canonical answers and serves them instantly. This means end-users get immediate help, and SaaS founders pay less for infrastructure.

---

## §2 — Key Differentiators

### vs. Generic AI Support (Intercom Fin, Zendesk AI)
- **They:** Run full RAG pipeline for every query (~2-5s). No deterministic answer layer.
- **Canonica:** Canonical answers are versioned, governed objects. Once resolved, they're cached and served in <20ms. Only truly new questions hit the AI pipeline.

### vs. Static FAQ/KB Tools (Help Scout, Document360)
- **They:** Keyword search returns articles. User must read and find the answer.
- **Canonica:** Returns the exact answer (not the article) in <20ms. Guided workflows included.

### vs. Chatbot Builders (Drift, ManyChat)
- **They:** Script-based flows. No knowledge governance. Answers go stale silently.
- **Canonica:** Answers are version-controlled and automatically invalidated when documentation changes. Stale answers impossible.

---

## §3 — Numbers That Sell

| Metric | Value | Context |
| ------ | ----- | ------- |
| Cache hit response time | <20ms | vs. 2-5s for typical AI support tools |
| Repeated question ratio | 60-80% | Industry standard — majority of support is repetitive |
| Firebase cost reduction | 40-60% | Fewer Firestore reads for repeated queries |
| Infrastructure cost | $0/month (free tier) | Upstash Redis free tier covers early scale |
| Zero downtime | Graceful degradation | If cache fails, full pipeline runs seamlessly |

---

## §4 — Pitch Angles

### For Technical Founders
"Your support AI shouldn't recompute the same answer 1,000 times. Canonica caches deterministic answers in Redis and serves them in <20ms. You only pay for genuinely new questions."

### For Non-Technical Founders
"When your customers ask the same question that 100 people asked before, they get the answer instantly. No waiting, no spinning wheels. It just works."

### For Cost-Conscious Teams
"60-80% of your support queries are repeated. Without caching, you're paying for AI inference on every single one. Canonica caches answers and serves them for free. Your AI bill drops immediately."

---

## §5 — FAQ (Internal)

**Q: Doesn't this make answers stale?**
A: No. Cache keys include the answer version number. When an answer is updated, the version changes, and the old cache entry is automatically bypassed. Maximum staleness is 24 hours (TTL), but version-based invalidation means most stale entries are never served.

**Q: What if Redis goes down?**
A: The system falls back to the existing Firestore pipeline silently. Users never notice. Redis is a performance optimization, not a dependency.

**Q: Does this work with the widget?**
A: Yes. The cache sits inside `coreSearch()`, which powers both the help center and the embeddable widget. Both surfaces benefit automatically.

**Q: How is this different from the existing aiSearchHistory cache?**
A: `aiSearchHistory` is a Firestore-based analytics cache — it stores search history for feedback and analytics purposes. The instant cache is a Redis-based performance cache — it stores resolved canonical answers for sub-millisecond retrieval. Different purposes, different storage, complementary systems.
