# Gemini Credential And Billing Strategy

**Status:** Canonical long-term contract
**Approved:** August 16, 2026
**Owner:** `admin@neelvara.com`
**Applies to:** MenuList QA/production and Answerlattice QA/production

This document is the single source of truth for Gemini API project ownership,
billing, credentials, runtime secret names, spend controls, and rotation. Older
runbooks may retain historical evidence of four-key pools, but no active setup
or runtime may use those records as current instructions.

## Final Decision

Use four isolated Google/Firebase projects and one shared company Cloud Billing
account:

| Product environment | Google/Firebase project | Gemini credentials |
| --- | --- | --- |
| MenuList QA | `menulist-qa` | One primary plus one isolated menu-extraction credential |
| MenuList production | `menulist-prod` | One primary plus one isolated menu-extraction credential |
| Answerlattice QA | `answerlattice-qa` | One primary credential |
| Answerlattice production | `answerlattice` | One primary credential |

The steady-state target is **six active provider credentials across four
projects**, not four credentials per project.

Do not combine credentials from different projects into one runtime pool. QA
must never fall back to production, one product must never consume another
product's credential, and production must never use a QA credential.

## Why This Is The Long-Term Contract

- Gemini API keys do not have independent billing or quota. They inherit both
  from their Google project and Cloud Billing account.
- Gemini rate limits are project-level, not key-level. Additional keys in one
  project do not create additional quota.
- Permanent numbered key pools increase secret inventory, leak surface,
  rotation work, and ambiguity without increasing capacity.
- Project isolation preserves truthful usage attribution, project spend caps,
  incident containment, and environment separation.
- MenuList menu extraction keeps a separate credential because its Files API
  and extraction worker lifecycle must be independently revocable. This is a
  security boundary, not a quota or billing strategy.

Official references:

