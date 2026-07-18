# Roles & Permissions — Marketing Contract

**Status:** Source-backed claims only
**Last Updated:** July 16, 2026

## Positioning

MenuList gives a small-business owner simple store-scoped team access without turning the dashboard into workforce-management software. Owner, Manager, and Staff defaults cover common operating needs; custom roles expose the same 29 boolean permissions when more separation is needed.

## Safe Claims

- Owners can add, edit, deactivate, remove, reset access for, and sign out staff.
- Staff can use email or an owner-shared Staff ID/passcode flow, with phone as a login alias when saved.
- Managers can manage ordinary staff but cannot change an Owner account unless their role also grants role assignment.
- Features outside the signed-in person's role are omitted from protected navigation and screens, while server routes enforce the same permission contract.
- Multi-location users receive one role per store; outlet policy remains a separate second layer.
- Owners can create custom roles from 29 shipped permission toggles.

## Claims That Need Qualification

- Say **“session revocation is committed and Firebase refresh-token revocation follows”**, not “instant logout on every device.” The dashboard observes authoritative revocation on its next access check; hosted/device evidence is still required.
- Say **“common small-business teams”**, not “teams of any size.” Staff listing and the private store assignment projection are intentionally store-scoped, bounded SMB owner workflows, not an enterprise directory product.
- Say **“role-based access”**, not “complete security.” Authentication, provider configuration, deployment, device behavior, and owner credential hygiene remain separate boundaries.

## Do Not Claim

- HR, payroll, shifts, attendance, workforce scheduling, employee records, or performance management.
- Enterprise IAM, SCIM, SSO administration, directory sync, temporary access grants, approval workflows, or audit-log certification.
- SOC 2, GDPR, PCI, legal compliance, or breach prevention guarantees.
- Automatic recovery or adoption of an existing Firebase Auth identity. Email collisions fail closed for support review.
- Unlimited scale, zero-cost operation, or current production certification based only on local source gates.

## Required Evidence Before Launch Claims

The approved app bundle must be released to QA, then the owner/manager/staff/custom-role matrix must pass on hosted desktop and MobileShell. Firebase Auth email setup, passcode reset, force-sign-out, revoked sessions, inactive/deleted tenant/store access, owner-target refusals, and collision/retry behavior require target evidence recorded through the release process.
