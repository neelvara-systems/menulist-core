# Early Access Test Cases

## Public intake

- Valid request is accepted and creates one record.
- Duplicate normalized email updates the same record and increments submission count.
- Duplicate submission does not downgrade an admin-assigned status.
- Invalid email, URL, enum, consent, oversized body, invalid JSON, honeypot, CAPTCHA failure, and rate-limit failure are rejected safely.
- Response never reveals whether an email already exists.
- No account, tenant, store, subscription, checkout, or payment record is created.

## Public gate

- Every current public purchase CTA points to `/early-access` and says `Request early access`.
- `/get-started` redirects to `/early-access`.
- Direct onboarding API calls return the early-access gate before provider work.
- Pricing is labelled informational/planned and contains no checkout action.

## Internal dashboard

- The canonical dashboard is `/platform/answerlattice-early-access`, appears inside the existing platform navigation, and is linked from Ops Control Room.
- The Answerlattice customer sidebar does not expose platform early-access operations.
- `/answerlattice/early-access` remains a guarded compatibility redirect to the canonical platform route.
- Signed-out, non-platform, reseller, and mismatched persisted-role users cannot access the page or API.
- Platform user sees exact counts and the latest paginated requests.
- Status filter and cursor pagination work.
- Detail view shows the submitted feature idea.
- Notes and valid status changes persist with bounded audit history.
- Invalid IDs, invalid states, oversized notes, missing records, repeated saves, and provider failures recover clearly.
- Desktop and mobile layouts remain usable.
