# Early Access Specification

## Objective

Collect qualified early-access interest without presenting Answerlattice as generally purchasable or creating accidental billing state.

## Public form

Required fields:

- name;
- work email;
- product URL;
- product stage;
- first support area;
- current or expected support questions;
- consent to be contacted.

Optional field:

- feature request or product idea.

Submission must provide a generic success response whether the email is new or already registered. A repeat submission updates the existing request and increments its submission count; it never creates a duplicate applicant.

## Lifecycle

Requests use one of these human-controlled states:

- `pending`;
- `approved`;
- `invited`;
- `activated`;
- `declined`;
- `withdrawn`.

Public writes can only create or refresh a request. They cannot approve, invite, activate, decline, or withdraw it. Status and internal notes can be changed only through the platform-admin API.

## Public access boundary

- All public purchase CTAs become `Request early access`.
- Pricing remains visible as planned public-launch pricing.
- `/get-started` redirects to `/early-access`.
- The onboarding API fails closed while public checkout is disabled.
- Existing authenticated QA workspaces and their private Billing screens are not changed.
- No submission creates an account, workspace, entitlement, subscription, checkout, invoice, or payment.

## Privacy and retention

Requests are Answerlattice-only pre-tenant records. They carry `pId: AL` and intentionally have no tenant or store ID. They expire after 365 days unless a later governed retention change is approved. Raw CAPTCHA tokens are never stored.
