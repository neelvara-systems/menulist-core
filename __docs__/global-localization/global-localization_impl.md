# Global Localization Implementation

**Status:** Implemented
**Last updated:** August 11, 2026

## End-to-end Flow

1. `src/i18n/request.ts:160` reads the locale cookie. If absent, it negotiates `Accept-Language` against the supported registry.
2. `normalizeLocalePreference()` and `normalizeTimeZone()` sanitize request inputs before next-intl receives them (`src/lib/localization/config.ts:56`).
3. `en-US` messages are deep-merged underneath the selected locale so missing keys retain a readable fallback (`src/i18n/request.ts:186`).
4. `src/providers/localisationProvider.tsx` provides the validated timezone and selected date/time formats.
5. `IntlClientWrapper` updates the document language and direction (`src/providers/IntlClientWrapper.tsx:17`).
6. Ant Design combines automatic locale direction with the retained manual RTL
   override. Redux Persist theme/direction values pass through exact boolean and
   six-digit hex projectors before provider use; malformed legacy values use
   governed defaults (`src/lib/antd/themeBoundary.ts`).
7. React surfaces use next-intl or `formatNumber()` / `formatDateTime()`; direct browser-default formatting is disallowed on the audited owner dashboard, transaction, and MobileShell paths.
8. The small mobile control/fullscreen dictionary resolves explicit and cookie
   locale authorities through the same `normalizeLocalePreference()` contract.
   Canonical region codes, base-language aliases, underscore/case variants and
   invalid-explicit/valid-cookie fallback therefore match the rest of the app.
   Cookie read failure uses `en-US`, and each call returns an isolated object so
   one consumer cannot mutate later mobile copy.

## Owner UI Message Boundary

The canonical owner boundary is derived from the top-level `en-US.json` message tree. `Website` is excluded because public website localization has a separate release contract; `CampaignCue` is excluded because it is an adjacent product. The remaining 50 namespaces currently contain 4,025 owner strings. Every registered locale file must contain the same keys.

`scripts/verification/verify-owner-dashboard-locales.js` checks:

- exact parity between `APP_LANGUAGES` and locale files;
- every owner key exists and is non-empty, with obsolete locale-only owner keys rejected;
- ICU syntax and variable parity for the full owner boundary;
- mounted `useTranslations()` namespace roots stay inside the canonical owner boundary;
- source/fallback copy parity for the duplicated open-hours dashboard labels; and
- canonical settings title/summary use at the desktop sidebar and mobile settings entry;
- localized MobileShell navigation, loading, and subscription-gate copy;
- rejection of the known mixed-script artifacts found in the prior Odia provider output; and
- the checked-in source hash and per-locale owner-subtree hashes in `owner-locale-semantic-coverage.json`;
- bounded translated/source length ratios; and
- exact English residue only for protected invariants or reviewed same-spelling cognates.

`scripts/localization/sync-owner-locale-keys.js` is deterministic and offline. It preserves existing translations, reuses a translation only when the same English source has exactly one existing locale translation, writes explicit `en-US` fallback for unresolved owner keys, and removes obsolete keys inside canonical owner namespaces. It does not alter the separately governed `Website` or `CampaignCue` trees, invent translation text, or call a provider.

`scripts/localization/owner-locale-semantic.js` prepares a complete semantic snapshot, validates every locale before writing, and replaces each JSON file with deterministic formatted output. It protects ICU structures, URLs, emails, product names, technical terms, and the pinned provider provenance; preserves all existing non-source values; and translates only exact-source residue. `scripts/localization/translate-owner-locale-units.py` uses pinned AI4Bharat IndicTrans2 and Google MADLAD-400 model revisions in an isolated maintainer environment. Provider-native placeholders retain sentence context; if a model drops one, only the surrounding English segments are translated before exact reconstruction.

The quality workflow rejects altered tokens and ICU signatures, overlong or under-translated output, exact non-invariant English residue, leaked provider placeholders, unrelated sentence expansion, unexpected email/URL injection, repeated CJK alternatives, invented numbers, mixed-script artifacts, and changed protected product/platform tokens embedded inside complete messages. The current evidence records 7,030 bounded owner-quality repairs. The dashboard audit additionally back-translated the decision-critical Business Health and public-truth set, replaced unsafe generated output with reviewed copy, normalized Meitei orthography, and retained explicit per-key English source fallback when a trustworthy localized value could not be defended. `owner-locale-semantic-coverage.json` records provider provenance, counts, quality policy, and source/per-locale hashes. This is executable coverage, not native-speaker certification.

