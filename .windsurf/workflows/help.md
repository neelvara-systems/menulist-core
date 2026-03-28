---
description: Smart workflow router. Use when unsure which workflow to apply. Cascade analyzes the situation and picks the right workflow automatically. Just describe what you need.
---

# Smart Workflow Router

The user is unsure which workflow to use. Your job is to **analyze the situation and automatically trigger the correct workflow**.

## Step 1: Understand the Request

Read the user's message carefully. Ask yourself:

1. **Is there a ChatGPT conversation to validate?**
   → If YES → Run `/chatgpt-review`

2. **Is this about starting a NEW feature (from scratch or after ChatGPT review)?**
   → If YES → Run `/new-feature`

3. **Did the user send docs to ChatGPT and got feedback back (docs-only, no code)?**
   → If YES → Run `/doc-feedback`

4. **Did the user send code to ChatGPT and got feedback back (code suggestions)?**
   → If YES → Run `/code-feedback`

5. **Does a feature EXIST in code but has NO documentation or outdated docs?**
   → If YES → Run `/retro-doc`

6. **Is the user revisiting an existing feature for improvements, cleanup, or deep review?**
   → If YES → Run `/refactor-feature`

7. **Are docs scattered, folders duplicated, naming broken, or general doc mess?**
   → If YES → Run `/doc-organize`

8. **Does a feature have TOO MANY docs after many sessions/reviews/audits — cluttered, chaotic, redundant?**
   → If YES → Run `/doc-rebuild` (goes back to codebase truth and rewrites docs clean)

9. **Is this about security audit, infrastructure health, cost bombs, or performance?**
   → If YES → Run `/system-audit`

10. **Is the user ending a session and wants a final check?**
    → If YES → Run `/final-review`

11. **Is the work on owner-side features (dashboard, projects, editor, analytics, settings)?**
    → If YES → Run `/owner-dashboard` (loads DAL patterns, security rules, auth conventions)

12. **Is the work on customer-facing surfaces (digital menu, QR menu, screens, public pages)?**
    → If YES → Run `/customer-facing` (loads constitution, language governance, menu enforcement)

13. **None of the above match clearly?**
    → Ask the user ONE clarifying question with these options:
    - "Are you working on a NEW feature or an EXISTING one?"
    - "Do you have ChatGPT feedback to process?"
    - "Do you want to clean up documentation or code?"
      Then route based on their answer.

## Step 2: Announce Your Decision

Before executing, tell the user:

```
Based on your request, I'm running: /[workflow-name]
Reason: [1-line explanation why this workflow fits]
```

## Step 3: Execute the Selected Workflow

Read the workflow file from `.windsurf/workflows/[workflow-name].md` and execute it fully.

## Decision Matrix (Quick Reference)

| User Says Something Like...                         | Route To                |
| --------------------------------------------------- | ----------------------- |
| "I discussed this with ChatGPT..."                  | `/chatgpt-review`       |
| "Let's build [feature]..."                          | `/new-feature`          |
| "ChatGPT reviewed my docs and said..."              | `/doc-feedback`         |
| "ChatGPT looked at the code and suggests..."        | `/code-feedback`        |
| "We have [feature] but no docs..."                  | `/retro-doc`            |
| "Let's review/improve [existing feature]..."        | `/refactor-feature`     |
| "Docs are messy / organize docs..."                 | `/doc-organize`         |
| "Feature docs are cluttered after many sessions..." | `/doc-rebuild`          |
| "Rebuild docs from codebase truth..."               | `/doc-rebuild`          |
| "Check security / audit / infrastructure..."        | `/system-audit`         |
| "We're done / end of session / final check..."      | `/final-review`         |
| "Working on the dashboard / editor / settings..."   | `/owner-dashboard`      |
| "Working on the menu / screens / public pages..."   | `/customer-facing`      |
| "I want to start working but not sure what..."      | Ask clarifying question |

## Combo Detection

Sometimes the user needs MULTIPLE workflows in sequence. Detect these patterns:

- **"ChatGPT gave me a feature idea"** → `/chatgpt-review` then `/new-feature`
- **"Feature exists, needs docs AND code cleanup"** → `/retro-doc` then `/refactor-feature`
- **"Let's wrap up and clean docs"** → `/doc-organize` then `/final-review`
- **"Feature docs are a mess after many sessions"** → `/doc-rebuild` then `/final-review`
- **"Clean up this feature's docs from codebase"** → `/doc-rebuild`
- **"ChatGPT reviewed everything"** → `/doc-feedback` then `/code-feedback`
- **"Build a new owner feature"** → `/owner-dashboard` then `/new-feature`
- **"Build a new customer-facing feature"** → `/customer-facing` then `/new-feature`
- **"Full review of a menu feature"** → `/customer-facing` then `/refactor-feature`

If a combo is detected, announce the full sequence:

```
This looks like a multi-step task. I'll run:
1. /[first-workflow] — [reason]
2. /[second-workflow] — [reason]
Starting with step 1...
```

## Guardrails

- ALWAYS announce which workflow you're running and WHY before executing
- NEVER guess if truly ambiguous — ask ONE focused question
- If the user says "just do it" or "you decide" — pick the most conservative/safe option
- All workflows automatically load `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
