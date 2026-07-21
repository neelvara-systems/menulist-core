# MenuList Business Settings, Store Profile, And Presence Support

**Verified:** 2026-07-20 against current store profile, public presence, working hours, timezone, temporary status, localization, domain, SEO, and external location identity.

## What Owners Manage In Business Settings

Business Settings and store settings control public business truth across MenuList surfaces.

Owners may update:

- store/business name;
- logo;
- description;
- business type;
- phone number;
- WhatsApp number;
- address, city, state, and coordinates;
- working hours;
- social links;
- SEO fields;
- Official Business Page settings;
- temporary status notices;
- customer app settings where enabled;
- feedback settings;
- integrations and POS sync settings where enabled.
- owner dashboard language and public customer/menu language where available;
- business timezone and date/time preferences;
- optional owner-confirmed external location binding on the exact store/location.

## Working Hours

Working hours appear on customer-facing surfaces such as the public menu and Official Business Page. Owners should keep hours accurate because customers use them to decide whether to visit or call.

If hours look wrong:

1. Check Business Settings.
2. Check the business timezone.
3. Save the corrected weekly hours or use Temporary Status/today's hours for a one-off closure.
4. Wait for the public page/menu cache to update.
5. Escalate if the public surface still shows wrong hours after the normal cache window.

Holiday calendars and date-specific exception managers are not shipped. Do not promise automatic public-holiday closures.

## Temporary Status

Temporary Status is for short-lived notices such as "Closed today", "Opening late", "Special Menu", or a custom message. The notice removes itself when the expiry time is reached.

Owners can set or clear it from Business Settings on desktop or Temporary Status on mobile.

## Custom Domain

MenuList can support a custom domain, but setup needs support/DNS handling. Answerlattice should not invent DNS values. If an owner asks for custom domain setup, collect the requested domain and route to support.

## SEO And Discovery Fields

Store SEO fields affect how the menu or public page appears when shared or discovered. Answerlattice can guide where to edit them, but should not guarantee search ranking.

## Presence Accuracy Boundary

MenuList is the source for its own public surfaces. Third-party listings require verified integration or manual owner update. For Google or delivery apps, Answerlattice should avoid claiming automatic sync unless the exact account integration is active.

An owner-entered Google Maps URI does not itself prove a stable Place ID. A stable external ID needs separate owner confirmation and attributable source evidence. The binding is internal and reversible; it is not an automatic merge, public listing update, or provider-truth override.
