# Answerlattice — External Workflow Integrations — Test Cases

> **Version:** 1.3.1
> **Last Updated:** 2026-07-23
> **Audience:** Engineering / QA / Product

---

## §1 — Frozen Flow

`workspace configuration -> permission -> server-only secret handoff -> event identity -> provider adapter -> rate/retry/circuit behavior -> delivery audit -> nested health -> owner recovery -> disable/disconnect -> retention`

Self-service scope is Slack and email only. Linear and GitHub code is internal controlled-rollout infrastructure and is not customer availability.

---

## §2 — Source-Gate Cases

| ID | Case | Expected result | Evidence |
|---|---|---|---|
| WI-001 | Member without `canManageIntegrations` opens route or calls GET/PUT/test | Route/API deny; unauthorized caller cannot consume save/test quota | Permission map, route guard, focused runtime verifier |
| WI-002 | Integration-only custom role enters dashboard | First allowed route is Workflow Notifications, not Settings | Dashboard fallback contract |
| WI-003 | API returns malformed, oversized, redirected, cached, or extra-field success data | Browser rejects before state/success advances | Strict shared Zod schemas + 64 KB reader |
| WI-004 | Slack enabled without a saved/new valid webhook | Save is blocked | UI and server validation |
| WI-005 | Saved webhook is cleared while Slack stays enabled | Save is blocked | UI and server validation |
| WI-006 | Raw Slack webhook is read through tenant or platform-admin Firestore client | Read fails in dedicated and shared rules | Integration rules emulator |
| WI-007 | Browser receives saved Slack configuration | Only `webhookConfigured` is returned; raw URL is absent | API response schema |
| WI-008 | Config/health ownership is missing, partial, wrong-product, or cross-scope | Fully unowned legacy row can be transactionally claimed; partial/conflicting row fails closed | Ownership contract + config emulator |
| WI-009 | Health update writes Slack then email | Nested `adapters.slack` and `adapters.email` both remain visible; literal dotted fields are absent | Config emulator |
| WI-010 | Repeated deterministic scheduler event uses same key/payload | Duplicate is suppressed; changed-payload key reuse is rejected | Event identity/config emulator |
| WI-011 | Trigger is acknowledged more than once | Exact pending event is claimed once; delivery-attempt log is create-only | Config emulator |
| WI-012 | One enabled adapter succeeds and another fails | Event terminal state is `failed`, not falsely `delivered` | Delivery-state contract |
| WI-013 | One email recipient is at its daily cap | Complete email delivery is rate-limited; no other recipient slot is consumed | Atomic recipient emulator case |
| WI-014 | Slack returns `429` | Numeric status is retained; fixed 1s/4s retry is not used | Adapter boundary test |
| WI-015 | Slack returns `5xx` | Adapter marks response retryable, bounded to three total attempts | Adapter boundary test |
| WI-016 | Provider body or runtime exception contains sensitive text | Delivery result/log uses fixed local error text, not raw body/exception | Adapter boundary test |
| WI-017 | Slack dynamic text contains mention/link control syntax | Text is encoded and automatic parsing is disabled | Adapter boundary test |
| WI-018 | Circuit reaches threshold or cooldown probe races | Circuit opens at threshold; only one bounded probe lease wins | Config emulator |
| WI-019 | Owner tests unsaved/disabled adapters | Test is unavailable or API rejects; saved enabled Slack/email receive controlled test regardless ordinary filters | UI/API contract |
| WI-020 | Owner disables or disconnects Slack/email | Saved configuration reflects disabled/removed destination; no future event is dispatched to it | API normalization + config store |
| WI-021 | Legacy Slack URL contains userinfo, nonstandard port, query, fragment, or foreign host | GET reports unconfigured/disabled; PUT cannot preserve it; test queues no event; Functions dispatch stays disabled | Shared stored-config projector + Functions adapter boundary |
| WI-022 | Stored channel/circuit-breaker counter uses an object or numeric string | Channel is not stringified and failure count falls back to zero; no malformed typed state reaches owner/provider logic | Workflow and adapter contract suites |

---

## §3 — Required Commands

Run emulator suites sequentially and clear inherited local ADC:

```bash
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-integration-config-ownership
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-integration-adapter-boundaries
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-integration-delivery-state
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-integration-event-identity
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-integration-config:emulator
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-integrations:rules
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-integrations:shared-rules
npm --prefix functions-answerlattice run build
npx tsc --noEmit --incremental false --pretty false
npm run verify:answerlattice-runtime-truth
git diff --check
```

Do not run Firestore emulator suites concurrently; they share discovery and Firestore ports.

**Latest local result (2026-07-19):** all listed focused contracts, config/delivery emulator, dedicated/shared rules emulators, Functions build, Answerlattice/root TypeScript, focused ESLint, runtime-truth source verification, dependency freeze, documentation links, and `git diff --check` passed. Documentation links reported zero broken links and the repository's 62 pre-existing naming warnings.

---

## §4 — External Evidence Matrix

| Evidence | Status after source audit | Pass condition |
|---|---|---|
| Dedicated QA rules and Functions revision | Functions deploy attempted; Firebase CLI authentication blocked before upload | Scoped deploy succeeds and deployed revision/config are recorded |
| Answerlattice SMTP secret versions/values | External/pending | Four `ANSWERLATTICE_SMTP_*` bindings exist in QA and test delivery reaches approved inbox |
| Real Slack receipt | External/pending | Approved test webhook receives one message; secret is rotated after exposure test |
| Real email receipt | External/pending | Every configured approved recipient receives the same test; no partial delivery |
| Provider `429`/outage recovery | External/pending | Health and audit match provider behavior without duplicate external action |
| Slack webhook revocation/rotation | External/pending | Old URL fails safely; saved replacement passes one test |
| GitHub activation | Blocked by product decision | OAuth/token lifecycle, Issues write permission, rotation, API-version, deletion, and receipt evidence approved |
| Linear activation | Blocked by product decision | OAuth refresh lifecycle, least scopes, GraphQL rate-error handling, deletion, and receipt evidence approved |
| Founder usefulness | External/pending | Pilot founder completes setup unaided, receives a real relevant signal, and uses it to complete review work |

No provider acceptance, inbox placement, channel visibility, adoption, or workload reduction may be claimed from source tests alone.

---

## §5 — Official Contract References

Checked 2026-07-19:

- [Slack incoming webhooks](https://api.slack.com/messaging/webhooks): webhook URLs are secrets; leaked URLs may be revoked.
- [Slack rate limits](https://docs.slack.dev/apis/web-api/rate-limits/): incoming webhook rate behavior and `429 Retry-After`.
- [GitHub create an issue](https://docs.github.com/en/rest/issues/issues#create-an-issue): current token permission contract.
- [GitHub API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions): supported-version and retirement contract.
- [Linear OAuth](https://linear.app/developers/oauth-2-0-authentication): third-party app authorization and refresh-token contract.
- [Linear rate limiting](https://linear.app/developers/rate-limiting): request and GraphQL rate-error behavior.
- [Firestore event triggers](https://firebase.google.com/docs/functions/firestore-events): at-least-once, unordered delivery requirement.

---

## Version History

| Date | Version | Change |
|---|---|---|
| 2026-07-19 | 1.3.0 | Added complete source, emulator, provider, deployment, and founder-evidence matrix for Feature 34. |
| 2026-07-23 | 1.3.1 | Added exact stored-config projection, credential/port rejection and noncoercing circuit-breaker admission. |
