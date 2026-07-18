# Answerlattice Guided Workflows Help

> **Status:** Implemented, workspace opt-in
> **Last verified:** 2026-07-18

## What It Does

Guided Resolution helps an end user follow an approved procedure inside your product. It can highlight the control for the current step and wait for a product event that you verify.

It never clicks the control or changes product data.

## Configure an Approved Procedure

1. Open **Governance**.
2. Open **Canonical Answers**.
3. Create or edit an answer.
4. Set the answer type to **Procedure**.
5. Add 1-12 short steps.
6. For a step that should point to a control, add a semantic target such as `billing.change_plan`.
7. For a step that should advance after a verified state change, add an expected event such as `billing.plan_changed`.
8. Save and complete the existing approval flow.

Targets and events must be lowercase semantic IDs. Do not enter CSS selectors.

## Instrument the Client Product

Mark only the important control:

```html
<button data-answerlattice-target="billing.change_plan">
  Change plan
</button>
```

Emit an event only after your product confirms the expected state:

```js
window.AnswerlatticeWidget?.emitWorkflowEvent('billing.plan_changed');
```

Do not include customer data, form values, tokens, record IDs, or secrets in target/event names.

Use one shared registry inside the client application. MenuList, the first reference client, imports all target and event names from one typed module rather than repeating string values across screens.

Only emit completion after the product has verified the transition. A button click by itself is not proof that an import, publish, or configuration change succeeded.

## Enable the Workspace

1. Open **Widget**.
2. Open **Behavior**.
3. Turn on **Guided resolution**.
4. Use the **Guided Steps** install tab for the current integration example.
5. Test the procedure on an allowed-origin client page.

Existing widget configurations remain disabled until this setting is enabled.

## End-User Behavior

- **Guide me:** starts the current approved procedure.
- **Continue:** advances a step when no verified event is required.
- **Target missing:** ends the guide and records which semantic target was absent.
- **Get support:** ends the guide and sends a governed escalation signal.
- Closing the widget or changing page/context safely clears the highlight.

If a target is missing, the written instruction remains visible so the user is not blocked by instrumentation.

## Troubleshooting

| Problem | Check |
|---|---|
| Guide button is absent | Workspace toggle, canonical answer status, procedure shape |
| Target is not highlighted | Exact `data-answerlattice-target` value and current page |
| Step does not advance | Exact `expectedEvent` value and event emitted after verified state |
| Guide resets | The page route or widget context changed |
| Outcome is not recorded | Signal mutation may be disabled, or public request admission failed |

## Safety Limits

Guided Resolution does not:

- read the full DOM;
- capture screenshots;
- read forms;
- click controls;
- execute arbitrary actions;
- alter roles, billing, security, or customer data;
- approve or publish knowledge.

Imported or generated procedures appear as review work first. They become available to end users only after the normal canonical-answer governance approval.
