# Multi-Chain Permissions — Help Documentation

**Last Updated:** May 19, 2026

## Quick Summary

MenuList uses a two-layer permission system for chains:

1. **Staff Roles** — What each person can do (Owner, Manager, Staff, or custom roles)
2. **Outlet Policy** — What each store location can do (15 toggles controlled by HQ)

Both layers work together: a staff member can only do something if their role allows it AND the store's outlet policy allows it.

---

## How-To Guides

### How to set outlet policies (what stores can do)

1. Go to **Locations** (desktop sidebar or mobile **More** → **Locations**)
2. Scroll to the **Outlet Policy** card
3. Toggle each policy on/off across 5 categories:

**Override Control** — What outlets can change on inherited menu items:

- Price Override, Availability Override, Description Override, Image Override

**Local Content** — What outlets can add on their own:

- Local Items, Local Categories, Local Menus (projects), Deactivate Menus (projects)

**AI Features** — Credit-consuming tools (affects your billing):

- Menu Extraction, AI Descriptions, AI Images

**Branding** — Visual identity controls:

- Theme/Colors, Brand Identity, Layout

**Language** — Multi-language controls:

- Add Languages

4. Changes save to your account immediately. Outlet staff will see the updated permissions when they next refresh or log in.

### How to set staff roles (what people can do)

1. Go to **Settings** → **Team Management**
2. Select a team member
3. Assign one of the default roles:
   - **Owner** — Full access to everything
   - **Manager** — Most features except billing, branding, and role assignment
   - **Staff** — Chat support only
4. Or create a **Custom Role** with specific permissions

### How the two layers interact

A staff member's effective permissions = their role permissions AND the store's outlet policy.

**Example:** If a Manager has `canGenerateImages: true` but the store's outlet policy has `canGenerateImages: false`, that manager cannot generate images at that store.

**HQ users are exempt** — staff at the master (HQ) store are never restricted by outlet policy.

---

## Troubleshooting

### Outlet staff can't access a feature they need

**Check two things:**

1. Is the feature enabled in the store's **Outlet Policy**? (Locations → Outlet Policy card)
2. Does the staff member's **role** allow it? (Settings → Team Management)

Both must be enabled for the feature to appear.

### I want to restrict a specific user, not the whole store

**Use staff roles.** Create a custom role with only the permissions that person needs, and assign it to them.

### I changed the outlet policy but the user still has the old permissions

**The user needs to refresh or re-login.** Outlet policy changes apply on the next session load, not instantly for active sessions.

---

## Tips

- Start with the defaults — they're conservative and safe for most chains
- Only enable AI image generation for stores that need it — it consumes credits
- Keep branding locked unless an outlet has a genuinely different brand identity
- Use custom roles if the 3 default roles don't fit your team structure
- **Keep "Availability Override" enabled** (the default) — if you disable it, your outlets can't mark items as sold out, which means customers might try to order unavailable items

## Related Features

- **[Multi-Outlet Consistency]** — How master/outlet menus stay in sync
- **[Roles & Permissions]** — Full details on staff roles and the 23 permission flags
- **[Stores Management]** — Store creation and configuration

## Need More Help?

- **Email:** support@menulist.ai
