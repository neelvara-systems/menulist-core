# Answerlattice Scheduler Architecture Website Notes

Scheduler architecture is not a standalone public website feature. It may appear inside product/security/runtime copy when the buyer needs to understand reliability and cost boundaries.

Use existing pages instead of a dedicated scheduler page:

- Product: "Daily governance is workspace-local and centralized."
- Security: "Scheduler work uses local support-day end time and compact summaries."
- Updates: record scheduler behavior as product reliability, not as an implementation tutorial.

Keep wording narrow:

- "Governance checks run automatically on a workspace schedule."
- "Daily governance runs after each workspace's support day closes."
- "Compiled context is repaired from source-version changes."
- "Centralized scheduler work avoids adding separate scheduled functions for each maintenance task."

Do not expose implementation details such as Cloud Scheduler, Firestore document IDs, or lock names on public pages.
