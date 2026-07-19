# Answerlattice Help Widget - Specification

> **Version:** 3.0
> **Updated:** July 18, 2026
> **Scope:** Configuration, credentials, origin policy, route policy, access, and launch-grade branding

## Customer Job

A SaaS founder must be able to install governed in-product support without building a support frontend, exposing private workspace data, or trusting an unrestricted chatbot.

## Primary User

An Answerlattice workspace member with `canManageWidget`.

## Required Outcomes

1. Create multiple named widget keys for controlled client environments.
2. Show each raw key once and never recover it later.
3. Revoke an installed key while retaining a bounded audit record.
4. Restrict runtime use to exact app origins.
5. Hide the launcher on selected host routes.
6. Change bounded branding without editing the installed script.
7. Verify which origin/path most recently loaded valid runtime configuration.
8. Keep the widget credential separate from Public API and administrative credentials.

## Key Lifecycle

| State | Required behavior |
| --- | --- |
| Create | Generate `al_*`, hash it, store only hash-indexed metadata, return raw key once |
| Use | Admit only active `answerlattice_widget` credentials with the required `widget:*` scope |
| Rename | Change display metadata without changing key validity |
| Revoke | Remove hash from the active lookup array and retain a bounded revoked record with timestamp |
| Lost raw value | Create a replacement key; do not decrypt or recover |
| Limit | Maximum 10 active keys and 30 total active/revoked records in the normalized state |

Key validation may remain warm in one process for up to the documented short auth-cache window. Revocation is therefore seconds-level, not a claim of globally instantaneous invalidation.

## Origin Policy

An allowed origin must be an exact HTTP or HTTPS origin:

```text
https://app.example.com
https://staging.example.com:8443
http://localhost:3000
```

The save must reject:

- credentials in the URL;
- paths other than `/`;
- query strings or fragments;
- unsupported protocols;
- more than 25 origins;
- malformed or over-limit values.

Duplicate canonical origins are removed. An empty list preserves the documented open-origin mode and must remain visibly warned in management UI.

## Blocked Route Policy

The save accepts no more than 50 patterns. Valid forms are exact paths, descendant patterns ending in `/*`, or `*`. Invalid wildcard forms such as `/billing*` must fail instead of being normalized away.

Blocked routes only control launcher visibility and programmatic `open()`. They are not a security control and do not replace route authorization in the client product.

## Configuration Fields

| Area | Fields |
| --- | --- |
| Position | `position`, `offsetX`, `offsetY`, `zIndex` |
| Launcher | `shape`, `display`, `label`, `size`, `launcherVisibility`, `mobileVisibility` |
| Widget copy | `headerTitle`, `greeting` |
| Branding | `accentColor`, `poweredByVisible` |
| Behavior | `historyMode`, `blockedRoutes`, `guidedResolutionEnabled` |

All text and numeric fields have schema limits. Arbitrary HTML, CSS, JavaScript, selectors, images, and fonts are excluded.

## Runtime Delivery

1. The host loads `answerlattice-widget.js` with `data-answerlattice-key`.
2. The loader requests `/api/widget/config` using the key and browser origin.
3. The server validates rate limit, key source, product, purpose, scope, workspace identity, and origin.
4. The response contains public config and, when origins are restricted, a short-lived authorization bound to key hash, tenant, store, and allowed host origin.
5. The loader opens fixed route `/widget/embed` and passes the raw key only through `postMessage`.
6. Terminal config responses hide the runtime instead of leaving a visibly broken launcher.

Script attributes may override remote appearance/route values for a specific environment. They cannot bypass API key, scope, origin, tenant, or rate-limit checks.

## Access And Privacy

- Management routes require authenticated Answerlattice scope and `canManageWidget`.
- Public runtime routes do not accept session scope as a substitute for the widget key.
- The public config response excludes origin policy and credential records.
- The iframe URL contains no raw key in the current loader path.
- Referrer suppression prevents host URLs and legacy key paths from being sent by current widget requests.
- Safe runtime status stores only bounded origin/path/context labels and user-agent family.

## Activation Evidence

Activation should be measured by:

- a widget key created and copied;
- at least one exact allowed origin for a production-bound install;
- a valid config request observed from the intended host;
- a first real customer question tested;
- no origin, key, or route-policy errors.

Do not use widget impressions or raw conversation count as proof of support value.

## Non-Goals

- full help desk;
- unrestricted chatbot builder;
- arbitrary white-label CSS;
- DOM scraping;
- route authorization;
- account-changing actions;
- autonomous key rotation in client code;
- automatic publication of new support truth.
