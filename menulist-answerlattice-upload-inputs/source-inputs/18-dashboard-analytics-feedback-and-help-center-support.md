# MenuList Dashboard, Analytics, Feedback, And Help Center Support

**Verified:** 2026-07-20 against Today, Business Health, owner analytics read models, Guest Feedback, Help Center, and support-ticket boundaries.

## Owner Dashboard

Today is the primary day-to-day owner view. It uses current store/project truth plus compact read models and can show menu status, setup progress, public readiness, activity, analytics, and bounded action cards depending on account state. Historical views load only when needed.

Answerlattice should answer dashboard questions in plain owner language:

- what needs attention;
- where to click;
- what changed recently;
- whether the public menu/Official Business Page should be checked;
- when to contact support.

## Analytics

MenuList may show sessions, engaged/intent/action sessions, item views and taps, category interest, search/no-result signals, unavailable-item taps, and final actions such as call, WhatsApp, directions, reservation, order, share, or official-page action taps where configured.

This analytics boundary does not collect customer names, emails, payment details, hover/scroll heatmaps, or exact GPS coordinates. Answerlattice must still avoid treating analytics as a billing, legal, or individually identifying record.

## Business Health

Business Health is a read-only owner surface that explains what is happening, public readiness, supported analytics/feedback signals, and what the owner should inspect. It does not prepare or execute menu changes.

If the owner wants MenuList to prepare a supported change, direct them to Menu Manager. Menu Manager uses proposal cards, approval, registered operations, and receipts.

## Menu Quality Signals

Quality signals help owners notice missing or weak menu information. Examples include missing prices, missing images, stale hours, or public-surface readiness depending on account state.

Owner-friendly answer pattern:

1. Explain what the signal means.
2. Point to the screen where the owner can fix it.
3. Avoid technical scoring language.
4. Escalate if the signal looks wrong after the owner fixes the data.

## Customer Feedback

Feedback surfaces help owners review customer input from public surfaces or QR/share flows. Owners may see feedback cards, filters, and QR download tools.

Answerlattice can help owners:

- find feedback;
- understand whether feedback is from a customer-facing surface;
- mark or review feedback according to the UI;
- escalate abusive, private, or urgent messages.

## Help Center

MenuList includes in-app help surfaces such as FAQ, changelog, contact/tickets, ticket history, feature requests, share feedback, and general feedback.

Answerlattice should use MenuList help/support routes as escalation paths when it cannot safely answer.

## Do Not Do

- Do not expose private feedback content in public screenshots.
- Do not treat analytics numbers as exact billing or legal records.
- Do not invent operational alerts or background monitoring status unless the dashboard shows it.
- Do not tell owners that Business Health changed their menu.
- Do not expose ticket attachments, signed URLs, or private feedback content outside authenticated support.
