# Canonica — Guided Workflows: Help Documentation

> **Status:** DESIGNED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Audience:** Canonica Customers (SaaS Founders)

---

## What are Guided Workflows?

Guided Workflows let you create structured, step-by-step procedure answers for "how to" questions. Instead of answering procedural queries with paragraphs, Canonica serves numbered steps — each representing one atomic user action.

---

## When to Use Guided Workflows

Use procedure answers when your users ask questions like:
- "How do I invite a teammate?"
- "How to connect Stripe integration?"
- "How do I change my billing email?"

Use explanation answers for conceptual questions:
- "What is workspace visibility?"
- "What plans are available?"

---

## Creating a Procedure Answer

1. Open the **Governance Hub** in your Canonica dashboard
2. Go to **Canonical Answers**
3. Click **New Answer**
4. Select **Answer Type: Procedure (Step-by-Step)**
5. Fill in the title and bind to relevant entities
6. Add your procedure steps using the step editor
7. Optionally add warnings and prerequisites
8. Save

---

## Writing Good Steps

Each step should represent **one user action**. Follow these guidelines:

| Rule | Example |
|------|---------|
| One action per step | ✅ "Click Team Members" — ❌ "Click Team Members and then Invite" |
| Use approved verbs | open, navigate, click, select, enter, toggle, submit, confirm, download, upload, copy, paste, scroll, expand, collapse |
| Keep instructions short | Maximum 80 characters per instruction |
| Maximum 12 steps | If your procedure needs more, split into multiple answers |

### Example Procedure

**Title:** How to invite a teammate

| Step | Action | Instruction |
|------|--------|-------------|
| 1 | open | Open Settings |
| 2 | click | Click Team Members |
| 3 | click | Click Invite User |
| 4 | enter | Enter the teammate's email address |
| 5 | click | Click Send Invite |

---

## Adding Warnings

Warnings alert users before they perform potentially harmful actions.

| Severity | When to Use | Example |
|----------|-------------|---------|
| Info | Helpful context | "Invited users gain access immediately" |
| Warning | Important but not destructive | "This action affects all team members" |
| Destructive | Irreversible or dangerous | "Deleting a workspace permanently removes all data" |

---

## Adding Prerequisites

Prerequisites tell users what conditions must be met before they can follow the procedure.

| Type | Example |
|------|---------|
| Role | "You must be a workspace admin" |
| Plan | "Requires Pro plan or higher" |
| State | "Workspace must be active (not suspended)" |
| General | "You need at least one project created" |

---

## How It Works in the Widget

When an end user asks a procedural question, the widget receives structured step data. Depending on your widget implementation, steps can be rendered as:

- Numbered lists
- Step cards
- Guided walkthroughs
- Interactive tutorials

The widget always receives a text summary as fallback for clients that don't support structured rendering.

---

## Governance

Procedure answers follow the same governance as all canonical answers:

- **Drift detection** — When you release a new product version, Canonica flags procedures that may be outdated
- **Mutation proposals** — If users report confusion with a procedure, the signal engine proposes improvements
- **Audit logging** — All procedure changes are tracked
- **Version binding** — Procedures are bound to product versions

---

## Limits

| Limit | Value |
|-------|-------|
| Steps per procedure | 1–12 |
| Instruction length | 80 characters |
| Warnings per procedure | 0–5 |
| Prerequisites per procedure | 0–5 |
| Conditional branching | Not supported (use prerequisites instead) |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial help documentation |
