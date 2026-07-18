# Global Localization Verification

**Status:** Local source and semantic-evidence verification passed
**Last updated:** July 18, 2026

## Findings and Fixes

| Severity | Finding | Resolution |
| --- | --- | --- |
| High | Invalid timezone cookie could reach next-intl and break rendering. | Central IANA validation on reads and writes. |
| High | Date/time cookies were parsed into arbitrary Intl option shapes. | Only allowlisted formats are accepted. |
| Medium | Server timezone fallback depended on runtime host. | Deterministic UTC fallback. |
| Medium | Selected RTL locale and Redux/Ant direction could disagree. | Root and Ant direction now derive from locale, retaining manual override. |
| Medium | Hook-free date display exposed raw ISO strings. | Native Intl fallback now respects preferences. |
| Medium | Invalid calendar and clock values could roll into valid-looking dates. | Strict calendar and range validation. |
| Medium | Owner dashboard/mobile/transaction screens used browser-default number/date formatting. | Shared formatting boundary. |
| Low | Relative-time labels were hard-coded English. | `Intl.RelativeTimeFormat` with resolved locale. |
| Low | Unused shared `amount` format implied INR globally. | Removed; currency remains explicit at owning surfaces. |
| High | Most locale files were partial for mounted owner-dashboard namespaces, allowing large English fallback blocks. | Source-synced all mounted `Common`, `AppSettings`, `Settings`, `Dashboard`, and `MobileDashboard` keys across the 52 registered files. |
| High | The first completeness pass omitted the shared `Settings` namespace even though desktop and mobile settings controls mount it directly. | Added all 15 shared settings strings to every registered pack and extended the source gate to the audited five-namespace boundary. |
| High | `AppSettings.language` was mounted by the mobile settings sheet but absent from the source locale. | Added the source key and propagated it through every locale file. |
| High | Open-hours analytics said “timed/known actions,” but `closedShare` divides by open, closed, and unavailable-status actions. | Copy now accurately says “all recorded actions”; desktop, mobile, detail-builder fallbacks, and translations use the same meaning. |
| Medium | “App Appearance” claimed a real-time preview and exposed technical RTL/LTR labels. | Replaced with owner-facing app settings, reading-direction, language/region, and display-option wording. |
| Medium | Six translated established-year help strings retained a removed `{year}` variable. | Removed the stale variable while retaining the intended “Serving since” meaning. |
| Medium | Translation drift could silently remove or rename ICU variables. | Added full mounted-namespace ICU parsing plus variable parity for every existing owner translation. |
| Medium | Ambiguous English source terms produced real semantic drift: Business Health became special-menu switching, settled analytics became paid analytics/storage, Watch became video playback, and Yesterday could mean tomorrow. | Replaced the ambiguous owner copy with Business Health re-sync, complete-analytics wording, Needs attention, Previous day, Sessions with activity, Get directions, and Sharing breakdown; then re-synced every locale. |
| Medium | Automated translation produced isolated high-confidence errors in Assamese reservation, Finnish action rate, Filipino lifetime range, and Hindi action breakdown. | Applied direct native-script corrections for those exact mounted keys. |
| Medium | The Odia provider output split English fragments into Odia words, including “no data,” “dark mode,” and “invalid.” | Repaired the affected mounted strings and added a regression guard for the known mixed-script patterns. |
| Medium | Desktop and mobile settings entry points still displayed the stale “App Appearance” wording even after the settings panel was broadened. | Both entry points now reuse the canonical localized `AppSettings` title/summary; the theme action also changes between localized dark/light labels. |
| High | The earlier completeness gate covered only five namespaces while mounted desktop/mobile owner code uses 49 MenuList namespaces. | Expanded the structural and ICU boundary to all 3,119 owner keys, excluding only separately governed `Website` and `CampaignCue`. |
| High | Bottom navigation, loader names, and the MobileShell subscription gate bypassed next-intl. | Added `MobileNavigation` and `MobileShell` source contracts, wired the rendered labels, and added hardcode regression checks. |
| High | The structural expansion still contained 125,159 exact `en-US` fallback values, including Bodo and Kashmiri. | Preserved existing translations and populated 122,117 source-equal owner values with pinned local AI4Bharat IndicTrans2 and Google MADLAD-400 revisions. Remaining exact values are approved invariants or reviewed same-spelling cognates. |
| High | Ordinary URL, alphanumeric, and XML-style sentinels could be dropped, transliterated, renumbered, or duplicated by one or both model families. | Switched to provider-native numbered-brace/printf placeholders and an exact token multiset gate. A failed token switches only that message to segment translation around the protected values. |
| High | Greedy multilingual output sometimes appended explanations, duplicates, or unrelated second phrases; a few values collapsed to a short partial meaning. | Added a 0.18-2.5 Unicode length boundary for source values of 20 or more characters, targeted beam-search repair, bounded first-complete-message reduction, and locale/key-specific reviewed corrections. No quality residue remains. |
| High | A late-locale validation failure could have produced a partial multi-file write. | Semantic apply now validates and reconstructs all locale packs in memory before writing any locale or evidence file. |
| Medium | Locale packs retained 765 obsolete owner keys that no longer existed in canonical `en-US`. | Removed the stale keys, made offline sync prune only inside canonical owner namespaces, and made the source gate require exact owner-key parity while leaving `Website` and `CampaignCue` untouched. |

