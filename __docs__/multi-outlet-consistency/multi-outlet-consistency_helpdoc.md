# Multi-Outlet Consistency — Help Documentation

**Last Updated:** May 19, 2026

## Quick Summary

Multi-outlet lets you run multiple store locations from one master menu. Update the master, and linked outlets receive the saved changes through the current sync/cache path. Each outlet can make local adjustments (prices, availability) without affecting the master. HQ controls what each outlet is allowed to change via outlet policies.

---

## Getting Started

> **Terminology:** In MenuList, your menus are called **"Projects"** in the dashboard. When this guide says "menu", we mean the project you see in the **Projects** section of your sidebar.

### Prerequisites

- A MenuList account with multiple stores set up
- At least one menu designated as the "master"
- Multi-outlet feature enabled for your account

### How It Works

1. **Master Menu** — Your main menu, managed by HQ/head office (found under **Projects** in the dashboard)
2. **Outlet Menus** — Each store gets a linked copy that inherits from the master
3. **Automatic Sync** — When you edit the master, all outlets get the changes
4. **Local Overrides** — Outlets can adjust prices or mark items unavailable locally

---

## How-To Guides

### How to set up a master menu

1. Go to **Projects** and create a new menu in your main store
2. This menu becomes the **master** — all outlets will inherit from it
3. Add all your items, categories, and descriptions
4. Your first store becomes the master (HQ) when you add your first outlet

### How to add a new outlet

1. Go to **Locations** (desktop sidebar or mobile **More** → **Locations**)
2. Click **Add Outlet**
3. Enter the outlet name (e.g., "Downtown Branch")
4. Review the billing impact — you'll see the prorated charge for the current cycle
5. Click **Add Outlet** to confirm
6. The new outlet automatically gets copies of all your master menus

### How to view and manage all locations

1. Go to **Locations** (desktop sidebar or mobile **More** → **Locations**, visible only for HQ accounts)
2. You'll see the **Chain Control Panel** with:
   - Billing summary (cost per store, total chain cost)
   - A table of all your stores with status
3. Click **View** on any outlet to switch to that store's context

### How to switch between stores

1. Use the **store switcher dropdown** in the header on desktop, or open **Locations** on mobile (visible for HQ accounts)
2. Select the store you want to view
3. A yellow banner will appear: "You are viewing [outlet name]"
4. Any changes you make only affect that outlet
5. Click **Back to HQ** to return to your main store

### How to make local price adjustments at an outlet

1. Log into the outlet store's dashboard
2. Go to **Projects** → select the linked menu
3. Find the item you want to adjust
4. Change the price — this only affects THIS outlet
5. Click **Save**
6. The master menu is NOT affected

### How to mark an item as unavailable at one location

1. At the outlet, go to the Editor
2. Toggle the **Available** switch to OFF for the item
3. Click **Save**
4. Other outlets and the master are NOT affected

### How to update all outlets at once

1. Edit the **master** menu (under **Projects** in your HQ dashboard)
2. Make your changes (add items, change descriptions, update prices)
3. Click **Save**
4. Linked outlets receive the saved changes through the current sync/cache path

---

## Troubleshooting

### Outlet menu doesn't reflect master changes

**Why:** Outlet sync and customer menu cache refresh can take up to 60 seconds.
**Fix:** Wait 60 seconds and check again. If still not updated, refresh the outlet's Editor.

### I changed something on the master but outlet shows old price

**Why:** The outlet may have a local price override that takes priority.
**Fix:** Check if the outlet has a local override for that item. Remove the override to inherit the master price.

### I can't edit certain items at the outlet

**Why:** HQ controls what outlets can do via **outlet policies**. Some actions (e.g., changing prices, adding items, using AI tools) may be disabled for your store.
**Fix:** Ask your HQ/owner to check the outlet policy settings in **Locations** → **Outlet Policy**.

### How do I deactivate an outlet?

1. Go to **Locations** (desktop sidebar or mobile **More** → **Locations**)
2. Find the outlet in the store list
3. Click or tap **Deactivate**
4. Confirm — the outlet is deactivated and billing adjusts automatically

---

## Tips

- Keep the master menu as the "source of truth" — only edit the master for brand-wide changes
- Use local overrides sparingly — too many overrides defeat the purpose of consistency
- When adding new items, add them to the master — they'll appear at all outlets automatically
- Outlet-specific items should be added directly at the outlet level
- Configure outlet policies early — they control what each store can change

## Related Features

- **[Multi-Chain Permissions]** — Outlet policies and staff roles for chain-level control
- **[Roles & Permissions]** — Staff roles (Owner, Manager, Staff, custom)
- **[Stores Management]** — Set up and configure store locations
- **[Data Editor]** — Edit items in master or outlet menus
- **[Client Menu]** — How customers see the merged menu

## Need More Help?

- **Email:** support@menulist.ai
