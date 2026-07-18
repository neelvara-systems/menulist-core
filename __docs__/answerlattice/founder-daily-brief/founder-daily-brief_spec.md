# Founder Daily Brief Spec

## Goal

Reduce the daily mental load for solo founders by showing the smallest useful set of support actions for today.

## Owner Problem

AI-built SaaS products can ship faster than founders can document, test, and support them. Answerlattice already collects review signals, intake items, support-board cards, answer risk, and friction summaries, but a founder should not manually inspect every screen each morning.

## Product Promise

Open Support Assistant and see:

- what needs attention today;
- why it matters;
- where to review it;
- whether AI has prepared a draft or deterministic check;
- whether the action has AI credit cost.

## Requirements

1. Show a `Today's plan` section in Support Assistant.
2. Rank at most four actions from existing summaries, with one primary action and no more than three secondary actions.
3. Always prefer governed review actions over raw operations.
4. Link to existing screens only: Governance, Support Board, Knowledge Intake, Answer Tests, Known Issues, Tickets, Activation, Widget, Billing.
5. When the action rollout flag is enabled, selected launch/release items may prefill the existing Support Board create form. Opening the form performs no write.
6. Add no autonomous writes.
7. Add no model calls.
8. Add no raw customer conversation reads.
9. Explain cost posture per action: no AI cost, support-credit guarded, or review-only.
10. Keep the assistant response and Support Board prefill path read-only until the owner uses the board's existing Create action.
11. Preserve existing Support Assistant question flow.
12. Show factual launch verification from the compact activation snapshot.
13. Show confirmed-resolution and same-session recontact evidence when explicit outcomes exist.
14. Provide one owner-triggered `I shipped a change` action that opens the existing changelog form; it must not write until the owner saves.

## Action Categories

| Category | Meaning |
| --- | --- |
| `answer_review` | Drifted answers, critical entities, or failed answer risk |
| `needs_answer` | Support Board cards or repeated gaps need approved answers |
| `intake_review` | Imported sources or OCR/transcription outputs need owner approval |
| `release_safety` | Answer tests or release checks should run before/after a release |
| `support_reply` | Tickets/escalations should use approved knowledge before reply |
| `launch_safety` | Widget/context/onboarding should be verified before user traffic grows |
| `cost_guard` | Support-credit or deterministic/no-cost boundary is relevant |

## Operating-Home Rule

Daily Brief is the default management home only after `activation.launchProof.ready === true`. Before that point, Activation remains the home. Daily Brief does not decide launch readiness itself and cannot override launch proof.

## Non-Goals

- Generic AI task manager
- Live chat automation
- Ticket workflow expansion
- New assistant task queue
- Auto-generated daily emails
- New support analytics dashboard
- Auto-publishing generated answers
- LLM deciding truth

## Access

The brief uses the same access gate as Support Assistant: `canManageSupport`.

## Feature Flag

`ENABLE_ANSWERLATTICE_FOUNDER_DAILY_BRIEF`

`ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_ACTIONS` controls the prefilled Support Board handoff and defaults off pending founder validation.
