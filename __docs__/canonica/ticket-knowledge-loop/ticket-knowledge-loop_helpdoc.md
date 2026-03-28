# Ticket → Knowledge Loop — Help Documentation

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** Canonica Customers (SaaS Founders)
> **Feature Flag:** `ENABLE_CANONICA_TICKET_KNOWLEDGE`

---

## What is the Ticket → Knowledge Loop?

The Ticket → Knowledge Loop automatically detects when resolved support tickets reveal knowledge gaps in your help center. When multiple tickets cluster around the same topic, Canonica extracts the resolution pattern and proposes a ready-to-approve knowledge article.

**Result:** Your knowledge base grows from real support interactions without manual documentation effort.

---

## How It Works

### 1. Your team resolves tickets as usual

No changes to your workflow. Continue resolving support tickets normally.

### 2. Canonica detects patterns

The system runs nightly analysis. When 3 or more resolved tickets cluster around the same product area, it flags a knowledge gap.

### 3. A knowledge draft appears in your review queue

An AI-generated draft article appears in your Governance Dashboard → Mutation Proposals queue, marked as "Ticket Resolution" source.

The draft includes:
- A structured title
- Summary of the common problem
- Resolution steps extracted from your team's actual responses
- Number of source tickets and confidence score

### 4. You review and approve

Review the draft. You can:
- **Approve** — Publishes as a canonical answer immediately
- **Edit then approve** — Modify the draft before publishing
- **Reject** — Dismiss if not relevant

---

## Requirements

- **Ticket system active** — You need to be using Canonica's ticket system
- **Entity binding** — Tickets should reference product entities (automatic via signal emitter)
- **Minimum 3 tickets** — The system requires multiple tickets about the same topic before proposing knowledge

---

## What Happens After Approval?

Once approved, the article becomes a canonical answer that:
- Appears in AI search results immediately
- Reduces future tickets about the same topic
- Tracks its origin (which tickets generated it)

---

## Privacy & Safety

- **Personal information is stripped** — AI removes names, emails, and account-specific details before creating knowledge drafts
- **You control everything** — Nothing is published without your explicit approval
- **Provenance tracked** — Every article shows which tickets generated it, so you can verify accuracy

---

## FAQ

**Q: How many suggestions will I get?**
A: The system generates a maximum of 5 suggestions per night, prioritized by impact (most-requested topics first).

**Q: What if I don't have many tickets?**
A: The system adapts to your volume. Even a few tickets per week can surface patterns over weeks.

**Q: Can I turn this off?**
A: Yes. The feature can be disabled at any time via the feature flag without affecting existing knowledge.

**Q: Will it create duplicate articles?**
A: No. The system checks for existing knowledge and pending proposals before suggesting new content. Duplicates are automatically filtered out.

**Q: Does it work with tickets created from AI escalations?**
A: Yes. Tickets created via AI escalation (Item #8) include extra context that improves extraction quality.
