# Distribution Operating System - Internal Operator Guide

> Audience: founder and authorized repository maintainers

## Review a New Input

1. Share the article, URL, transcript, pasted summary, or conversation.
2. Optionally tag `$distribution-os` and name the product(s) when known. The tag is a convenience, not a requirement; matching content must be detected automatically.
3. DistributionOS will compare it with the full Bible and current product truth, then decide whether it is useful enough to retain.
4. It will state source limitations, validate unstable claims when needed, and explain the useful, already-covered, unsupported, or rejected parts.
5. If admitted, it will improve the relevant Bible section. It will add supporting source evidence only when provenance or detailed validation will help later. Product code/docs changes occur only when separately authorized.

Example:

> `$distribution-os` review this for MenuList and Answerlattice. Preserve useful long-term ideas, reject unsupported claims, and implement only valid internal changes. Do not publish or contact anyone.

If you share the same material in another repository task without the tag, the content-fit trigger still applies. DistributionOS cannot see material that was never supplied, linked, or made accessible to that task.

Sharing content does not guarantee storage. A good result may be “useful parts already covered; no Bible change.” DistributionOS is responsible for that judgment. It does not authorize implementation or external action.

## Retrieve Current Doctrine And Supporting Evidence

Read the [Marketing and Distribution Bible](./distribution-operating-system_bible.md) first.

```bash
npm run distribution-os:plan -- --product menulist
npm run distribution-os:plan -- --product menulist --topic paid-acquisition
npm run distribution-os:plan -- --status research-required
npm run distribution-os:plan -- --entry PP-DIST-EXT-002
```

The output identifies the Bible as primary and shows any supporting evidence status, topics, use trigger, revalidation trigger, and exact ledger location.

## Audit the System

```bash
npm run distribution-os:audit
npm run verify:distribution-os
```

An audit pass means the ledgers and routes are structurally consistent. It does not mean a source is correct, a tactic works, a channel is ready, or external execution is approved.

## Retain Supporting Evidence Manually

1. First confirm the lesson materially improves the Bible.
2. Update the relevant thematic Bible section.
3. Decide whether future readers genuinely need source provenance or detailed claim/product validation.
4. If yes, choose MenuList or portfolio evidence routing and use the next sequential ID.
5. Preserve source limitations, retrieval topics, revalidation triggers, verdicts, and related truth.
6. Run `npm run verify:distribution-os`.

## Common Questions

### Does `APPLY_NOW` let the system publish or run ads?

No. It only authorizes the bounded internal decision described in the entry and current request.

### Why not store this in a database?

The curated Bible benefits from reviewable Git history, durable synthesis, and zero runtime cost. Add runtime only after repeated evidence shows the repository workflow cannot support a real decision.

### Where do experiments and results go?

MenuList execution, approval, attribution, and outcomes go to SignalDesk. Other products use their maintained execution contract.

### What if only a summary is supplied?

Review the supplied claims, name the missing original evidence, and avoid presenting the summary as transcript-verified fact.
