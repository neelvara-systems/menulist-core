# Automatic Knowledge Creation — Help Documentation

> **Status:** DOCUMENTED
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** Answerlattice Customers (SaaS Founders)

---

## What is Automatic Knowledge Creation?

Answerlattice monitors your support signals — tickets, chat feedback, and escalations — to detect topics where your documentation is missing. When a knowledge gap is confirmed, Answerlattice generates a draft canonical answer for you to review and publish.

This means your knowledge base grows from real user confusion, not guesswork.

---

## How It Works

### 1. Signals Are Collected
Every time a user submits a ticket, gives negative feedback on a chat answer, or escalates to a human agent, Answerlattice records a signal. These signals are grouped by product entity (the specific feature, workflow, or concept involved).

### 2. Knowledge Gaps Are Detected
Each night, Answerlattice checks whether any product entity has accumulated support signals but has no canonical answer. If an entity has 5 or more signals without documentation, it's flagged as a knowledge gap.

### 3. A Draft Is Generated
For each confirmed knowledge gap, Answerlattice generates a structured draft answer using:
- The actual questions your users asked (signal examples)
- Your product entity definitions
- Your existing knowledge base content

The draft includes a title, summary, detailed explanation, and — when appropriate — step-by-step instructions with warnings and prerequisites.

### 4. You Review and Publish
The draft appears in your Governance Dashboard under "Knowledge Opportunities." You can:
- **Approve** — Publish the draft as-is as a canonical answer
- **Edit & Approve** — Modify the draft before publishing
- **Reject** — Dismiss if the topic doesn't need documentation
- **Regenerate** — Request a new draft with the same evidence

---

## Where to Find Draft Proposals

1. Go to your **Answerlattice Dashboard**
2. Navigate to **Governance Hub**
3. Look for proposals marked as **"New Answer Required"** with a draft badge
4. Click to view the draft content, signal evidence, and entity context

---

## Frequently Asked Questions

### Will AI drafts contain errors?
Drafts are structured skeletons, not final documentation. They are grounded in your actual user questions and existing knowledge base. Every draft requires your review before it becomes a live canonical answer. Nothing publishes automatically.

### How many drafts will I see per month?
Typically 5-15, depending on your product's support volume and existing documentation coverage. The system only generates drafts for genuine gaps (5+ signals, no canonical answer).

### Can I turn off automatic drafts?
Yes. If you prefer to write all documentation manually, you can disable Automatic Knowledge Creation in your feature settings. Answerlattice will still detect knowledge gaps — it just won't generate drafts.

### What if I disagree with the draft?
Click "Reject." The proposal is dismissed. Answerlattice will not regenerate a draft for the same entity unless new signals accumulate.

### Does this cost extra?
No. Automatic Knowledge Creation is included in your Answerlattice plan. AI generation costs are negligible (<$0.01 per draft).

### How does this relate to my existing articles?
Drafts are for topics where NO canonical answer exists. If you already have documentation covering a topic, Answerlattice won't generate a duplicate draft. The system checks existing coverage before creating proposals.

---

## Tips for Best Results

1. **Keep your entity ontology updated** — The more accurate your product entities, the better the draft quality.
2. **Review drafts weekly** — Pending proposals don't expire, but reviewing them regularly keeps your knowledge base current.
3. **Add your domain expertise** — Drafts are starting points. Add screenshots, links, edge cases that only you know about.
4. **Don't reject too quickly** — Even if a draft isn't perfect, it often captures the right topic. Edit rather than reject.