Mounted dashboard data is localized after the data boundary. Server summaries, checks, public-truth modules, facts, results, and owner actions carry stable IDs; `ownerDashboardPresentation.ts`, `ownerActionPlanPresentation.ts`, `dashboardPresentation.ts`, and `ownerPublicTruthPresentation.ts` map those IDs to the active locale. Raw generated prose is not authoritative for non-English rendering. Business Health assistant answers remain English-only and the localized UI states that boundary before an owner can submit a question. Public-truth text export is labeled as an English report. No translation provider, Firestore read, or runtime network call was added.

The 12-message `StarterActivation` namespace has an additional bounded review record. Its clearer owner source copy was translated through the maintainer-time static Google Translate mobile-web workflow with protected interpolation and `QR` tokens, isolated retries for any mutated token or batch marker, and rendered-output review; Bodo and Kashmiri remain on pinned IndicTrans2. This override is hash-bound under `starterActivationReview` in the semantic evidence and does not add a translation provider to application runtime.

## Public Customer Message Boundary

`BusinessSettings.publicCustomer` is the source namespace for fixed public chrome. `scripts/localization/generate-public-customer-messages.js` extracts that namespace from all 52 registered locale packs into a deterministic compact bundle, and `src/lib/localization/publicCustomerMessages.ts` resolves 337 fixed messages without loading next-intl, Firestore, or a translation provider in the public renderer. The helper also localizes the bounded mild/medium/hot/very-hot enum used by both the menu and item-detail surfaces.

The public packs are maintainer-time static artifacts. Forty-eight non-English packs were generated and English-round-trip checked through the static Google Translate mobile-web workflow; its Portuguese target is explicitly normalized from `pt-BR` to supported provider target `pt` so a source-identical response cannot be mistaken for a translated pack. Bodo and Kashmiri remain on the pinned local IndicTrans2 path. None of these providers or model dependencies is imported or called by the application runtime.

The public language decision remains owner-controlled:

1. an explicit `?lang=` wins only when it is admitted by the store/project public-language contract;
2. otherwise the normalized store/project `defaultLanguage` is used;
3. otherwise the existing public-language resolver falls back to English;
4. public menu/business content can use all 80 supported content languages; and
5. when a content language does not have one of the 52 static UI packs, content remains in that language while fixed chrome falls back to `en-US`.

The resolved language and direction are applied consistently to OBP, public menu and item detail, Guest Feedback, customer images, Customer App install UI and manifest, PWA shortcut labels/handoffs, compliance-page chrome, metadata/schema fallbacks, starter holding, error/not-found recovery, and public attribution. Links between OBP, menu, feedback, compliance, item, recovery, and PWA surfaces preserve the admitted `?lang=` value.

Standard temporary-status types use localized fixed copy. A custom status message remains owner-authored truth and is rendered verbatim rather than machine-translated. Compliance-page title, navigation, dates, missing-data state, and attribution use the public message bundle; generated or owner-edited legal body text remains canonical English unless a future owner-managed localized legal source is introduced. A non-English page marks that legal body `lang="en"` and `dir="ltr"` so assistive technology is not told that English legal text is translated.

`npm run verify:public-customer-localization` enforces locale/key parity, generated-bundle freshness, runtime purity, placeholder and protected-term parity, canonical phone/email examples, provider-marker and sentence-expansion rejection, selected script boundaries, semantic-evidence hashes, public surface `lang`/`dir` wiring, query preservation, localized spice labels, legal-body language truth, and RTL public-image navigation. Functional boundary tests also cover regional-code normalization, store-policy fallback, URL propagation, localized hours, interpolation, and unknown enum fallback. The gate is included in `npm run verify:global-localization-boundary`.

That aggregate also runs `npm run test:mobile-ui-locale-boundary`, which proves
the complete seven-field mobile dictionary for every registered app locale,
alias/cookie precedence, malformed input fallback, nonblank values, and
cross-call mutation isolation.

