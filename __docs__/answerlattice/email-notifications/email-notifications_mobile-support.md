# Email Notifications Mobile Support

## Impact

No separate mobile notification workflow is required. Mobile ticket creation, reply, and status actions use the same DAL persistence and best-effort notification request as desktop.

## Required behavior

- Mobile UI must show the ticket mutation outcome, not claim that an email was delivered.
- Ticket links in email must resolve to an authenticated responsive surface.
- A mobile network interruption must not roll back a ticket that was already persisted.
- Test-email controls, when exposed on mobile, must use the same scoped route and three-per-hour limit.
- Failure copy must remain fixed and must not expose provider errors or recipient details.

## Manual checks

1. Create a ticket on mobile and confirm the ticket remains saved when notification delivery is unavailable.
2. Reply as support and verify the correct requester receives at most one eligible email.
3. Open the email ticket link on mobile and verify authentication and workspace scope.
4. Disable the network immediately after persistence and confirm the UI does not promise email delivery.
