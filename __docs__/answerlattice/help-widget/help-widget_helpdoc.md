# Answerlattice Help Widget - Help

> **Updated:** July 18, 2026

## Install The Widget

1. Open **Widget** in the Answerlattice dashboard.
2. Create a widget key.
3. Copy the key while it is visible. Answerlattice cannot recover it later.
4. Add the provided loader script to the client product.
5. Add every exact production and preview origin that may host the widget.
6. Test one approved answer and one unknown question before enabling broad access.

## Origin Rules

Enter an exact origin such as `https://app.example.com`. Do not include a page path, query, fragment, credentials, wildcard host, or non-HTTP scheme.

An empty origin list is open-origin mode. It is useful only for deliberate testing and should not be treated as the secure production default.

## Block Routes

Supported patterns are:

- `*` for every route;
- `/billing` for one exact route;
- `/admin/*` for a route and its descendants.

Route blocking hides the browser widget. It is not an authorization control and must not replace application permissions or origin restrictions.

## Manage Keys

- **Rename** changes dashboard identification only.
- **Revoke** removes the key from active lookup after bounded cache expiry.
- If a raw key is lost, create a replacement and revoke the old key after the installation is updated.

## When The Widget Does Not Appear

Check, in order:

1. the script and key are present;
2. the current exact origin is allowed;
3. the current route is not blocked;
4. the workspace and key are active;
5. browser developer tools show no terminal `401`, `403`, or `404` config response.

Terminal admission failures intentionally hide the launcher. Transient network failures use bounded retry behavior.

## Security Notes

- Send only allowlisted page/workflow context. Do not send raw DOM, credentials, tokens, form values, or unrestricted application state.
- Public citations must not reveal private source URLs.
- Widget keys are public installation credentials with narrow scope; they are not administrative secrets or account-action authorization.

## When An Answer Does Not Resolve The Question

Select **Still need help**, provide a reply email, and optionally add a name or more detail. The widget creates one asynchronous support request from the stored question and bounded product context. It does not promise live support, notification, or a response time.

If a screenshot cannot be processed, the widget tells the user that the answer used text only. Public source links are shown only when approved for public delivery, and related content runs another support search instead of exposing private paths.
