# Account And Tenant Lifecycle Specification

## Requirements

1. One concurrent onboarding attempt owns tenant/store allocation.
2. Failed paid onboarding must not leave active tenant/store/user access.
3. Store switching is a scoped selection hint, never new authority.
4. Staff removal must revoke current access and disable the final membership.
5. Logout must end NextAuth even when Firebase sign-out fails, and must not
   leave previous tenant data visible to the next browser user.
6. Device preferences such as language, theme, consent, and PWA installation
   may survive logout; authenticated identity, selected outlet, owner caches,
   processing state, and captured session logs may not.
7. Destructive owner-account requests require verified identity and business
   authority plus subscription, shared-tenant, billing, dispute, security, and
   retention checks.

## Non-goals

- No one-click cascade deletion.
- No claim that menu JSON/XLSX is a complete personal-data export.
- No new Firestore collection, listener, scheduler, setting, or deletion queue.
