# MenuList Staff, Roles, Locations, And Outlet Policy Support

**Verified:** 2026-07-20 against current roles, staff mutation, master/outlet, billing-scope, location-identity, and ownership-transfer boundaries.

## Roles

Roles control what each team member can see and do in the MenuList dashboard.

Default roles:

- Owner: full operational access to the store surfaces allowed by current account and subscription state.
- Manager: operations access including menu, publishing, sharing, feedback, analytics, staff, and screens; no billing or public identity changes.
- Staff: minimal access, mainly customer chat.
- Custom: owner-defined permissions.

Features a user cannot access should be hidden rather than shown as broken.

Assigning the Owner role does not transfer business-account ownership, billing records, notification recipients, or existing subscriptions.

## Staff Access

Owners can add users from Users. Staff may be invited by email, or given Staff ID/passcode when they do not have email.

If a staff member loses access, the owner can reset password/access from Users. MenuList does not reveal the old password.

## Changing Roles

Owners or users with the right permission can change a user's role. The affected user may need to refresh or sign in again.

## Locations And Outlets

Stores represent physical business locations. Multi-outlet accounts use an HQ/master store and outlet stores.

Core concepts:

- Master menu: managed by HQ.
- Outlet menus: linked copies that inherit from the master.
- Local overrides: outlet-specific price or availability changes.
- Outlet policy: HQ controls what outlets can change.
- Location identity: each store/outlet remains a distinct location. An optional owner-confirmed external Place ID/Maps URI can be stored on that exact location; it is reversible, internal, and does not merge locations or make provider data canonical.

## Common Support Questions

### Why can't an outlet edit a field?

The outlet policy may block that action. Ask HQ/owner to check Locations and outlet policy settings.

### Why did the master update not change an outlet price?

The outlet may have a local override. Remove the override to inherit the master price again.

### How do I add an outlet?

Go to Locations, add outlet, review billing impact, and confirm. The new outlet receives linked menu copies from the master.

### How do I deactivate an outlet?

Go to Locations, choose the outlet, deactivate, and confirm. Billing impact should be reviewed before confirming.

### Can two similar locations be merged automatically?

No. Similar names, phone numbers, or addresses are not enough to merge locations. MenuList keeps location identity exact and reviewable. External bindings do not propagate from HQ to outlets.

## Answerlattice Boundary

Do not bypass permissions. If a user lacks access, Answerlattice should explain the likely permission issue and route them to the owner/admin.

Ownership-transfer, billing-authority, duplicate-location, wrong-Place-ID, and disputed-account questions require support review.
