# Answerlattice Guided Workflows

> **Status:** Implemented, workspace opt-in
> **Version:** 2.1.0
> **Created:** 2026-03-08
> **Last verified:** 2026-07-18
> **Flags:** `ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS`, `ENABLE_ANSWERLATTICE_GUIDED_RESOLUTION`

## Purpose

Guided Workflows turn an approved canonical procedure into controlled in-product help:

1. Explain the approved procedure.
2. Highlight a client-declared semantic target.
3. Wait for the user or a client-verified workflow event.
4. Advance, complete, report a missing target, or escalate.
5. Record at most one deduplicated terminal outcome when signal mutation is enabled.

The runtime is an **Explain + Guide** layer. It does not click controls, execute client code, read the page DOM as product truth, or change product data.

## Runtime Truth

- Procedure data remains embedded in an existing canonical answer.
- Only a canonical widget search result may start a guided session.
- Existing answers without procedures remain unchanged.
- `target` maps to `data-answerlattice-target="<semantic-id>"`.
- `expectedEvent` maps to `AnswerlatticeWidget.emitWorkflowEvent("<semantic-id>")`.
- Semantic IDs are bounded, lowercase identifiers. CSS selectors are rejected.
- The host script scans at most 500 explicitly marked targets.
- Highlight overlays use `pointer-events: none`.
- Route/context changes, widget hide, and widget close clear the active highlight.
- Missing targets fall back to the written instruction.
- Owner configuration defaults to disabled per workspace.
- The widget response never exposes tenant or store identifiers.
- Guided outcomes do not become approved knowledge. Escalation enters the existing governed signal path.
- MenuList is the first source-integrated reference client for menu import, import recovery, publish, share, and public-link verification.
- Reference procedure templates are non-authoritative code fixtures. They become live only when an owner creates or imports a matching draft and approves it through the existing intake, mutation-proposal, and governance path; Answerlattice never seeds client truth automatically.
- MenuList mobile controls carry the same semantic contracts, but the MenuList widget remains intentionally suppressed on mobile.

## First Reference Client

MenuList proves the integration contract on real product workflows without adding browser control:

1. **Import a first menu:** choose photos, PDF, or an approved public URL; start an acknowledged extraction job; review; apply.
2. **Recover a failed import:** use the real retry state and return to owner review.
3. **Publish and check:** publish acknowledged project changes, open Share, and open the public menu.

The canonical target/event registry is `src/lib/answerlattice/referenceClients/menuListGuidedResolution.ts`. Product code imports that registry instead of duplicating string identifiers.

## Product Boundary

This is not:

- a general browser agent;
- product-tour automation;
- arbitrary JavaScript execution;
- an action broker;
- screenshot or raw DOM capture;
- autonomous knowledge mutation;
- a replacement for client authorization.

## Documents

| Document | Purpose |
|---|---|
| [guided-workflows_spec.md](./guided-workflows_spec.md) | Product contract and boundaries |
| [guided-workflows_impl.md](./guided-workflows_impl.md) | Verified runtime architecture |
| [guided-workflows_firebase.md](./guided-workflows_firebase.md) | Firebase cost and data behavior |
| [guided-workflows_helpdoc.md](./guided-workflows_helpdoc.md) | Owner installation and use |
| [guided-workflows_mobile-support.md](./guided-workflows_mobile-support.md) | Mobile behavior |
| [guided-workflows_marketing.md](./guided-workflows_marketing.md) | Claim-safe positioning |
| [guided-workflows_website.md](./guided-workflows_website.md) | Public-copy boundary |
| [guided-workflows_test-cases.md](./guided-workflows_test-cases.md) | Required test cases |
| [guided-workflows_validation.md](./guided-workflows_validation.md) | Latest verification evidence |

## Version History

| Date | Version | Change |
|---|---:|---|
| 2026-03-08 | 1.0.0 | Structured procedure design |
| 2026-07-17 | 2.0.0 | Controlled Explain + Guide runtime, semantic targets/events, owner opt-in, and bounded terminal outcomes |
| 2026-07-18 | 2.0.0 | Cross-check aligned the owner toggle and install option with the parent and child feature-flag dependency |
| 2026-07-18 | 2.1.0 | Added the MenuList reference client, intake-to-governance procedure preservation, typed SDK parity, and focused regression coverage |
