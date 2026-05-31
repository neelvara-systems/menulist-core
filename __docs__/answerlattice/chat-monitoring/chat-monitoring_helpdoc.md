# Chat Monitoring — Customer Help Documentation

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Platform Administrators only
> **Note:** This feature is NOT accessible to SMB owners. This helpdoc is for internal platform team reference.

---

## Overview

Chat Monitoring lets platform administrators view and manage all AI chatbot conversations across all tenants. Monitor answer quality, triage conversations, add team notes, and track performance.

---

## Viewing Conversations

1. Navigate to Chat Management in the platform navigation
2. The conversation list shows all conversations, newest first
3. Each row shows: user name, mode (QnA/Assistant), message count, feedback status, last updated

### Filtering Conversations

Click the **Filters** button to open the filter drawer. Available filters:

| Filter | What It Does |
|--------|-------------|
| **Mode** | Show only QnA or Assistant conversations |
| **Feedback** | Show conversations with positive, negative, or no feedback |
| **Status** | Filter by admin-assigned status (New, In Progress, Resolved, etc.) |
| **Priority** | Filter by admin-assigned priority (High, Normal, Low) |
| **Quality** | Filter by AI answer confidence — most useful for finding problem areas |
| **Tags** | Filter by admin-assigned tags |
| **Has Notes** | Show only conversations with internal team notes |
| **Unread** | Show conversations with new messages admin hasn't viewed |
| **Date Range** | Filter by date |

### Quality Filter (Most Important)

The quality filter helps you find conversations where the AI gave poor answers:
- **Good (≥60%)** — AI found relevant articles with high confidence
- **Low (<60%)** — AI found articles but with low confidence — may need KB improvement
- **Very Low (<40%)** — AI struggled to find relevant content — likely a knowledge gap

---

## Managing Conversations

Click any conversation to open the detail drawer.

### Viewing Messages
- Full message thread with timestamps
- AI answers show source citations and confidence scores
- Feedback indicators (thumbs up/down with user comments)
- Regenerated messages marked with badge

### Setting Status/Priority/Tags
Click the metadata popover to:
- Set status: New → In Progress → Resolved → Follow-up → Closed
- Set priority: High, Normal, Low
- Add tags: Technical Issue, Bug Report, Feature Request, etc.

### Adding Internal Notes
- Click the notes section in the drawer
- Write rich text notes (formatting, lists, etc.)
- Notes are visible only to platform team — never shown to users
- Notes track who wrote them and when

### Exporting
- **CSV Export** — Download all filtered conversations as CSV
- **Transcript Export** — Download individual conversation as formatted Markdown

---

## Weekly AI Digest

Navigate to Weekly Digest to see the AI-generated performance summary:
- **Executive narrative** — 2-3 paragraph summary of the week
- **Key highlights** — What went well
- **Recommendations** — What needs attention
- **Key metrics** — Volume change, satisfaction change, top category

Click **Regenerate** to create a fresh report on demand.

---

## ROI Calculator

Navigate to ROI Calculator to quantify the business value of the AI chatbot:
- Enter your support agent hourly rate
- Enter average ticket value and platform cost
- See calculated: hours saved, cost saved, automation rate, ROI percentage

---

## Tips

- **Check "Very Low" quality daily** — These are your biggest knowledge gaps
- **Use tags consistently** — Makes trend analysis easier
- **Add notes on complex cases** — Helps team members who look at the conversation later
- **Review weekly digest every Monday** — Highlights from the previous week
