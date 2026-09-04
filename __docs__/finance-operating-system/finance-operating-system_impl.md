# Finance Operating System Implementation

## Implemented Governance Layer

- Mirrored Codex/Cascade FinanceOS rules
- Repository-discoverable FinanceOS skill
- Internal package boundary and private-data ignore guard
- Canonical local-workbook schema
- Governed documentation and reminder contract
- AGENTS.md routing and architecture memory
- Canonical private-register manifest and independent operating controls
- Append-only correction, period-close, backup/restore, exception, and schema-change contracts

## Local Evidence Layer

The real ledger is intentionally outside the repository. On August 24, 2026, the founder-authorized `Neelvara-Finance` folder was initialized in the local Documents directory with:

- `00-Ledger/`
- one year folder containing month-numbered folders;
- monthly `Invoices/`, `Payment-Proofs/`, `Refunds-and-Credits/`, and `Reconciliation/` folders;
- `Contracts-and-Plans/`, `Tax-and-Compliance/`, and `Archive/`;
- record-specific `Restricted-Originals/` directories for explicitly owner-authorized exact business/KYC evidence, permission-locked separately from routine derivatives;
- initial Markdown registers implementing `packages/finance-os/templates/ledger-schema.md`, with workbook migration pending the approved spreadsheet runtime.

The initial provider lifecycle register and provider review log are Markdown records because the spreadsheet artifact runtime was not available in this session. They follow the canonical schema and can be migrated into the governed workbook without changing IDs or facts when workbook authoring is available.

The complete private v1 control set now includes provider accounts, transactions, obligations, prepaid balances, assets, budgets/forecasts, evidence index, provider reviews, period close, backup/restore, exceptions/decisions, system control, and a canonical register manifest. Empty registers are intentional until evidence-backed facts are supplied.

Before changing the local store, inspect the current structure and preserve existing records. Never normalize or overwrite private files wholesale.

## Reminder Layer

Scheduled reviews may be created only when explicitly requested. Their prompt must state the cadence, required local folder, evidence boundaries, what counts as a finding, and when owner input is required. A missed task run cannot close an obligation.

The approved periodic pattern has two stages:

1. FinanceOS reminds the founder that a review is due; the reminder does not open accounts or claim that they were checked.
2. After current-run approval, the founder opens the Chrome profile signed in as `admin@neelvara.com`; FinanceOS performs a read-only, provider-by-provider review and records dated non-secret evidence.

The default operating cadence is a weekly quick review of prepaid and usage-sensitive providers and a monthly full review of all confirmed-current and source-evidenced providers. Known renewals add seven-day and one-day reviews. Exact scheduled day and time remain unset until the founder chooses them.

## Live Provider Review Layer

The canonical run order is identity and shared infrastructure, Google Cloud/Firebase, AI/cache/observability/email, payments, monitoring/analytics, and domains. Gated/not-active providers are excluded unless explicitly reopened; CampaignCue remains excluded.

Google Cloud/Firebase observations remain separate for MenuList QA and production, Answerlattice QA and production, and SignalDesk QA and production. The live review can observe billing linkage, spend/credit, budgets/alerts, quotas, and service usage. It cannot alter billing, IAM, APIs, quotas, projects, secrets, Firebase configuration, or deployments.

Each provider ends in `CHECKED`, `AUTH_REQUIRED`, `BLOCKED`, or `SKIPPED`. Authentication and MFA remain founder-operated. Screenshots are optional and redacted by default. When the founder explicitly authorizes exact retention for future record use, an unredacted business/KYC screenshot may be stored only as `restricted-original` evidence under the private controls in schema v1.1; ledger facts and routine derivatives remain masked.

## Independent Operation

The local private files remain authoritative if reminders, Chrome, provider consoles, ChatGPT, Firebase, or product code are unavailable. A manual calendar can trigger the same weekly, monthly, renewal, close, backup, and restore routines. No automation success closes a record without ledger evidence.

Corrections append a linked decision/correction entry and retain the prior fact. Monthly close uses explicit period states. `CLOSED_WITH_EXCEPTIONS` requires named carry-forward items; `CLOSED` requires a verified backup check. Reopening appends a new close event instead of rewriting the previous one.

## Continuity And Portability

Core registers use Markdown tables whose field contracts are CSV/XLSX-compatible. Future workbook migration must preserve stable IDs, timestamps, unknown values, correction links, and old exports. An owner-selected encrypted backup is checked monthly and a non-destructive sample restore is tested quarterly. FinanceOS never stores recovery credentials.

## Accounting Policy Boundary

Reporting currency, fiscal year, FX source, GST, TDS/withholding, capitalization, depreciation, and statutory retention stay `unknown` or `needs-professional-review` until verified. Original evidence is retained; an assumed retention period cannot delete it.

## Change Control

When the schema changes, preserve old IDs and values, document the migration, and update the rules, skill, package schema, and relevant docs together. Do not create a second ledger for convenience.

FinanceOS v1 is frozen. Changes require an evidence-backed legal/accounting, security/data-loss, provider-compatibility, or founder-approved material workflow reason recorded in the decision log.

The August 31, 2026 schema v1.1 addition is a founder-approved material workflow improvement. It adds `restricted-original` evidence without changing existing IDs, historical rows, exports, product boundaries, or external-action authorization.
