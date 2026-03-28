# Instant Response Infrastructure — Help Documentation

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Audience:** Canonica Customers (SaaS Founders)
> **Language Governance:** Applied — zero jargon, step-by-step

---

## §1 — What Is Instant Response?

When your users ask a question that has been answered before, Canonica returns the answer instantly — in under 20 milliseconds. No waiting, no loading spinner.

This works automatically. You do not need to configure anything.

---

## §2 — How It Works

1. A user asks a question in your help widget or help center
2. Canonica checks if this question matches a known answer
3. If yes → the answer is returned instantly from cache
4. If no → Canonica runs the full search pipeline and stores the answer for next time

The more your users ask questions, the faster the system gets.

---

## §3 — What Gets Cached

Only **verified canonical answers** are cached. These are answers that:
- Are linked to specific product features or concepts
- Have been reviewed and approved
- Are version-controlled

AI-generated responses (for questions without a canonical answer) are not cached — they are computed fresh each time to ensure accuracy.

---

## §4 — How Answers Stay Fresh

When you update a canonical answer in the Canonica dashboard, the cached version is automatically replaced on the next query. There is no manual "clear cache" step needed.

Maximum delay between an answer update and cache refresh: 24 hours. In practice, most updates are reflected within minutes as new queries generate new cache entries.

---

## §5 — FAQ

**Q: Do I need to enable this?**
A: No. Instant caching is enabled automatically when your Canonica instance has canonical answers configured.

**Q: Will my users see stale answers?**
A: Extremely unlikely. Cache entries include the answer version number. When you update an answer, the version changes, and the old cached entry is bypassed.

**Q: Does this affect my billing?**
A: No. Instant caching reduces infrastructure costs. There is no additional charge for cached responses.

**Q: What if the cache system has an issue?**
A: The system falls back to the standard search pipeline silently. Your users will not notice any difference — answers may take a moment longer, but they will still be accurate.

**Q: Does this work with the embeddable widget?**
A: Yes. Both the help center and the embeddable widget benefit from instant caching automatically.
