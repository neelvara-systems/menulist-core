# MenuList Public Menu, QR, Sharing, And Official Business Page Support

**Verified:** 2026-07-20 against current public retrieval, stored-slug routing, QR destinations, Official Business Page projection, public localization, and cache revalidation.

## Core Truth

The public digital menu is what customers see when they scan the restaurant's QR code. It shows menu items, prices, categories, and availability from MenuList's current approved menu data.

The Official Business Page is a public business link with business identity, photos, rating fields, open/closed status, contact actions, and a button to view the full menu.

## Public Menu Support

Owners should use Projects to edit their menu. When changes are saved and the menu is active, the public menu updates after a short cache window.

Common public menu topics:

- menu not showing latest change;
- item sold out or hidden;
- price mismatch;
- wrong category order;
- menu not found;
- custom domain not ready;
- QR points to the wrong destination;
- customer sees old data due to cache or an open app/session.

## QR And Sharing

MenuList supports share and menu destinations:

- Menu QR: sends customers directly to the menu.
- Share QR: sends customers to the Official Business Page.
- Owners can copy links, download QR codes, and share ready messages.

QR support should focus on simple checks:

1. Scan the QR from a phone.
2. Confirm the URL is the expected MenuList or approved custom domain.
3. Confirm the business name is correct.
4. Confirm the menu is active.
5. Confirm no sticker or printed material was tampered with.

## Official Business Page Support

The Official Business Page can show:

- business name and logo;
- cover image and business photos;
- short description and known-for text;
- price range, area, service modes, and amenities;
- open/closed state and hours;
- Google rating fields if entered by the owner;
- menu button;
- call, WhatsApp, directions, reviews, feedback, reserve, and order actions when enabled;
- address, weekly hours, social links, and freshness signal.

Business information comes from Business Settings and updates automatically after saving, usually within about a minute.

Saved public links use stable stored slugs and supported previous-slug redirects. Renaming a menu should not be treated as permission to replace printed QR assets blindly; owners should still scan-test the printed destination.

## Answerlattice Must Be Conservative

Do not promise instant global cache invalidation. Use "wait up to 60 seconds" or "wait 1-2 minutes" depending on the surface. If data remains wrong after that, escalate.

Do not claim Google, delivery apps, or third-party sites update automatically unless the specific integration is verified for that account.
