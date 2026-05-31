# Owner Operations, Staff, Mobile, And Multi-Location

## Multi-Outlet Consistency

MenuList supports a master/outlet model for multi-location businesses.

The business problem is menu drift across locations: item names differ, prices change silently, and customers see different truth at different outlets.

The solution is a master menu with outlet inheritance and outlet-specific overrides where allowed.

Evidence:

- `__docs__/multi-outlet-consistency/README.md:1`
- `__docs__/multi-outlet-consistency/README.md:47`
- `__docs__/multi-outlet-consistency/README.md:51`
- `__docs__/multi-outlet-consistency/README.md:53`
- `__docs__/multi-outlet-consistency/README.md:121`

## Staff Roles And Permissions

MenuList staff access is based on simple role-based permissions.

Current implementation includes:

- staff list/create/update/remove;
- staff password reset/passcode flow;
- owner force sign-out;
- role create/update/deactivate;
- desktop and mobile staff management through the same API contract;
- route and screen gates based on permissions;
- default owner, manager, and staff roles.

Evidence:

- `__docs__/roles-permissions/README.md:1`
- `__docs__/roles-permissions/README.md:15`
- `__docs__/roles-permissions/README.md:19`
- `__docs__/roles-permissions/README.md:46`

## Mobile Owner Operations

MenuList owner flows must work for phone-first SMB operators.

Mobile is not a separate product. It inherits auth, settings, localization, and shared contracts where possible. Mobile surfaces should stay focused on frequent, fast, owner-useful actions.

Examples that matter for Canonica asset planning:

- public menu preview;
- upload/review flow;
- share/QR flow;
- dashboard proof;
- staff actions;
- owner correction flows.

## External Menu Sync

External Menu Sync lets MenuList share official menu updates with a trusted connected system through signed full-menu snapshots.

The correct claim is:

```text
MenuList sends a signed full-menu snapshot to a connected provider/developer URL after approved menu-affecting changes.
```

Avoid:

- works with any POS;
- real-time sync;
- universal POS connector;
- automatic external-platform mutation.

Evidence:

- `__docs__/pos-webhook-sync/README.md:1`
- `__docs__/pos-webhook-sync/README.md:14`
- `__docs__/pos-webhook-sync/README.md:18`
- `__docs__/pos-webhook-sync/README.md:26`

## Canonica Support Questions This Source Should Answer

- How does MenuList handle multiple locations?
- Can outlet menus differ from the master menu?
- What can staff users do?
- Can the owner remove staff access?
- Does mobile support the same owner workflow?
- What is External Menu Sync?
- What POS or sync claims are not allowed?

