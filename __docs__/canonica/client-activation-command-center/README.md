# Canonica Client Activation Command Center

The Activation Command Center is the Canonica client launch surface. It tells a SaaS product owner whether their Canonica workspace is ready to serve customers without scanning the operational collections.

## Scope

- Route: `/canonica/activation`
- API: `GET /api/canonica/activation/summary`
- Summary doc: `platformSummary/activation_{tId}_{sId}`
- Runtime source docs: `stores/{sId}`, `platformSummary/contextContent_{tId}_{sId}`, `platformSummary/coverage_{tId}_{sId}`, `platformSummary/trustMetrics_{tId}_{sId}`

## Cost Contract

The page reads compact documents only:

1. `stores/{sId}`
2. `platformSummary/activation_{tId}_{sId}`
3. `platformSummary/contextContent_{tId}_{sId}`
4. `platformSummary/coverage_{tId}_{sId}`
5. `platformSummary/trustMetrics_{tId}_{sId}`

Legacy subscription lookup is capped to 5 documents and only runs when `stores/{sId}.canonicaSubscription` is missing.

The activation snapshot writes only when the readiness signature changes or when the cached snapshot is older than 30 minutes.

## Files

- `src/app/(canonica)/canonica/activation/page.tsx`
- `src/components/templates/canonica/activation/CanonicaActivationCommandCenter.tsx`
- `src/app/api/canonica/activation/summary/route.ts`
- `src/lib/canonica/activationSummary.ts`
- `src/lib/canonica/widgetRuntimeStatus.ts`
- `public/widget/canonica-widget.js`
