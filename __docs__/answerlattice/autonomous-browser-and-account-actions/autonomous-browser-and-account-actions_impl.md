# Autonomous Browser and Account-Changing Actions - Implementation

> **Status:** No action runtime exists
> **Last Updated:** 2026-07-20

## Verified Source Boundary

- `ANSWERLATTICE_PROCEDURE_ACTIONS` is presentation vocabulary, not executable dispatch.
- Procedure and outcome schemas accept semantic targets/events but no `actionId`, action arguments, callback, code, selector, or authorization claim.
- The host loader scans exact `data-answerlattice-target` attributes and creates a `pointer-events: none` overlay.
- The only target movement is `scrollIntoView`.
- The host loader never calls the highlighted target's `.click()`.
- The SDK exposes context, identity, widget controls, payload-free workflow-event emission, and read-only guidance state; it exposes no action registration or execution.
- Guided completion is bound to the exact served canonical procedure, widget iframe origin/source, session, context, and matching client-reported event.
- A matched event is bounded workflow evidence, not independent proof of backend state or customer resolution.

## No Runtime Surface

There is no action broker, action registry, execution API, action route, action credential, action queue, action audit type, browser-control worker, model tool, rule, index, scheduler task, or public action claim.

## Future Implementation Rule

Do not modify the current procedure contract to smuggle executable actions into `action`. If a separate narrow assist feature is ever approved, use an explicit closed contract with server authorization and no arbitrary code path. Start with one reversible action only after a concierge test proves it is more useful than guidance.
