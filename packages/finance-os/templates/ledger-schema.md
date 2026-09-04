# FinanceOS Ledger Schema

This is the canonical field contract for local FinanceOS workbooks. Real rows and evidence stay outside Git.

**Current schema version:** 1.1, effective August 31, 2026. This additive revision introduces owner-authorized `restricted-original` evidence while preserving all v1.0 fields and IDs.

## Provider Accounts

Required fields: `provider_id`, `provider`, `service`, `billing_family`, `cost_centre`, `account_state`, `plan_state`, `plan_name`, `plan_evidence`, `plan_as_of`, `billing_model`, `included_limit`, `current_usage`, `usage_as_of`, `trial_end_date`, `next_renewal_date`, `upgrade_trigger`, `payment_method_present`, `billing_owner`, `review_cadence`, `next_review_date`, `source_reference`, `owner_confirmation_needed`, `notes`.

Allowed account states: `confirmed-current`, `source-evidenced-unverified`, `gated-not-active`, `retired`, `not-required`, `unknown`.

Allowed plan states: `paid-fixed`, `free-plan`, `trial`, `prepaid`, `usage-based`, `transaction-fee`, `unknown`, `not-active`, `not-applicable`.

A code dependency, feature flag, env name, or setup checklist may justify a provider row but cannot set `confirmed-current`, a plan name, a quota, or a renewal date. Those require an owner statement, invoice, provider-console evidence, or another dated authoritative source.

## Transactions

Required fields: `record_id`, `vendor`, `description`, `cost_centre`, `transaction_type`, `status`, `invoice_date`, `payment_date`, `original_amount`, `original_currency`, `charged_amount`, `charged_currency`, `reporting_amount`, `reporting_currency`, `fx_rate`, `fx_source`, `fx_date`, `tax_amount`, `tax_treatment`, `withholding_amount`, `payment_method_masked`, `payment_reference_masked`, `invoice_file`, `payment_proof_file`, `evidence_status`, `reconciliation_status`, `duplicate_check`, `correction_of`, `created_at`, `updated_at`, `notes`.

Allowed transaction types: `fixed-recurring`, `usage-based`, `prepaid-deposit`, `one-time-expense`, `asset-acquisition`, `refund`, `credit`, `liability`.

Allowed statuses: `expected`, `invoiced`, `paid`, `partially-refunded`, `refunded`, `credited`, `failed`, `disputed`, `cancelled`.

## Obligations And Subscriptions

Required fields: `obligation_id`, `vendor`, `service`, `cost_centre`, `cadence`, `next_due_date`, `date_confidence`, `expected_amount`, `currency`, `amount_confidence`, `auto_renewal`, `owner_action`, `review_7d`, `review_1d`, `status`, `last_verified_at`.

Allowed confidence values: `exact`, `estimated`, `unknown`.

## Prepaid Balances

Required fields: `balance_id`, `vendor`, `service`, `cost_centre`, `deposit_record_id`, `opening_amount`, `currency`, `observed_balance`, `observed_at`, `previous_observed_balance`, `previous_observed_at`, `daily_burn_estimate`, `burn_window_days`, `estimated_exhaustion_date`, `threshold_status`, `next_review_date`, `source_evidence`, `notes`.

Allowed threshold statuses: `healthy`, `review`, `recharge-soon`, `critical`, `exhausted`, `unknown`.

Do not calculate burn rate from a single observation. Preserve every dated observation in the review log.

## Assets

Required fields: `asset_id`, `asset_name`, `asset_class`, `cost_centre`, `vendor`, `acquisition_record_id`, `acquisition_date`, `acquisition_cost`, `currency`, `evidence_file`, `assigned_to`, `location`, `status`, `disposition_date`, `professional_review_status`, `notes`.

FinanceOS records acquisition facts. Depreciation and tax treatment require professional confirmation.

## Budgets And Forecasts

Required fields: `budget_id`, `period`, `cost_centre`, `provider_or_category`, `currency`, `planned_amount`, `committed_amount`, `actual_amount`, `forecast_amount`, `forecast_basis`, `confidence`, `variance_to_plan`, `approval_state`, `owner_decision`, `as_of`, `notes`.

Allowed confidence values: `exact`, `estimated`, `unknown`. Allowed approval states: `draft`, `reviewed`, `approved-for-planning`, `rejected`, `not-required`.

`approved-for-planning` does not authorize payment, purchasing, subscription changes, or provider mutations. Do not combine currencies unless the system-control record defines a verified reporting-currency and exchange-rate policy.

## Evidence Index

