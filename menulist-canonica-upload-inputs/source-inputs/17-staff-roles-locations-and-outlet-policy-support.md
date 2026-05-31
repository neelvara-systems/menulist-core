# MenuList Staff, Roles, Locations, And Outlet Policy Support

## Roles

Roles control what each team member can see and do in the MenuList dashboard.

Default roles:

- Owner: full access including billing, staff, roles, public presence, integrations, menu, analytics, and store management.
- Manager: operations access including menu, publishing, sharing, feedback, analytics, staff, and screens; no billing or public identity changes.
- Staff: minimal access, mainly customer chat.
- Custom: owner-defined permissions.

Features a user cannot access should be hidden rather than shown as broken.

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

## Common Support Questions

### Why can't an outlet edit a field?

The outlet policy may block that action. Ask HQ/owner to check Locations and outlet policy settings.

### Why did the master update not change an outlet price?

The outlet may have a local override. Remove the override to inherit the master price again.

### How do I add an outlet?

Go to Locations, add outlet, review billing impact, and confirm. The new outlet receives linked menu copies from the master.

### How do I deactivate an outlet?

Go to Locations, choose the outlet, deactivate, and confirm. Billing impact should be reviewed before confirming.

## Canonica Boundary

Do not bypass permissions. If a user lacks access, Canonica should explain the likely permission issue and route them to the owner/admin.

