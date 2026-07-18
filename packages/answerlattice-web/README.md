# Answerlattice Web Helper

Internal unsupported helper source for Answerlattice runtime experiments.

Do not publish this package, document it as an end-user install option, or include it in public install guides. Answerlattice-supported client installs use the stable v1 browser contract:

- `https://answerlattice.com/widget/v1/answerlattice-widget.js`
- public `al_*` widget key
- `window.AnswerlatticeWidget`
- `setContext(context)` and `page(context)`
- optional `identify(visitor)`, `identifySigned(token)`, and `clearIdentity()`
- optional `setEvidenceLinks([{ label, url }])` for dashboard-allowlisted HTTPS diagnostics
- optional `emitWorkflowEvent(eventName)` for a fixed semantic event after the host verifies a state transition
- read-only `getGuidanceState()` for local diagnostics

These guided-resolution methods do not accept payload data or execute host actions.
