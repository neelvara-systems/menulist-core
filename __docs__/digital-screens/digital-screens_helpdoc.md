# Digital Screens — Help Documentation

**Last Updated:** July 29, 2026

## Source Gate

Help copy must tell owners that saved MenuList changes refresh screens through public cache invalidation and the screen content-version listener. Do not promise instant or absolute freshness. Guard with `npm run verify:digital-screens-boundary`.

The TV link is a private bearer link stored in MenuList's server-only private control. Only roles with permission to manage Digital Screens can reveal or change it. Do not post the link publicly.

## Quick Summary

Digital Screens puts your menu on any TV or screen in your shop. You get two display modes from one system:

- **Menu Board** (default) — your full menu with categories, items, and prices
- **Highlights** — rotating promotional slides with featured items

Both use your current MenuList menu source. Saved menu changes refresh connected screens through the screen update path; you never manage screen content separately.

---

## Getting Started

### What You Need

- A TV, tablet, or any screen with a web browser
- Internet connection for the screen
- An active MenuList account with at least one menu
- A role with permission to manage Digital Screens

### How to Set Up (One TV)

1. Go to **Settings** → **Digital Screen** in your MenuList dashboard
2. In **TV setup**, copy the **Menu Board** link (this is your default — shows your full menu)
3. Open that link in the browser on your TV
4. Press **F11** for fullscreen
5. Bookmark it so it opens automatically when the TV turns on
6. Your full menu with prices appears immediately. Done.

Before the first TV signal, status says **Link ready**. A recent daily signal says **Seen recently**. A signal older than the supported window says **Check TV**. These are operational hints, not a live heartbeat.

### How to Set Up Two TVs (Menu Board + Highlights)

If you have two screens — e.g., one above the counter and one in the waiting area:

1. Go to **Settings** → **Digital Screen**
2. In **TV setup**, you'll see two screen cards:
   - **Menu Board** — for your counter TV
   - **Highlights** — for your entrance or waiting-area TV
3. Open the **Menu Board** link on your **counter TV** (shows full menu with prices)
4. Open the **Highlights** link on your **waiting area TV** (shows rotating promotions)
5. Bookmark both. Press F11 for fullscreen on each.
6. Both screens follow saved MenuList changes through the same screen update path. You do not edit screen content separately.

Both links follow your store's current active menu source after saved changes and screen refresh. You do not need to assign a project to the screen.

---

## How Your Screen Content Works

### Menu Board — What shows and why

The Menu Board displays your **full menu** from the current MenuList source:

- **Categories** — from your menu structure in the Editor
- **Items** — all available items, grouped by category
- **Prices** — valid prices from your menu data. If a price is missing or unclear, the board shows `Ask` rather than inventing a value.
- **Availability** — sold-out items disappear automatically
- **Pages** — if your menu is large, pages rotate automatically
- **TV fit** — page density adapts for 720p, 1080p, wide, and portrait screens; check the full rotation before opening service

**You don't choose what appears on the Menu Board.** It follows the saved menu source after the screen update path refreshes.

### Highlights — What shows and why

The Highlights screen shows rotating promotional slides:

- **Featured items** — system picks your best items with images
- **Campaign items** — if you have an active campaign
- **Your uploads** — custom images you add (max 3, expire after 14 days)
- **QR code** — so customers can scan and see your full digital menu

**You don't choose the rotation order.** The system handles it. Labels stay simple and factual, such as `Today`, `Popular`, `Featured`, a category name, or `On menu`.

Custom artwork is shown without center-cropping. The adjust step marks the safe area and the corners reserved for the customer QR and quiet attribution. Keep prices, dates, and offer terms inside that safe area.

### How to update what's on screen

**You don't update the screen. You update your menu.**

| What you do in MenuList | What happens on screen              |
| ----------------------- | ----------------------------------- |
| Add a new menu item     | Appears on Menu Board after save and screen refresh |
| Mark item as sold out   | Disappears from both screens        |
| Change a price          | Updates on Menu Board after save and screen refresh |
| Add a new category      | Appears on Menu Board after save and screen refresh |
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
3. Add a slide name so you can recognize it in your dashboard
4. Your image will appear in the Highlights rotation
5. The slide name is for your dashboard list. It is not placed over your poster on the TV.
6. Custom images stop appearing after 14 days; expired slides no longer use one of your three active slide spaces
7. Menu Board is not affected — it always shows your full menu

### How to remove a custom image

1. Go to **Settings** → **Digital Screen**
2. Find the image in "Your Custom Slides"
3. Click the delete icon and confirm
4. The slide leaves Highlights after the connected screen refreshes

### How to use only your own designs (Highlights only)

1. Go to **Settings** → **Digital Screen**
2. Toggle **Only custom slides** to ON
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

Saved changes normally refresh connected screens after public cache invalidation and the screen content-version listener. If a TV still shows old prices:

1. Check that you saved your edits in the Editor
2. Wait a few minutes for the screen cache/listener path to settle
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

Saved Editor changes refresh screens through public cache invalidation and the screen content-version listener. If changes aren't showing:

1. Check that you saved your edits
2. Wait a few minutes for the screen cache/listener path to settle
3. If needed, refresh the TV browser manually

### Screen loses its connection after it was already showing content

An already-loaded screen keeps its last valid content in memory/local storage and performs a six-hour health refresh. A TV browser opened from a fully cold state still needs a connection to load the screen page. If an already-running display stops updating:

1. Check the TV has a stable internet connection
2. Leave the loaded screen open; it keeps the last valid display while offline
3. When the connection returns, refresh the TV browser if it does not recover on its own

### Menu Board shows too many items / pages rotate too fast

The system auto-paginates for large menus. Page timing is system-controlled (15-20 seconds per page). This is not configurable — it's designed for readability.

---

## Tips

- **Counter TV** → Use Menu Board (full menu with prices)
- **Entrance/waiting area** → Use Highlights (rotating promotions)
- Use **landscape orientation** for best layout
- Keep your menu updated — screens pull from the saved MenuList source
- Consider a dedicated cheap tablet if you don't have a TV
- Leave the browser open during business hours; the display performs its own six-hour health refresh

## Related Features

- **Client Menu** — Your QR code menu (same data, different display)
- **Data Editor** — Edit items that appear on screens
- **Projects** — Upload and manage your menu data

## Need More Help?

- **Email:** support@menulist.ai