- [Gemini API billing](https://ai.google.dev/gemini-api/docs/billing)
- [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini API key security](https://ai.google.dev/gemini-api/docs/api-key)
- [Google Cloud budgets and alerts](https://cloud.google.com/billing/docs/how-to/budgets)

## Authentication-Key Contract

Google is transitioning Gemini API credentials from standard API keys to
service-account-bound authorization keys. New Gemini credentials must use that
model now; do not create a standard unrestricted key and plan to migrate it
later.

- Restrict every credential to **Gemini API** only.
- Enable **Authenticate API calls through a service account**.
- Bind one dedicated no-private-key service account per credential purpose.
- Do not grant that service account unrelated project roles and do not create a
  downloadable service-account JSON key.
- Keep application restrictions at `None` for these managed server runtimes;
  API restriction plus service-account binding is the provider authentication
  boundary. Browser and mobile clients must never receive these values.
- Google currently states that Gemini API will reject standard keys in
  September 2026. Existing QA credentials already satisfy the authorization-key
  contract and require no replacement for that deadline.

Current MenuList identities:

| Environment | Purpose | Bound service account |
| --- | --- | --- |
| QA | Primary | Google-managed `ais-gemini-key-*` account named `MenuList QA primary` |
| QA | Extraction | Google-managed `ais-gemini-key-*` account named `MenuList QA rotation 4`; the credential is named `MenuList QA menu extraction` |
| Production | Primary | `menulist-gemini-primary@menulist-prod.iam.gserviceaccount.com` |
| Production | Extraction | `menulist-gemini-extract@menulist-prod.iam.gserviceaccount.com` |

The historical QA rotation 2 and rotation 3 authorization keys and their
automatically created service accounts are deleted. Do not restore them from
the 30-day deleted-credential window.

## Billing Contract

All four projects must use company Cloud Billing account **Neelvara Cloud
Billing - Temporary** (`0135AA-B5D4AD-C72CAB`) unless a separately approved
billing-account migration replaces it everywhere.

Gemini Prepay is billing-account-level:

- one prepaid balance funds Gemini usage across every imported project linked
  to the billing account;
- no payment is required per API key;
- no separate INR 1,000 purchase is required merely because another key or
  project is added;
- if the shared Prepay balance reaches zero, Gemini requests from all linked
  projects stop;
- prepaid credits expire under Google's current terms and are not a general
  Google Cloud credit balance.

Evidence snapshot on August 16, 2026:

- plan: Prepay, Paid Tier 1;
- credit purchase: INR 1,000 on August 13, 2026;
- remaining balance: INR 998.59;
- recorded Gemini cost: INR 1.19;
- auto-reload: Off;
- imported projects: `menulist-qa` and `menulist-prod`;
- billing-account tier cap: INR 23,911.56. This is a ceiling, not a charge.

The existing Google Cloud project budgets are alert-only unless the console
explicitly identifies a Gemini project spend cap. Never describe an alert-only
budget as a hard cap.

## Spend-Control Layers

Every active Gemini project uses all applicable controls:

1. Shared Prepay balance at the company billing account.
2. Project-level Gemini monthly spend cap in AI Studio.
3. Project-scoped Google Cloud budget alerts.
4. Application rolling admission ceilings such as
   `MENULIST_GEMINI_SPEND_LIMIT_USD_10M` and
   `ANSWERLATTICE_GEMINI_SPEND_LIMIT_USD_10M`.
5. Provider usage, rate-limit, and health monitoring.

Keep auto-reload Off during setup and pre-launch certification. Enabling
auto-reload or changing its monthly charge limit is a separate financial
approval. Project caps may have provider processing latency and are not a
substitute for application admission controls.

Approved initial MenuList project caps are INR 250/month for `menulist-qa` and
INR 750/month for `menulist-prod`. They are operating caps, not prepaid
purchases and not per-key charges. Change either cap only through an explicit
cost review; additional keys do not add billing capacity or project quota.

## Runtime Secret Contract

### MenuList

| Purpose | Vercel | Firebase Functions Secret Manager |
| --- | --- | --- |
| General, image, and shared server AI | `MENULIST_GEMINI_AI_KEY` | `GEMINI_AI_KEY` |
| Menu extraction only | Not stored in Vercel | `MENULIST_GEMINI_TEXT_AI_KEY` |

The Vercel value and Firebase `GEMINI_AI_KEY` may hold the same environment's
primary provider credential. The extraction secret must hold the separate
extraction credential from the same Google project.

Retired names that must remain absent from current MenuList configuration:

- `MENULIST_GEMINI_AI_KEY_2`
- `MENULIST_GEMINI_AI_KEY_3`
- `MENULIST_GEMINI_AI_KEY_4`
- `GEMINI_AI_KEY_2`
- `GEMINI_AI_KEY_3`
- `GEMINI_AI_KEY_4`

### Answerlattice

| Purpose | Vercel and Firebase Functions Secret Manager |
| --- | --- |
| All Answerlattice Gemini operations | `ANSWERLATTICE_GEMINI_AI_KEY` |

Retired names that must remain absent from current Answerlattice configuration:

- `ANSWERLATTICE_GEMINI_AI_KEY_2`
- `ANSWERLATTICE_GEMINI_AI_KEY_3`
- `ANSWERLATTICE_GEMINI_AI_KEY_4`

Answerlattice provider setup remains pending until MenuList QA and production
are complete end to end. Source, templates, and runbooks may be corrected before
that provider work begins.

## Rotation Procedure

Rotation replaces a credential in place. It does not keep permanent numbered
fallback slots.

1. Create one replacement credential in the same Google project and restrict
   it to the Gemini API.
2. Store it as a new version of the existing Secret Manager name and/or replace
   the existing Vercel variable in the same environment scope.
3. Deploy the affected runtime through its approved release path.
4. Run one bounded provider-health or synthetic smoke without customer data.
5. Confirm the new revision serves the expected environment and project.
6. Revoke the old provider credential after old revisions drain.
7. Destroy superseded Secret Manager versions only after revision readback.
8. Log date, project, purpose, owner, smoke evidence, and revocation evidence.

Temporary overlap during a rotation is allowed. Keeping both credentials active
after the rotation closes is not.

## Capacity And Failure Handling

Do not respond to HTTP 429 by creating more keys. Use bounded retry with jitter,
backpressure, workload concurrency limits, model-specific monitoring, the
project's paid-tier path, and quota-increase requests when justified by measured
production traffic.

Cross-project fallback is prohibited even during an outage. If one project is
blocked, that environment must fail safely and expose an operational alert
rather than borrowing another environment's identity or budget.

## Migration Plan

### MenuList QA

- [~] Release source that discovers only `MENULIST_GEMINI_AI_KEY` and binds
      only `GEMINI_AI_KEY` plus `MENULIST_GEMINI_TEXT_AI_KEY`.
- [x] Remove `MENULIST_GEMINI_AI_KEY_2` and `_3` from the Vercel `qa`
      environment after the replacement deployment is ready.
- [x] Deploy the scoped Firebase Functions revisions without `_2`/`_3` secret
      bindings and verify provider health.
- [x] Delete Secret Manager resources `GEMINI_AI_KEY_2` and `GEMINI_AI_KEY_3`
      after no active revision references them.
- [x] Revoke the provider credentials historically named rotation 2 and 3 and
      delete their now-orphaned bound service accounts.
- [x] Retain the QA primary and dedicated menu-extraction authorization keys.
- [x] Confirm the AI Studio INR 250 project cap, Google Cloud alert-only budget, local
      rolling admission ceiling, and shared Prepay balance.

`[~]` means the source and verifier contract is complete locally, but the
Vercel QA runtime requires the normal staging release before hosted proof can
close the item.

### MenuList Production

- [x] Import `menulist-prod` into AI Studio under billing account
      `0135AA-B5D4AD-C72CAB`; do not create another Google project.
- [x] Confirm Paid Tier and shared Prepay without purchasing new credits.
- [x] Configure the project-specific INR 750 Gemini monthly spend cap.
- [x] Create exactly two restricted, service-account-bound authorization
      credentials: **MenuList Production
      primary** and **MenuList Production menu extraction**.
- [x] Store the primary in Vercel Production as
      `MENULIST_GEMINI_AI_KEY` and Firebase Secret Manager as `GEMINI_AI_KEY`.
- [x] Store extraction only in Firebase Secret Manager as
      `MENULIST_GEMINI_TEXT_AI_KEY`.
- [x] Verify API restriction, bound identities, Vercel Production scope, and
      Secret Manager version metadata without reading active values.
- [ ] Defer provider calls and deployment proof to the approved production
      release checkpoint.

### Answerlattice

- [ ] Keep `answerlattice-qa` and `answerlattice` provider actions pending.
- [ ] When resumed, import each project into the same company billing account,
      configure its own project spend cap, and create exactly one primary
      credential per project.

## Forbidden Patterns

- Four permanent Gemini keys per project.
- A pool containing credentials from different Google projects.
- QA-to-production or product-to-product fallback.
- Creating projects or keys to multiply quota.
- Treating a Google Cloud alert-only budget as a hard cap.
- Buying prepaid credits per key.
- Storing Gemini keys in browser-exposed variables, mobile apps, Firestore,
  logs, source control, or documentation.
- Reusing one provider credential for both MenuList primary and extraction.

## Change Control

Reopen this decision only if Google makes a breaking billing/authentication
change, the repository migrates away from API-key authentication, or measured
traffic proves a different project boundary is required. Convenience, unused
env slots, or a transient 429 are not sufficient reasons.

## Execution Log

### August 16, 2026 - MenuList QA credential reduction

- Verified AI Studio billing account `0135AA-B5D4AD-C72CAB` remains Paid Tier 1
  Prepay with `menulist-qa` imported; no additional credit purchase was made.
- Verified QA provider inventory: one primary, one menu-extraction credential,
  and the two retired rotation credentials.
- Verified Firebase Secret Manager metadata without accessing values: primary
  version 1 enabled, rotation 2 version 1 enabled, rotation 3 version 1 enabled,
  and extraction version 2 enabled with version 1 destroyed.
- Deployed only `computeDecisionBlocksScores`,
  `menulistMaintenanceScheduler`, `processMenuImages`, `mapsPlaceCheck`,
  `triggerDecisionBlocksScoring`, and `triggerStoreNightlyScheduler` to
  `menulist-qa`; all six updates completed successfully.
- Destroyed and removed the unused `GEMINI_AI_KEY_2` and `GEMINI_AI_KEY_3`
  Firebase secrets after the deployment.
- Removed `MENULIST_GEMINI_AI_KEY_2` and
  `MENULIST_GEMINI_AI_KEY_3` from the Vercel custom `qa` environment without
  triggering a build or deployment.
- Provider-key revocation, AI Studio project cap, hosted Vercel QA proof, and
  production credential creation remain open at the explicit account-action
  checkpoint.

### August 16, 2026 - MenuList provider account-action closure

- Set the AI Studio project monthly caps to INR 250 for `menulist-qa` and INR
  750 for `menulist-prod`; no additional Prepay purchase or auto-reload change
  was made.
- Imported `menulist-prod` into the existing Paid Tier 1 Prepay billing account
  and enabled the Gemini API in the exact production project.
- Created dedicated production service accounts `menulist-gemini-primary` and
  `menulist-gemini-extract` with no project roles and no user-managed keys.
- Created exactly two Gemini-only authorization keys, bound one-to-one to those
  service accounts. A first primary key rendered into operator automation
  output and was deleted immediately before storage or use; the replacement
  key is the only active production primary.
- Stored the replacement primary as sensitive Vercel Production variable
  `MENULIST_GEMINI_AI_KEY` and as Firebase secret `GEMINI_AI_KEY@1`. Stored the
  extraction credential only as Firebase secret
  `MENULIST_GEMINI_TEXT_AI_KEY@1`. Both secret versions report `ENABLED`.
- Deleted the QA rotation 2 and rotation 3 provider keys after their Vercel and
  Firebase aliases were removed, then deleted their orphaned bound service
  accounts. QA primary and extraction remain active and service-account-bound.
- No Vercel deployment, Firebase production deployment, Gemini provider call,
  Prepay purchase, or customer-data operation was performed.
