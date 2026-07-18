# Connect MenuList to an External Menu System

> **Owner-facing feature:** External Menu Sync
> **Last reviewed:** July 16, 2026

## What it does

External Menu Sync sends a signed copy of your current MenuList menu to one connected system after MenuList saves an approved project change. The receiving provider, developer, agency, website, ordering system, or POS must supply a compatible public HTTPS connection URL and implement the MenuList payload.

If nobody has asked you for a webhook or connection URL, you do not need this setting.

## Before you start

Ask the receiving team for:

- a public URL beginning with `https://` that accepts MenuList POST requests;
- confirmation that they can verify HMAC-SHA256 signatures;
- confirmation that they can process a full menu snapshot;
- a contact who can check their server when a test fails.

MenuList does not create a vendor account or discover a POS connection automatically.

## Connect on desktop

1. Open **Business Settings**.
2. Open **External Menu Sync**.
3. Turn on the connection. MenuList securely prepares a verification secret if one does not exist.
4. Enter the public HTTPS URL supplied by the receiving team.
5. Save the URL.
6. Use **Copy** beside the verification secret and share it privately with the receiving team.
7. Click **Test connection**.
8. Continue only when MenuList shows the connection is reachable and the receiving team confirms their test request.

## Connect on mobile

1. Open **More** in the MenuList mobile app.
2. Open **External Menu Sync**.
3. Turn it on, enter the provider URL, and save.
4. Reveal or copy the secret only when sharing it with the receiving team.
5. Run the connection test.

Mobile uses the same secure secret and test as desktop. Delivery history and setup handoffs remain easier on desktop.

## What happens after a save

MenuList waits 25 seconds after the latest acknowledged project save, then sends the latest full snapshot once. Keep the MenuList app open until that wait has passed. Rapid saves are combined into one attempt.

There is no automatic retry. If the app closes before the timer fires or the receiver is unavailable, the next acknowledged project save sends the latest full snapshot.

## Understand the status

- **Connected:** the current connection is configured and the latest accepted status is healthy.
- **Connection issue:** a deliberate test/configuration check failed, or three live deliveries in a row failed.
- **Disabled:** MenuList is not sending updates to this destination.

A successful MenuList delivery means the receiver returned an HTTP 2xx response. It does not prove the receiver applied the menu. Confirm application with the receiving team.

## Delivery history

Desktop shows the newest 20 attempts with time, version, response status, and duration. MenuList does not show the provider response body.

If an attempt says Success but the external menu did not change, contact the receiving team with the delivery time/version. Their endpoint accepted the request but may not have applied it.

## Share setup details

Desktop can:

- prepare an email draft for the provider contact;
- copy the technical header/signature summary;
- download a sample JSON payload.

MenuList opens a draft on your device; it does not send the email itself. The “three per day” limit counts draft preparation, not delivered emails.

## Keep the secret safe

- Share it only with the team operating the receiving endpoint.
- Do not put it in screenshots, tickets, public documents, or chat groups.
- MenuList masks it by default.
- If it was exposed, rotate it immediately and send the new value privately.

### Rotate the secret

1. Open External Menu Sync.
2. Click **Regenerate**.
3. Type `REGENERATE`.
4. Wait for the success message.
5. Copy the new secret and give it to the receiving team.
6. Run **Test connection** after they update their verification configuration.

The previous secret stops signing new MenuList requests immediately.

## Troubleshooting

### “Could not reach connected system”

Check:

- URL begins with `https://`;
- no username, password, or `#fragment` is in the URL;
- the endpoint is public, not localhost/private network;
- the provider server is running;
- it responds within five seconds;
- it returns a 2xx response;
- it has the current secret.

Then run the test again. MenuList intentionally does not display the provider's raw error body.

### The connection changed after secret rotation

The provider still has the old secret. Share the new secret and test again.

### A saved change was not delivered

- Confirm External Menu Sync was enabled for this outlet.
- Confirm the provider URL was saved.
- Keep the app open for at least 25 seconds after the save.
- Check desktop delivery history.
- Make another acknowledged project save after fixing the connection; this sends the current full snapshot.

### The test succeeds but the POS does not update

The provider accepted the request but did not apply it. Share the delivery version/time with them. MenuList cannot inspect their internal processing.

## Multi-outlet businesses

Connections are store-level. Configure and test each outlet separately. MenuList does not claim that one master connection updates every outlet/provider automatically.

## When to contact MenuList support

Contact MenuList support when:

- the protected secret cannot load or rotate for an authorized user;
- saves repeatedly fail inside MenuList;
- no delivery row appears after an acknowledged save and the 25-second wait while the app remained open;
- the provider URL is public HTTPS but MenuList consistently rejects it.

For a success row that was not applied, contact the receiving provider first.
