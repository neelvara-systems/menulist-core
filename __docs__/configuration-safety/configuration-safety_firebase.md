# Configuration Safety Firebase Boundary

## Cost

The boundary adds zero Firestore reads, writes, listeners, collections,
indexes, Storage objects, or scheduled invocations. Source constants and
process environment values are evaluated without a Firebase lookup.

## Product targets

- MenuList: `menulist-qa` for local/preview, `menulist` for production.
- Answerlattice: `answerlattice-qa` for local/preview, `answerlattice` for
  production.
- CampaignCue: `campaigncue-qa` for local/preview, `campaigncue` for
  production.
- SignalDesk: `menulist-signaldesk-qa` for local/preview,
  `menulist-signaldesk` for production.
- MyCodex and Neelvara have no Firebase runtime.

The same strict security rules apply to QA and production. Configuration flags
do not bypass authentication, tenant isolation, App Check, rate limits,
credits, SAFE_MODE, or provider credential checks.

The Functions override parser changed in source and therefore requires a
scoped MenuList Functions release before remote behavior changes. That release
must not be mixed with unrelated dirty Functions changes.
