# Answerlattice Workspace Profile

## Status

Feature 29 is source-complete and locally verified as of 2026-07-19.

The workspace profile is the authenticated, tenant-scoped product identity and operating-time configuration used by Answerlattice settings, notification routing, the scheduler registry, and compiled runtime context.

## Owned Flow

`Settings profile form -> GET current profile and revision -> edit -> strict PUT validation -> exact AL workspace admission -> revision check -> atomic store, scheduler-registry, and compiled-context update -> strict browser acknowledgement`

## Product Boundary

This feature owns:

- product name and HTTP(S) product URL;
- support email;
- billing-model context;
- initial main-product-page labels;
- IANA workspace timezone;
- support-day end time;
- stale-editor protection and downstream synchronization.

It does not own widget configuration, product-surface mapping, workflow notifications, staff access, billing entitlement, or a generic settings framework. Those remain separate features even when linked from the same Settings screen.

## Documentation

- [Specification](./workspace-profile_spec.md)
- [Implementation](./workspace-profile_impl.md)
- [Firebase and cost](./workspace-profile_firebase.md)
- [Test cases](./workspace-profile_test-cases.md)
- [Mobile support](./workspace-profile_mobile-support.md)
- [Help](./workspace-profile_helpdoc.md)
- [Marketing boundary](./workspace-profile_marketing.md)
- [Website boundary](./workspace-profile_website.md)

## Primary Evidence

- `src/app/api/answerlattice/workspace-profile/route.ts`
- `src/components/templates/answerlattice/AnswerlatticeSettings.tsx`
- `src/lib/answerlattice/workspaceProfileContracts.ts`
- `src/lib/answerlattice/workspaceProfileServer.ts`
- `src/lib/answerlattice/tenantSummaryAdmin.ts`
- `src/lib/answerlattice/compiledSourceVersionsAdmin.ts`
- `scripts/verification/test-answerlattice-workspace-profile-contracts.ts`
- `scripts/verification/test-answerlattice-workspace-profile-emulator.ts`

## Version History

| Date | Version | Change |
|---|---:|---|
| 2026-07-19 | 1.0.0 | Added the dedicated dossier after the full Feature 29 flow audit and hardening. |
