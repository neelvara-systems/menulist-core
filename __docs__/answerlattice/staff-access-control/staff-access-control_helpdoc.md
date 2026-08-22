# Manage Answerlattice Team Access

> Status: Implemented
> Last updated: 2026-07-19

Use **Team > Members** to add a member, change their role, reset login details, sign them out, or remove access from the current workspace. Use **Team > Roles** to control what a role can do.

- Answerlattice will not let you remove or demote the last Owner.
- You cannot deactivate or remove your own access.
- Only an Owner can add or manage another Owner. Managers can continue managing non-owner team members.
- **Remove** affects the current workspace. Other workspace access remains unchanged.
- If a member belongs to multiple workspaces, remove them from this workspace instead of deactivating their whole account. Platform support can perform account-wide recovery when required.
- Login reset and sign-out also affect every workspace for a shared account, so a platform administrator handles those actions for multi-workspace members.
- Sign-out revokes refresh access. An already-issued Firebase session token can remain valid until it reaches its normal expiry, so use platform support for a suspected compromise rather than treating the button as instant token deletion.
- A role must be reassigned from every member who still has it, including inactive members, before it can be turned off.
- Owner, Manager, and Support Staff are protected defaults. Create a custom role when you need different permissions.
- **Create and assign roles** requires **Manage team access**. Turning on role assignment also turns on team access; turning team access off removes role-assignment authority.
- A temporary passcode is shown once. Use **Reset login** to create new login details when needed.
- Your own row is marked **You**. Sign out from the profile menu; Answerlattice does not show controls that could deactivate or remove your current access.
