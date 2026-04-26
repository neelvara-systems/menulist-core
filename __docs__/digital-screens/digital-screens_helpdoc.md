# Digital Screens — Help Documentation

**Last Updated:** February 8, 2026

## Quick Summary

Digital Screens puts your menu on any TV or screen in your shop. You get two display modes from one system:

- **Menu Board** (default) — your full menu with categories, items, and prices
- **Highlights** — rotating promotional slides with featured items

Both update automatically. You never manage screen content separately — it comes from your menu data.

---

## Getting Started

### What You Need

- A TV, tablet, or any screen with a web browser
- Internet connection for the screen
- An active MenuList account with at least one menu

### How to Set Up (One TV)

1. Go to **Settings** → **Digital Screen** in your MenuList dashboard
2. Copy the **Menu Board** link (this is your default — shows your full menu)
3. Open that link in the browser on your TV
4. Press **F11** for fullscreen
5. Bookmark it so it opens automatically when the TV turns on
6. Your full menu with prices appears immediately. Done.

### How to Set Up Two TVs (Menu Board + Highlights)

If you have two screens — e.g., one above the counter and one in the waiting area:

1. Go to **Settings** → **Digital Screen**
2. You'll see two links:
   - **Menu Board** — `yourstore.menulist.com/screen/abc123`
   - **Highlights** — `yourstore.menulist.com/screen/abc123?mode=highlights`
3. Open the **Menu Board** link on your **counter TV** (shows full menu with prices)
4. Open the **Highlights** link on your **waiting area TV** (shows rotating promotions)
5. Bookmark both. Press F11 for fullscreen on each.
6. Both screens update automatically. You never touch them again.

Both links always follow your store's current active menu automatically. You do not need to assign a project to the screen.

---

## How Your Screen Content Works

### Menu Board — What shows and why

The Menu Board displays your **full menu** automatically:

- **Categories** — from your menu structure in the Editor
- **Items** — all available items, grouped by category
- **Prices** — from your menu data
- **Availability** — sold-out items disappear automatically
- **Pages** — if your menu is large, pages rotate automatically

**You don't choose what appears.** The screen shows whatever is in your menu right now.

### Highlights — What shows and why

The Highlights screen shows rotating promotional slides:

- **Featured items** — system picks your best items with images
- **Campaign items** — if you have an active campaign
- **Your uploads** — custom images you add (max 3, expire after 14 days)
- **QR code** — so customers can scan and see your full digital menu

**You don't choose the rotation order.** The system handles it.

### How to update what's on screen

**You don't update the screen. You update your menu.**

| What you do in MenuList | What happens on screen              |
| ----------------------- | ----------------------------------- |
| Add a new menu item     | Appears on Menu Board automatically |
| Mark item as sold out   | Disappears from both screens        |
| Change a price          | Updates on Menu Board automatically |
| Add a new category      | Appears on Menu Board automatically |
| Upload a custom image   | Appears on Highlights screen        |

Content management IS menu management. There is no separate "screen content" to manage.

---

## How-To Guides

### How to switch between Menu Board and Highlights

There is no toggle or setting. You use different URLs:

- **Menu Board:** `yourstore.menulist.com/screen/abc123` (default)
- **Highlights:** `yourstore.menulist.com/screen/abc123?mode=highlights`

Bookmark the one you need on each TV. That's it.

### How to upload your own images (Highlights only)

1. Go to **Settings** → **Digital Screen**
2. Click **Upload Image** (max 3 custom images)
3. Your image will appear in the Highlights rotation
4. Custom images automatically expire after 14 days
5. Menu Board is not affected — it always shows your full menu

### How to remove a custom image

1. Go to **Settings** → **Digital Screen**
2. Find the image in "Your Custom Slides"
3. Click the delete icon and confirm

### How to use only your own designs (Highlights only)

1. Go to **Settings** → **Digital Screen**
2. Toggle **"Use my designs only"** to ON
3. Only your uploaded images will show on the Highlights screen
4. Menu Board is not affected by this toggle

---

## Common Scenarios

### "I have a café with one TV above the counter"

Use the **Menu Board** link (default). Your full menu with prices shows automatically. When an item sells out, it disappears. When you add something new, it appears.

### "I have a restaurant with two TVs"

- **Counter TV** → Menu Board link (full menu with prices)
- **Entrance/waiting area TV** → Highlights link (rotating promotions + QR code)

### "I want to show a Diwali poster on my screen"

Upload the poster image in Settings → Digital Screen. It appears on the **Highlights** screen. After 14 days, it automatically expires. Your Menu Board is not affected.

### "I changed my prices but the screen still shows old prices"

The screen updates automatically within minutes. If it doesn't:

1. Check that you saved your edits in the Editor
2. Wait 2-3 minutes for the real-time update
3. If still wrong, refresh the TV browser manually

---

## Troubleshooting

### Screen is showing blank

1. Check that the screen has internet
2. Verify the screen URL is correct (copy it again from Settings)
3. Make sure your menu has active items
4. Refresh the browser on the screen
5. The screen shows a brand fallback (your store logo + QR code) — it should never be truly blank

### Content looks outdated

Content updates automatically when you make changes in the Editor. If changes aren't showing:

1. Check that you saved your edits
2. Wait a few minutes for the real-time update
3. If needed, refresh the TV browser manually

### Screen works but then goes blank after a while

The screen automatically refreshes every 6 hours and caches data for offline use. If it goes blank:

1. Check the TV has a stable internet connection
2. The screen should recover automatically — it shows cached content even when offline

### Menu Board shows too many items / pages rotate too fast

The system auto-paginates for large menus. Page timing is system-controlled (15-20 seconds per page). This is not configurable — it's designed for readability.

---

## Tips

- **Counter TV** → Use Menu Board (full menu with prices)
- **Entrance/waiting area** → Use Highlights (rotating promotions)
- Use **landscape orientation** for best layout
- Keep your menu updated — screens pull from your live menu data
- Consider a dedicated cheap tablet if you don't have a TV
- No need to turn off the screen — it runs itself indefinitely

## Related Features

- **Client Menu** — Your QR code menu (same data, different display)
- **Data Editor** — Edit items that appear on screens
- **Projects** — Upload and manage your menu data

## Need More Help?

- **Email:** support@menulist.ai
