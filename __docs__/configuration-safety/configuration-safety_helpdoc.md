# Configuration Safety Help Boundary

This system requires no SMB-owner action. Owners should see normal feature
availability or existing unavailable/error states, never environment variable
names or internal configuration diagnostics.

Release operators use:

- `.env.staging.example` for local/preview Vercel values;
- `.env.production.example` for production Vercel values;
- `functions/.env.menulist-qa.example` and
  `functions/.env.menulist.example` for non-secret Functions values;
- Firebase Secret Manager and Vercel secret storage for credentials.

Unknown boolean text is a configuration error. Use explicit `true` or `false`
and rerun the verification boundary before release.
