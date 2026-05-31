# Production Data Safety For MenuList Answerlattice Assets

## Rule

Production MenuList data can support Answerlattice screenshots only after approval, minimization, and scrub. The fact that MenuList and Answerlattice are related products does not make private MenuList data public marketing material.

## Allowed With Approval

- MenuList product name and public positioning.
- Public MenuList website pages.
- Public demo menu content from an approved business.
- Public menu and Official Business Page screenshots from an approved demo/production business.
- Answerlattice dashboard screenshots that show MenuList knowledge state after private values are scrubbed.
- High-level widget context such as feature, page, workflow, role label, and entity hints.

## Not Allowed In Screenshots Or Uploads

- Tenant IDs, store IDs, project IDs, document IDs, or API keys.
- Owner emails, owner phone numbers, customer phone numbers, or private addresses.
- Raw customer support messages with personal content.
- Payment details, subscription identifiers, invoices, transaction IDs, or Razorpay data.
- Firestore paths, debug panels, console output, logs, or stack traces.
- Private admin routes, service-account content, secrets, tokens, or env var values.
- Claims copied from generated drafts before owner/admin review.

## Screenshot Scrub Checklist

Before any screenshot becomes an Answerlattice website or marketing asset:

- Confirm it came from the approved MenuList client/workspace.
- Confirm public use is approved for the exact screenshot.
- Confirm no private identifiers are visible.
- Confirm menu/business content is approved for public display.
- Confirm Answerlattice dashboard counts do not reveal private user/customer details.
- Confirm all generated Answerlattice answers shown are reviewed or clearly draft-only.
- Confirm the screenshot does not imply Answerlattice is a restaurant menu product.
- Confirm the screenshot does not imply Answerlattice replaces a helpdesk, CMS, or support team.

## Labeling

- Generated visuals: label as generated demo visuals.
- Private captures: label as private reference captures.
- Routed product screenshots: label with capture date, environment, source route, and approval status.
- Public marketing assets: keep a record of source screenshot, edits, and final approval.

## Current Package Status

The current `asset-inputs/current-approved-assets/` folder contains generated MenuList visuals. They are useful placeholders.

The current `asset-inputs/private-reference-captures/` folder contains private synthetic references. They are not public proof.

Real proof starts only after MenuList is onboarded as an Answerlattice production client and the approved routed captures are saved under:

```text
asset-inputs/future-routed-captures/
```

