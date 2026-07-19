# Use Predictive Support And Known Issues

Predictive support shows a relevant support cue in the Answerlattice widget when a user reaches an exact product page. Known issues show a current incident notice through the same runtime.

## Create a predictive trigger

1. Open Governance.
2. Open Advanced -> Predictive Triggers.
3. Create a trigger or review a suggested trigger.
4. Enter an exact page identifier used by your widget context.
5. Optionally narrow it by feature, workflow, plan, or user role.
6. Choose the approved content or action type.
7. Set priority and cooldown.
8. Save and activate.

Suggested triggers cannot activate until you review them and assign an exact page.

## Create a known issue

1. Open Known Issues.
2. Add the affected exact page.
3. Add a short title and bounded summary.
4. Choose `info`, `degraded`, or `outage` severity.
5. Set the active start/end window when needed.
6. Optionally add a public HTTPS status-page URL.
7. Activate the notice.

Do not use a private dashboard, signed URL, internal hostname, or URL containing credentials as the public status link.

## What the user sees

The cue appears through the existing widget experience. Opening it shows the approved suggestion, related content, governed procedure, or known-issue notice available for that page. Moving to a different page clears the old suggestion.

Predictive support does not click product controls or change customer data.

## Engagement evidence

The management view can show:

- times shown;
- times the widget was opened from the cue;
- times dismissed.

These numbers help you review relevance. They do not by themselves prove that the user resolved the issue, completed a task, or avoided a ticket. Answerlattice does not automatically disable a trigger from these counts.

## Troubleshooting

### No cue appears

Check that:

- the trigger is active;
- an exact page is present and matches the widget context;
- optional plan, role, feature, and workflow conditions match;
- the widget key and allowed origin are current;
- the known-issue time window is active;
- the ordinary predictive prompt is not in cooldown;
- predictive support is enabled in the deployed environment.

### A stale cue remains after navigation

Confirm the client calls the Answerlattice context API on route/workflow changes. The loader clears the prior suggestion when context changes, but it cannot infer a single-page-app navigation that the host never reports.

### Engagement is not recorded

Interaction signals require `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION`. Delivery can continue when this flag is off, but the endpoint returns `recorded: false` and writes no signal.

### A known-issue URL is rejected

Use a public HTTPS URL. Internal, local, credential-bearing, or otherwise non-public URLs are rejected by the shared public URL boundary.

## Privacy

The predictive request uses allowlisted page/workflow context and a non-PII per-tab session identifier. Do not put email addresses, account IDs, secrets, form values, or raw application state into context fields.
