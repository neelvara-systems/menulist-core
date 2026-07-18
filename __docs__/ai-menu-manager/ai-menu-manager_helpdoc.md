# Menu Manager - Help Documentation

**Status:** Draft owner help article
**Public naming note:** Public website and launch copy use "AI Menu Manager". In-app help may use "Menu Manager" when referring to the owner navigation label.
**Last Updated:** July 16, 2026

---

## Quick Summary

Menu Manager lets you tell MenuList what changed in your menu. MenuList prepares the update, shows a card, and applies supported changes after approval when approval is needed.

You can also ask about the selected menu, such as what needs fixing or which items have no photos. Menu Manager answers from that selected menu only and does not change anything from an answer card.

If you leave a prepared card unfinished overnight, Menu Manager keeps that card available the next day for the same menu. Review, approve, edit, or cancel it as usual; MenuList does not apply it automatically.

---

## Getting Started

### Prerequisites

- You have a MenuList store.
- You have at least one menu project.
- You have permission to manage the menu.

### Open Menu Manager

1. Open your MenuList dashboard.
2. Go to **Menu Manager**.
3. Select the menu or outlet you want to work on.
4. Type what changed.

Screenshot: Menu Manager screen with menu selector and message box.

---

## Common Tasks

### Change A Price

1. Type the change, for example: `Tea is 20 now`.
2. Check the card.
3. Confirm the item and new price.
4. Select **Approve**.

Screenshot: Price update card.

### Mark An Item Sold Out

1. Type the item status, for example: `Cold coffee over`.
2. Check the item and customer-facing state.
3. Select **Approve**.

Screenshot: Sold-out card with before/after availability.

### Restore An Item

1. Type the item is back, for example: `Cold coffee is back`.
2. Check the card.
3. Select **Approve**.

### Change Menu Style

1. Type the style you want, for example: `Make my menu look premium`.
2. Check the preview card.
3. Select **Approve**, or select **Edit** to prepare a different style.

Screenshot: Menu style preview card.

### Check What Needs Attention

1. Type a menu question, for example: `What should I fix today?`, `Which items have no photos?`, or `Is this menu ready to share?`.
2. Read the answer card.
3. Select a suggested next message if useful, then send it when ready.

Answer cards are read-only. They do not change your menu and do not need approval.

### Prepare An Item Image Request

1. Type the item image request, for example: `Generate image for masala tea`.
2. Menu Manager shows a draft/review card when image actions are available for the selected menu.
3. The menu image does not change until you explicitly choose to use an approved image.

If the image adapter is not available, use the existing image or asset screen.

### Prepare A Menu Upload Or Import

Menu Manager can prepare an import or review handoff when upload/import actions are available. Uploaded or linked menu content must stay in review until you approve the extracted changes.

If the AMM import adapter is not available, use the existing menu upload/import screen.

---

## Approval Cards

Some changes need approval before they apply.

Examples:

- price changes
- deleting or archiving items
- supported MenuList publishing
- applying to all outlets
- rollback, only when undo is supported for that action
- creating rules, only when the rule adapter is available

The card shows what will change before you approve.

---

## Receipts

After a change applies, Menu Manager shows a receipt.

A receipt shows:

- what changed
- where it was applied
- whether the prepared work applied or failed

---

## Troubleshooting

### Menu Manager found the wrong item

Select **Edit** or **Choose another item** on the card. Do not apply the card if the item is wrong.

### A card says approval is needed

Check the before/after details. Select **Approve** only if the card is correct.

### Image generation did not create a useful image

Select **Edit** to prepare another request or **Cancel** the card. You can also upload a real item photo through the existing image flow.

### Upload review is asking questions

MenuList asks only when it cannot safely decide. Answer the card question or cancel the upload review.

### A publish task says manual action is needed

Direct external updates are shown as unsupported. Menu Manager leaves MenuList truth unchanged and does not claim that the external destination was updated.

### Menu Manager says a question is out of scope

Menu Manager only handles selected-menu work and selected-menu questions. Weather, news, sports, and unrelated questions are not answered here.

---

## Tips

- Type the change the same way you would tell a staff member.
- Use item names from your menu when possible.
- For outlet changes, include the outlet name.
- Do not approve a price card unless the before/after values are correct.
- Use real food photos when you have them.

---

## Need More Help?

Contact MenuList support from your dashboard or WhatsApp support channel.