## Maintainer Regeneration

The model environment is intentionally outside the application dependency tree:

```bash
python3 -m venv /tmp/menulist-owner-locale
/tmp/menulist-owner-locale/bin/pip install -r scripts/localization/requirements-owner-locale-semantic.txt

HF_HOME=/tmp/menulist-owner-models /tmp/menulist-owner-locale/bin/python -c \
  "from huggingface_hub import snapshot_download; snapshot_download('naklitechie/indictrans2-en-indic-dist-200M', revision='a814dab1ae6e4ee4c7d785b7e1dcb0ac8e36bcd6'); snapshot_download('santhosh/madlad400-3b-ct2', revision='c32ad0cf118807ea6258d14be137547155842723')"

node scripts/localization/owner-locale-semantic.js --prepare=/tmp/owner-semantic-tasks.json
HF_HOME=/tmp/menulist-owner-models /tmp/menulist-owner-locale/bin/python \
  scripts/localization/translate-owner-locale-units.py \
  --input /tmp/owner-semantic-tasks.json \
  --output /tmp/owner-semantic-results.json \
  --provider indictrans2 --batch-size 64
HF_HOME=/tmp/menulist-owner-models /tmp/menulist-owner-locale/bin/python \
  scripts/localization/translate-owner-locale-units.py \
  --input /tmp/owner-semantic-tasks.json \
  --output /tmp/owner-semantic-results.json \
  --provider madlad400 --batch-size 256

node scripts/localization/owner-locale-semantic.js --apply=/tmp/owner-semantic-results.json
node scripts/localization/owner-locale-semantic.js --apply=/tmp/owner-semantic-results.json --write
```

After the first semantic apply, prepare the bounded quality set, translate it with `--beam-size 4`, dry-apply it, then add `--write`. Regeneration must finish with an empty quality payload and `npm run verify:global-localization-boundary`.

## Preference Writes

Server actions validate every value at runtime before writing a one-year, same-site preference cookie (`src/lib/localization/index.ts:19`). Invalid values throw bounded stable error codes and do not replace the current preference.

The cookies are deliberately not `HttpOnly` because client preference previews read them. They contain no authentication, tenant, business, or personal data.

Desktop App Settings exposes programmatic names for the Language, Timezone, Date Format, and Time Format selectors. Its custom theme-colour trigger is a named button, every colour choice exposes its selected state, and the optional favourite action retains double-click while adding a declared `F` keyboard shortcut. These controls remain browser-local and do not add a Firebase, provider, tenant, store, or public-data operation. Source gate: `npm run test:browser-runtime-boundaries`.

## Date and Time

`toDate()` accepts Firestore timestamps, serialized timestamps, dates, strings, and numeric epoch values. Epoch zero is valid. `formatDateTime()` uses next-intl when a formatter exists and a locale/timezone-aware native fallback otherwise (`src/utils/dateTime/index.tsx:128`).

Native date and datetime inputs are validated as real calendar values before conversion to UTC (`src/utils/dateTime/index.tsx:275`). Clock values must be exact `HH:mm` and stay within 00:00-23:59.

## Number and Currency

`formatNumber()` is the hook-free localized number boundary (`src/utils/formatters.ts:83`). `useFormatCurrency()` and `formatCurrency()` retain the smallest-unit input contract. Platform-only INR helpers remain explicit and are not used as a global currency default.

## Direction

Automatic RTL applies to the supported Arabic, Persian, Hebrew, Kashmiri, Sindhi, and Urdu language families. Manual RTL remains an additive accessibility/testing override, not the locale source of truth.

## Failure Behavior

- Bad cookie: default value, no crash.
- Missing locale message: `en-US` fallback, then key name as last resort.
- Future missing key at runtime: `en-US` safety fallback; the checked-in source gate fails until locale data and semantic evidence are refreshed.
- Failed provider/model quality check: no write; retain the last verified locale value.
- Invalid date: `N/A` or empty native-input value.
- Invalid timezone: `UTC` or the caller's already validated fallback.
- Missing currency: owning surface must supply its existing contract; the localization layer does not guess store currency.

## Long-term Decision

Keep this boundary pure and cookie-backed. A Firestore preference document, server timezone lookup, or second formatting library would add reads and drift without improving the current owner experience.
