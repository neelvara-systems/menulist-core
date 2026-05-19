# Roles & Permissions — Help Documentation

**Last Updated:** May 19, 2026

## Quick Summary

Roles control what each team member can see and do in your MenuList dashboard. Every user gets one role per store. Features they can't access are hidden — not shown as disabled.

---

## Available Roles

| Role        | Access Level | Key Capabilities                                                                              |
| ----------- | ------------ | --------------------------------------------------------------------------------------------- |
| **Owner**   | Full access  | Billing, staff, roles, public presence, integrations, menu, analytics, and store management   |
| **Manager** | Operations   | Menu, publishing, sharing, feedback, analytics, staff, and screens — no billing or public identity changes |
| **Staff**   | Minimal      | Customer chat only                                                                            |
| **Custom**  | Configurable | Owner creates custom roles with specific permissions (29 toggles)                             |

---

## How-To Guides

### How to invite a team member

1. Go to **Users**
2. Click **Add User**
3. Enter their name
4. Enter email only if the staff member has their own email
5. Select their role (Owner, Manager, Staff, or a custom role)
6. Save the user

If email is provided, MenuList sends a password setup email and the staff member signs in with that email.

MenuList also creates a Staff ID for the staff member. If email is left blank, MenuList shows a temporary **Passcode** once. Share those details with the staff member. They sign in from the normal MenuList sign-in page using Staff ID or phone and the passcode.

### How to reset staff access

1. Go to **Users**
2. Find the staff member
3. Click **Reset password**
4. Confirm the action
5. MenuList shows a new temporary passcode once
6. The staff member can sign in with their email, Staff ID, or phone using that passcode

Owners can reset staff access, but MenuList does not show the existing password.

### How to change someone's role

1. Go to **Users**
2. Find the user
3. Click their current role
4. Select the new role
5. Save — changes apply on their next login

### How to create a custom role

1. Go to **Users** → **Roles**
2. Click **Add Role**
3. Name the role (e.g., "Kitchen Manager")
4. Toggle the 29 permissions on/off as needed
5. Save — the new role is now available for assignment

### How to remove a team member

1. Go to **Users**
2. Find the user
3. Click **Remove**
4. Confirm removal

---

## Troubleshooting

### A team member can't access a feature

**Check two things:**

1. Does their **role** allow it? (Settings → Team → check their role's permissions)
2. If you're running multiple stores: is the **outlet policy** allowing it? (See [Multi-Chain Permissions help](../multi-chain-permissions/multi-chain-permissions_helpdoc.md))

### I can't change roles

Your role must include **Assign Roles**. Contact the account owner.

### I changed a role but the user still has old permissions

**The user needs to refresh or re-login.** Permission changes apply on the next session load.

### A new staff member did not receive the setup email

If they use email, ask them to open the login page and use **Forgot password**, or reset their access from **Users**.

If they do not use email, click **Reset password** in **Users** and share the new Staff ID/passcode details shown on screen.

---

## Tips

- Give staff the minimum access they need — it prevents accidents
- Use Manager role for daily operations, Owner role for configuration
- Create custom roles if the 3 defaults don't fit (e.g., "Kitchen Manager" with menu-only access)
- Review team access periodically — remove people who no longer work with you

## Related Features

- **[Multi-Chain Permissions]** — Store-level outlet policy (for multi-outlet chains)
- **[Stores Management]** — Where store-level settings live

## Need More Help?

- **Email:** support@menulist.ai
