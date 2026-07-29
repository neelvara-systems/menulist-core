# MenuList SignalDesk - Connector Settings

**Status:** Implemented
**Created:** June 23, 2026
**Scope:** Internal connector metadata and readiness screen for SignalDesk channels and source connectors.

## Decision

SignalDesk needs a Settings screen for connector records, but it must not become a secret manager.

The UI stores connector metadata:

- sender email, reply-to email, sender domain, and from name;
- WhatsApp display number and phone number ID;
- Instagram page ID;
- Messenger page ID;
- Meta app ID;
- Smartlead fallback metadata;
- Apify source broker metadata;
- owner status, notes, and derived readiness state.

The UI does not store:

- SMTP passwords;
- Meta access tokens;
- Meta app secrets;
- webhook verify tokens;
- Smartlead API keys;
- Apify API tokens;
- Apify webhook secrets;
- any raw provider secret.

Actual secrets stay in `SIGNALDESK_*` environment variables or future Firebase Secret Manager entries. SignalDesk only records whether required env-backed secrets are configured or missing.

## Runtime Shape

| Area | Implementation |
| --- | --- |
| Route | `/signaldesk/settings` |
| Collection | `signaldeskConnectorSettings` |
| Action | `upsert-connector-setting` |
| Permission | `channel.configure` |
| API protection | Existing SignalDesk action API with `withAuth()`, Zod validation, SignalDesk access, and rate limiting |
| Client writes | Denied in Firestore rules |
| Read model | Summary list only |

## Supported Connector Records

| Connector | Stores | Readiness derived from |
| --- | --- | --- |
| Email SMTP | sender email, reply-to, from name, sender domain | SMTP host/user/pass, email from, physical address, unsubscribe URL |
| Meta WhatsApp | display number, phone number ID, app ID | Meta access token, app secret, verify token, WhatsApp phone number ID |
| Meta Instagram | Instagram page ID, app ID | Meta access token, app secret, verify token, Instagram page ID |
| Meta Messenger | Messenger page ID, app ID | Meta access token, app secret, verify token, Messenger page ID |
| Smartlead | fallback connector record | Smartlead API key and webhook secret env state |
| Apify | source broker connector record | Apify API token, source Actor ID, and webhook secret env state |

## Safety Rules

1. Connector settings never write raw secrets.
2. Connector settings do not enable provider send.
3. Connector settings update channel health summaries only from env-derived readiness.
4. Sender-domain readiness remains separate from connector metadata.
5. Meta channel sends remain governed by existing approval, suppression, pause, and provider-send gates.
6. Smartlead remains fallback metadata until a separate adapter is explicitly implemented.
7. Apify connector settings do not choose arbitrary Actors; the source Actor ID stays in env/Secret Manager.
8. Apify connector settings do not enable outreach; source-policy, provider approval, budget, evidence, suppression, and approval gates still apply.

## Owner Workflow

1. Add the connector metadata in Settings.
2. Configure actual secrets outside Firestore.
3. Re-save connector settings to refresh readiness.
4. Mark sender domain ready only after authentication, unsubscribe, and risk checks are complete.
5. Use Channels for approved queue/handoff/send operations.
