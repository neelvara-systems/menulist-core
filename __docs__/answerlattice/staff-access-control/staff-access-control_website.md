# Answerlattice Staff Access Control Website Notes

> Status: No website change required
> Last updated: 2026-07-19

This repair hardens an existing authenticated dashboard capability and does not add a new public product promise. No public website section or navigation item is required. Existing security copy is narrowed from “revoke active sessions” to refresh-access revocation because Firebase ID tokens can remain valid until normal expiry. Future website copy must remain limited to role-based workspace access, must not present role assignment as independent of team-management authority, and must not expose implementation details such as Firestore transactions, custom claims, or bridge revisions.