Required fields: `evidence_id`, `record_ids`, `evidence_type`, `filename`, `source`, `document_date`, `captured_at`, `redaction_status`, `sha256`, `retention_status`, `professional_review_status`, `notes`.

Allowed redaction states: `not-required`, `redacted`, `needs-redaction`, `do-not-share`, `restricted-original`.

`restricted-original` requires explicit current-request founder authorization, private `Restricted-Originals/` storage, non-identifying filenames, directory mode `0700`, file mode `0600`, a SHA-256 value, and a linked owner decision. It may retain necessary bank-account/IFSC, UPI, tax/KYC, address, phone, proprietor, or comparable non-secret record identifiers. Routine ledger/report fields remain masked and a redacted derivative is retained when practical. Authentication and payment-authorization secrets remain prohibited: PINs, OTPs, passwords, API/private keys, cookies/tokens, recovery codes, QR authorization payloads, CVV, and full payment-card credentials.

A SHA-256 value verifies that the indexed local file has not changed since hashing. It does not prove the document is authentic, paid, reconciled, or tax-valid.

## Review Log

Required fields: `review_id`, `review_type`, `reviewed_at`, `record_id`, `provider_console`, `account_scope`, `observed_value`, `plan_state_observed`, `billing_state_observed`, `current_usage_or_balance`, `included_limit`, `next_invoice_or_renewal`, `alert_state`, `payment_method_presence_masked`, `source`, `result`, `missing_evidence`, `risk`, `next_action`, `next_review_at`, `owner_confirmation`.

Allowed live-review results: `CHECKED`, `AUTH_REQUIRED`, `BLOCKED`, `SKIPPED`.

`CHECKED` requires a dated provider-console observation for the scoped account. A reminder, provider email, source reference, failed sign-in, or partial navigation cannot produce `CHECKED`.

## Period Close Log

Required fields: `close_id`, `period`, `state`, `opened_at`, `reviewed_at`, `closed_at`, `reopened_at`, `transaction_check`, `obligation_check`, `prepaid_check`, `asset_check`, `budget_check`, `evidence_check`, `reconciliation_check`, `backup_check`, `open_exception_ids`, `carried_forward_ids`, `owner_decision`, `notes`.

Allowed states: `OPEN`, `IN_REVIEW`, `CLOSED_WITH_EXCEPTIONS`, `CLOSED`, `REOPENED`.

## System Control

Required fields: `financeos_version`, `schema_version`, `effective_at`, `record_owner`, `timezone`, `fiscal_year_policy`, `reporting_currency_policy`, `exchange_rate_policy`, `tax_policy`, `retention_policy`, `backup_policy`, `restore_test_policy`, `reminder_policy`, `canonical_store`, `last_control_review`, `next_control_review`, `notes`.

Unverified accounting policies use `unknown` or `needs-professional-review`; they are never inferred from country or payment currency.

## Exceptions And Decisions

Required fields: `decision_id`, `recorded_at`, `type`, `status`, `scope`, `reason`, `affected_record_ids`, `owner`, `due_at`, `resolved_at`, `resolution`, `migration_or_correction`, `notes`.

Allowed types: `exception`, `correction`, `policy-decision`, `schema-change`, `provider-exit`, `professional-review`.

## Backup And Restore Log

Required fields: `backup_id`, `checked_at`, `scope`, `destination_class`, `encryption_state`, `result`, `restore_sample`, `restore_result`, `missing_scope`, `next_backup_check`, `next_restore_test`, `notes`.

Allowed results: `VERIFIED`, `PARTIAL`, `FAILED`, `UNKNOWN`. Configuration or sync status alone cannot set `VERIFIED`.

## Identifiers And Filenames

- Transactions: `TXN-YYYY-MM-NNN`
- Obligations: `OBL-YYYY-NNN`
- Balances: `BAL-YYYY-NNN`
- Assets: `AST-YYYY-NNN`
- Reviews: `REV-YYYY-MM-NNN`
- Providers: `PRV-YYYY-NNN`
- Evidence: `EVD-YYYY-MM-NNN`
- Period closes: `CLS-YYYY-MM`
- Decisions/exceptions: `DEC-YYYY-NNN`
- Backups: `BKP-YYYY-MM-NNN`
- Budgets/forecasts: `BDG-YYYY-NNN`

Evidence filenames reuse the stable ID, for example `TXN-2026-08-001_vendor_invoice.pdf` and `TXN-2026-08-001_vendor_payment-proof.png`. Filenames must not contain account numbers, personal addresses, tax identifiers, secrets, or unnecessary personal data.
