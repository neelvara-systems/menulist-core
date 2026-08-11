# Global Localization Test Cases

**Last updated:** August 11, 2026

| ID | Case | Expected |
| --- | --- | --- |
| GL-01 | `en`, `pt_BR`, or base `ar` preference | Resolves to supported canonical locale. |
| GL-02 | Wildcard, malformed, or unsupported locale | Falls back without throwing in request rendering. |
| GL-03 | Valid IANA timezone | Preserved. |
| GL-04 | Invalid/oversized timezone | Rejected on write; read falls back to UTC. |
| GL-05 | Unknown date/time format cookie | Uses allowlisted default; arbitrary Intl options are not constructed. |
| GL-06 | Arabic, Persian, Hebrew, Kashmiri, Sindhi, Urdu | Root document and Ant Design render RTL. |
| GL-07 | Manual RTL with English | Manual override remains RTL. |
| GL-08 | Missing translated message | `en-US` value, then stable key fallback. |
| GL-09 | Epoch `0` | Formats as a valid 1970 instant. |
| GL-10 | `2026-02-29` | Rejected as an invalid calendar date. |
| GL-11 | `2024-02-29` | Converts correctly. |
| GL-12 | `24:00` or `25:00` | Rejected; not rolled into next day. |
| GL-13 | `en-US` vs `hi-IN` number | Uses western vs Indian digit grouping. |
| GL-14 | Date formatter omitted | Locale/timezone display, not raw ISO. |
| GL-15 | Desktop/Mobile owner dashboard and transactions | No direct `toLocale*` or raw `Intl` bypass on audited paths. |
| GL-16 | UI preference change | Zero Firestore operations. |
| GL-17 | Store locale change | Existing store DAL acknowledgement and public-cache behavior remain unchanged. |
| GL-18 | Registered locale files | Exact one-to-one parity with `APP_LANGUAGES`; every JSON file parses. |
| GL-19 | Full MenuList owner namespace boundary | All 4,025 strings in 50 namespaces exist and are non-empty in all 52 files; obsolete locale-only owner keys are rejected, while `Website` and `CampaignCue` remain excluded. |
| GL-20 | ICU variables in owner copy | Variables match `en-US` exactly and each owner message parses as ICU. |
| GL-21 | Non-English owner value equals `en-US` | Passes only for a protected invariant, ICU-only value, or locale-specific reviewed cognate. |
| GL-22 | Open-hours analytics fallback copy | Desktop, mobile, and shared detail-builder fallbacks match the translation source. |
| GL-23 | Semantic release evidence | All 52 packs match the checked-in source and locale subtree hashes; model-assisted coverage is not described as native-certified. |
| GL-24 | Full translated mounted boundary round trip | Gross inversions, domain-word drift, and context loss are reviewed; synonyms are not treated as failures. |
| GL-25 | Previous-day analytics labels | Hindi, Punjabi, Urdu, and other dual-meaning day words resolve to the previous day, never tomorrow. |
| GL-26 | Complete analytics helper | Translation does not imply payment, billing, or storage; it describes complete cached analytics and the next location end-of-day update. |
| GL-27 | Desktop/mobile settings entry | Uses canonical `AppSettings` title/summary copy; theme action names follow the active mode. |
| GL-28 | Odia mounted copy | Known split-English provider artifacts are rejected by the source gate. |
| GL-29 | Mobile bottom navigation and subscription gate | Labels, accessibility text, loading names, and plan action come from `MobileNavigation` / `MobileShell`; hardcoded source copy fails verification. |
| GL-30 | New owner namespace or mounted `useTranslations()` root | Automatically joins the canonical owner boundary unless it is the separately governed `Website` or `CampaignCue` tree. |
| GL-31 | Offline key synchronization | Preserves existing translations, reuses only unambiguous exact-source translation memory, records unresolved values as explicit `en-US` fallback, and removes obsolete keys inside canonical owner namespaces without provider calls; release verification remains red until semantic evidence is refreshed. |
| GL-32 | Protected semantic generation | ICU controls, variables, brands, URLs, emails, and technical terms retain exact identity; token loss switches to segmented translation. |
| GL-33 | Translation length anomaly | Source messages of 20 or more characters outside the 0.18-2.5 translated/source range fail or enter bounded quality repair. |
| GL-34 | Semantic evidence drift | Any source or locale owner-subtree hash change fails until the semantic snapshot is intentionally refreshed. |
| GL-35 | Fixed public-customer chrome | Exactly 337 source keys exist in all 52 locale packs and match the generated compact runtime bundle. |
| GL-36 | Public content language outside the 52 UI packs | Owner content remains in the admitted content language; fixed UI copy falls back to `en-US` without a provider or Firebase operation. |
| GL-37 | Public language transitions | OBP, menu, item, feedback, compliance, recovery, and PWA handoff links preserve admitted `?lang=` values. |
| GL-38 | Public RTL output | Page `lang`/`dir`, shared image controls, keyboard/swipe direction, and logical safe-area placement follow the resolved public language. |
| GL-39 | Compliance text in non-English chrome | Chrome is localized; canonical legal body stays unmodified and is explicitly tagged `lang="en"` / `dir="ltr"`. |
| GL-40 | Invalid or unavailable Guest Feedback project | Route-local recovery copy follows `?lang=`, exposes no project/store state, and preserves the language on the homepage link. |
| GL-41 | Customer App manifest and shortcuts | Manifest `lang`/`dir`, screenshot/fallback copy, shortcut labels, and shortcut `lang` query follow the normalized owner-controlled public language. |
| GL-42 | Regional or unsupported public locale | Regional code normalizes to its admitted base language; an unsupported UI pack falls back to `en-US` without changing owner content. |
| GL-43 | Fixed spice level | Mild, medium, hot, and very hot use localized enum labels on menu and item detail; an unknown owner value is rendered readably without invented translation. |
| GL-44 | Public hours fallback | Known fixed hours/day patterns localize through the public bundle; an unrecognized owner-authored note remains verbatim. |
| GL-45 | Public semantic evidence | Every locale public-subtree hash, placeholder set, protected term, canonical example, selected script boundary, and zero-runtime-operation assertion matches checked-in evidence. |
| GL-46 | Dashboard stable-ID projection | Business Health checks, sources, public-truth modules/facts/results/actions, and owner actions resolve localized labels from stable IDs; raw backend prose is not authoritative in non-English sessions. |
| GL-47 | Protected term inside a sentence | Changing or translating `MenuList`, `Smart Picks`, `Google`, `WhatsApp`, `QR`, or another protected token queues the message for bounded repair. |
| GL-48 | Corrupt generated dashboard copy | Repeated CJK alternatives, leaked `%s`, invented numbers, unrelated extra sentences, and configured mixed-script output fail or enter reviewed repair. |
| GL-49 | Business Health assistant in a non-English locale | Localized checks remain available, but English-only free-text/suggested question submission is unavailable with an explicit language boundary. |
| GL-50 | Public-truth report export | The localized UI labels the downloaded text report as English; it does not imply localized report content. |

Automated coverage: `scripts/verification/test-global-localization-boundary.ts`, `scripts/verification/verify-global-localization-boundary.js`, `scripts/verification/verify-owner-dashboard-locales.js`, and `scripts/verification/verify-public-customer-localization.js`.
