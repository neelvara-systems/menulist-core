# Workspace Lifecycle Website Boundary

## Current public wording

Public trust and terms pages should continue to say that full-workspace deletion is a reviewed process and not a one-click flow.

## Update condition

Public copy may change from “not currently promised” to a source-backed reviewed-deletion statement only after:

- the feature flag is enabled in the deployed target;
- Firebase rules are deployed and read back;
- a disposable QA workspace passes close, recovery, and erasure;
- Storage and Auth evidence is captured;
- billing and retained-record wording receives owner/legal review.

Until then, no public capability claim is changed.
