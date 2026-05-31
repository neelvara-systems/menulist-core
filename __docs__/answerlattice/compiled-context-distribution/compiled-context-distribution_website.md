# Compiled Context Distribution Website Notes

Compiled context is now allowed as narrow website reliability copy because the core bundle serving layer is enabled and visible in owner readiness surfaces.

Use existing high-intent website pages instead of a standalone public page:

- Homepage/Product: describe runtime readiness and approved context being prepared before the widget needs it.
- Security: describe public/private bundle separation and the fields that must never be bundled.
- Resources: point buyers to Product and Security for runtime safety instead of adding a separate implementation page.
- Updates and LLM context: record that compiled context is production infrastructure, while agent write access is not a public promise.

The architecture supports Answerlattice API/MCP distribution pages only when all of these are true:

- MCP is enabled for selected tenants.
- Bundle usage metrics exist.
- Storage/Firestore cost baselines are verified.
- Security review confirms public/private bundle separation.

Current website pages should continue describing Answerlattice as governed answer infrastructure and runtime reliability, not an agent-write platform.

Approved public wording:

- "Approved support context is prepared before runtime needs it."
- "Ready widget context can use versioned, cache-first bundles."
- "Public widget bundles contain approved public-safe context, not drafts, tickets, audit logs, API keys, or raw signals."
- "MCP and agent-context tools remain rollout-gated unless a public page explicitly exposes them."
