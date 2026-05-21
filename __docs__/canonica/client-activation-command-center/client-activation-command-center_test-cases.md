# Client Activation Command Center Test Cases

## API

- Authenticated Canonica owner receives summary.
- Non-onboarded user receives 400.
- Missing Canonica Firebase returns 503.
- Store tenant mismatch returns 403.
- Missing store returns 404.
- Store with subscription summary avoids legacy subscription query.
- Store without subscription summary uses capped legacy fallback.

## UI

- Loading skeleton renders.
- Empty/error state renders.
- Refresh reloads summary.
- Next required action routes to the correct management page.
- Mobile checklist actions remain tappable.

## Cost

- Activation load reads compact docs only.
- Activation snapshot write is skipped when signature is unchanged and fresh.
- Widget runtime marker is throttled.