## Parity Map

- State: four preference cookies; no database preference state.
- Constants: supported locale registry plus allowlisted date/time formats.
- APIs: server actions only; no public or protected API route.
- Database: none for UI preference flow.
- Security: runtime validation, same-site cookies, no sensitive content.
- Mobile: same provider/helpers as desktop.
- Cost: zero Firebase/provider operations.

## Locale Coverage

- `en-US`: canonical source.
- `en-GB`: English source-synced for this mounted boundary, retaining existing regional copy elsewhere.
- All 52 packs: exactly 3,119 owner keys across 49 namespaces are structurally complete and ICU-safe; no locale-only owner keys remain.
- All 50 non-English packs: the established 464-string dashboard/settings subset and expanded owner boundary are semantic-evidence gated.
- Semantic migration: 122,117 actual owner values populated from 106,662 deduplicated protected translation units.
- Quality repair: 826 bounded values repaired after overlong, under-translated, token-preservation, or exact-English-residue review; 109 applications use explicit locale/key or locale/source reviewed wording, covering duplicates consistently.
- Exact-source residue: limited to protected brands, URLs, identifiers, ICU-only values, file/format terms, or reviewed same-spelling cognates.
- `brx-IN` and `ks-IN`: use the pinned AI4Bharat model and the same token, ICU, length, residue, and evidence-hash gates as every other non-English pack.

Google Cloud Translation was not enabled: the active legacy project had the API disabled, the configured project boundary did not match current MenuList environment governance, and the workload exceeded the documented free monthly character tier. The local workflow instead uses [AI4Bharat IndicTrans2](https://github.com/AI4Bharat/IndicTrans2) for the 21 supported Indic packs and [Google MADLAD-400](https://huggingface.co/google/madlad400-3b-mt) for 29 global packs. The AI4Bharat mirror is pinned to a revision whose model weight SHA-256 matches the gated upstream weight; MADLAD uses a pinned CTranslate2 conversion with recorded model and tokenizer hashes. Both model families run only in the maintainer workflow.

Meta M2M-100 and Helsinki bilingual candidates were rejected after real-message samples changed protected tokens, mistranslated common owner actions, or produced weaker low-resource output. The semantic workflow records the accepted model revisions, licenses, generation settings, source hash, and per-locale owner-subtree hashes in `owner-locale-semantic-coverage.json`.

## Semantic Cross-check Evidence

- Preserved the earlier 22,272-value dashboard/settings semantic cross-check and the focused 1,872-value ambiguity recheck.
- Validated all 106,662 generated units for exact protected-token identity before reconstructing owner messages.
- Reparsed every final owner message and compared ICU argument, select, plural, ordinal, number, date, time, and tag signatures with `en-US`.
- Rejected 682 overlong values and 12 under-translated values, then applied targeted beam-search or bounded reviewed corrections.
- Re-ran the exact-English classifier until zero non-invariant residue remained.
- Bound the final 52 locale trees to checked-in SHA-256 evidence and reran the normal localization source gate.
- This is strong executable semantic evidence. It does not certify native fluency, tone, or regional dialect, so future native-speaker feedback remains a valid copy improvement rather than a hidden code-completion blocker.

## Commands

```bash
npm run verify:owner-dashboard-locales
npm run verify:global-localization-boundary
npm run verify:website-resource-locales
npm run sync:owner-locale-keys
node scripts/localization/owner-locale-semantic.js --quality-prepare=/tmp/owner-quality.json
npx eslint --no-cache <touched localization and owner display files>
npx tsc --noEmit --incremental false --pretty false
```

Hosted browser/PWA checks remain release-operator evidence and must stay pending until the app is released.
