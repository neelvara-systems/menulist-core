# Early Access Implementation

## Runtime surfaces

- Public page: `/early-access`
- Public write API: `POST /api/answerlattice/public/early-access`
- Canonical internal dashboard: `/platform/answerlattice-early-access`
- Compatibility route: `/answerlattice/early-access` remains exact-platform guarded and redirects to the canonical platform route
- Internal API: `GET|PATCH /api/answerlattice/platform/early-access`

## Security contract

- Public input is strict Zod-validated, body-bounded, honeypot-protected, Turnstile-checked when configured, and fail-closed rate-limited before Firebase work.
- Normalized email SHA-256 is used as the deterministic document ID for deduplication.
- Client Firestore access remains denied by the Answerlattice default-deny rules.
- Internal reads and writes use `withPlatformAuth` and the Answerlattice Admin SDK.
- The canonical page inherits the exact `PLATFORM` server guard from `/platform/layout.tsx`; the platform sidebar independently hides the route from every other platform role.
- Responses and logs never include raw applicant email, feature text, CAPTCHA token, or request body.
- Status changes preserve a bounded audit history.

## Operational contract

The dashboard lives with Scheduler Monitor and the other internal platform operations screens. It shows exact aggregate counts and a cursor-paginated latest-request list. Operators can filter by lifecycle status, inspect support needs and feature ideas, record private notes, change status, and open an email draft. Email transmission is intentionally human-controlled in v1.
