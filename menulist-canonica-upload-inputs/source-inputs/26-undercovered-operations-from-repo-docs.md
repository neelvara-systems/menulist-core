# MenuList Undercovered Operations From Repo Docs

## Purpose

This source captures operational features that were underrepresented in the earlier Canonica inputs but are present in MenuList docs and public website content.

## Special Menu Switching

Special menus are for festivals, events, seasons, brunches, or temporary offerings. The owner can create a separate special menu, schedule start/end times, and let the regular menu return automatically.

Support facts:

- Regular menu should stay safe.
- Only one special menu can be active at a time.
- Overlapping schedules are blocked.
- QR, public page, and digital screens should show the active menu during the special period.
- If the regular menu looks changed after a special menu ends, escalate.

## Menu Intake Identity

MenuList may warn before processing uploaded menu files when the upload looks like the wrong menu for the current business or outlet.

Support facts:

- It may flag a different menu, another outlet, a special menu, non-menu pages, or an incomplete menu.
- The owner can still continue when the upload is correct.
- If only some files are menu pages, MenuList can process the menu pages and ignore the rest.
- If the upload shows a different business name, phone, address, or business type, MenuList may ask whether to save those details.
- Canonica should explain that the check prevents the wrong menu from being added to the wrong place; it should not tell owners to ignore mismatch warnings without review.

## Use MenuList Rollout Surface

Use MenuList is the owner surface for placing the approved menu into real business operations.

Support facts:

- Owners can copy the menu link for WhatsApp, Instagram bio, Google Business Profile, packaging, or website use.
- Owners can copy a Menu Board or screen link for a TV/browser display.
- Owners can download print assets or the complete Menu Kit.
- QR placements include tables, counter, entrance, and feedback surfaces.
- Existing QR materials keep pointing to the updated menu after menu changes, but owners should still test QR scans after printing.

## Staff Prompt

Staff Prompt is a simplified staff-facing menu reference.

Support facts:

- It helps staff answer questions about current prices, availability, popular items, descriptions, dietary notes, and tags.
- Staff can search the menu during service.
- If it looks stale, refresh the page.
- If staff cannot access it, check the user's role or ask the manager/owner to update access.
- Staff Prompt should not be treated as a customer-facing public page.

## Client Menu Retrieval And Offline Behavior

The public customer menu can handle common spelling variations in menu search.

Support facts:

- Search uses the menu information the owner has published.
- If the connection is unavailable, customers should see a clear offline/reconnect screen.
- MenuList should not show an old saved copy of the menu because prices, items, and availability may have changed.
- No owner action is normally needed for this retrieval behavior.

## Hours And Holiday Accuracy

MenuList shows open/closed status from working hours configured in store settings.

Support facts:

- Owners set working hours in Store Settings.
- The public menu can show Open now or Closed based on current time and configured hours.
- If the badge is wrong, check working hours and timezone first.
- Holiday closures are documented as coming soon in the repo helpdoc, so Canonica must not claim holiday exceptions are fully available unless the live UI proves they are enabled.

## URL Permanence And Routing

MenuList public URLs are designed so printed QR codes and shared links do not silently break after common menu or outlet changes.

Support facts:

- Stored project slugs and previous-slug redirects support old menu links after a rename.
- Brand-level subdomains and outlet path routing support multi-location public URLs.
- Custom domain setup is account-specific and should be escalated when DNS values, verification errors, redirects, or billing/account ownership questions are involved.
- Product domains such as Canonica and MyCodex are separate from MenuList tenant/customer routing.

## Editor UX Support Context

The menu editor includes owner-facing guidance such as first-time welcome guidance, save status, simpler terminology, collapsed advanced options, and visual price override context for outlets.

Canonica can explain visible editor states in plain language, but it should not invent hidden settings or claim that dismissed onboarding guidance changes menu data.

## Presence Monitor

Menu Presence Monitor helps owners check where the menu has been placed:

- Google Business;
- Instagram bio;
- WhatsApp profile;
- table QR;
- digital screens;
- feedback QR.

The owner can copy the link, place it on the outside surface, then mark that surface as added. This is a checklist, not a guarantee that Google or social platforms will rank or display the link.

## Customer Communication Kit

Customer Communication Kit gives ready-to-send messages using the business menu link, address, phone, and hours.

Examples:

- Send Menu;
- Menu + Location;
- Quick Reply;
- Business Info;
- Share with Staff.

Owners can copy a message or send through WhatsApp where supported. The purpose is to stop staff from sending old PDFs or typing inconsistent replies.

## Menu Quality Signals

Menu Quality Signals help owners notice missing or weak menu content:

- missing descriptions;
- missing images;
- missing prices;
- oversized categories.

Signals should point to the action that fixes the issue. If price checks are hidden because prices are disabled in menu design, no action is needed for that check.

## Menu Trust Signals

Customer-facing menus can show trust/freshness signals:

- business name/logo;
- Official Menu or equivalent badge;
- Updated today/this week/recently where applicable.

If a menu has not been updated recently, freshness may be hidden while the official badge remains.

## Media Image Support

MenuList prepares images before saving them by resizing, framing, and compressing. Supported owner-facing image types include JPG, PNG, and WebP where upload limits allow.

If an image is rejected, likely reasons include unsupported format, corrupt/empty file, unsafe file, or over-limit size.

## External Menu Sync

External Menu Sync lets MenuList send official approved updates to a trusted connected provider, developer, agency, website, or ordering system.

Support facts:

- Owner should use it only when a provider or developer asked to connect.
- The provider supplies the connection URL.
- MenuList can test the connection.
- Signed updates can be sent after approved menu changes.
- Connected systems receive updates from MenuList but should not overwrite MenuList as the official source.
- If MenuList delivery succeeds but the provider still shows old data, the provider must check its side.

## Canonica Boundary

These features are real support topics, but several are account-state or flag-sensitive. Canonica should answer with "where to check" and "what the feature does", then escalate when:

- the feature is missing from the owner's plan/account;
- a public customer surface is wrong;
- an external provider is involved;
- a paid/billing impact exists;
- data deletion, privacy, or security is involved.
