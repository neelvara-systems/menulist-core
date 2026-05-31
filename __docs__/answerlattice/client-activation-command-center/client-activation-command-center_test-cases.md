# Client Activation Command Center Test Cases

## API

- Authenticated Answerlattice owner receives summary.
- Non-management Answerlattice session receives 403.
- Non-onboarded user receives 400.
- Missing Answerlattice Firebase returns 503.
- Store tenant mismatch returns 403.
- Missing store returns 404.
- Store with subscription summary avoids legacy subscription query.
- Store without subscription summary uses capped legacy fallback.

## UI

- Loading skeleton renders.
- Empty/error state renders.
- Refresh reloads summary.
- Next required action routes to the correct management page.
- Content Control workbench routes to product details, import, knowledge base, product surfaces, changelog, signal queue, widget, and tickets.
- Test-as-Customer checklist routes to help center preview, widget setup, product surfaces, support ticket form, release notes, and Signal Queue based on summary readiness.
- Surface Readiness matrix shows Ready, Needs mapping, Needs content, and Open signals states from `summary.content.surfaceReadiness`.
- Daily Governance panel shows workspace scheduler status, support-day end time, daily check start time, last completion, and Settings/Refresh actions.
- Ticket detail operator view shows Knowledge Loop guidance without extra ticket reads.
- Mobile checklist actions remain tappable.
- Mobile Content Control actions stack without horizontal scroll.
- Mobile Surface Readiness and Test-as-Customer cards stack without horizontal scroll.

## Cost

- Activation load reads compact docs only.
- Daily Governance status reads one store doc, two platformSummary docs, and five capped scheduler logs.
- Content Control workbench adds no extra Firestore calls beyond the activation summary response.
- Test-as-Customer checklist and Surface Readiness matrix add no extra Firestore calls beyond the activation summary response.
- Ticket detail Knowledge Loop card adds no Firestore calls; it reads only local ticket state.
- Activation snapshot write is skipped when signature is unchanged and fresh.
- Widget runtime marker is throttled.
