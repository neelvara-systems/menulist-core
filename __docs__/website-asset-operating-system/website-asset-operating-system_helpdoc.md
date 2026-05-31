# Website Asset Operating System - Internal Helpdoc

**Audience:** Founder, Codex operators, future asset operators  
**Status:** Internal v1 implemented  
**Public customer help:** Not applicable

---

## Quick Summary

Website Asset Operating System is the internal workflow for checking and refreshing MenuList and Canonica website assets. It tells Codex what assets should exist, how to judge them, and when founder approval is required.

## Before Using It

The first implementation provides these commands:

```bash
npm run assets:audit
npm run assets:brief -- --slot <asset-id>
npm run assets:review
npm run assets:fingerprint
```

Use this doc set plus `packages/asset-factory/` as the source of truth.

## Common Tasks

### Check Which Assets Are Missing Or Stale

1. Run the audit.

```bash
npm run assets:audit
```

2. Read the output groups:
   - Missing
   - Stale
   - Oversized
   - Approval required
   - Disconnected

3. Do not generate final hero videos from the audit alone. Generate a brief first.

### Generate An Asset Brief

1. Choose one asset slot from the audit output.
2. Run the brief command.

```bash
npm run assets:brief -- --slot menulist.home.hero.official-source
```

3. Review the generated brief under `packages/asset-factory/briefs/`.
4. Correct the slot or brand context if the brief is wrong.

### Create An Internal Placeholder For A Missing Slot

Use this only for internal planning. It does not update the public website.

```bash
npm run assets:generate:missing -- --slot canonica.home.hero.support-control-motion
```

The output goes under `packages/asset-factory/published/placeholders/`.

### Review Generated Assets

1. Run the review script.

```bash
npm run assets:review
```

2. Check the score and decision.
3. If the asset requires founder approval, do not publish it until approved.
4. If the asset is oversized, optimize it before publishing.

### Lock Source Fingerprints

Run this only after generated or approved assets and their watched source files are intentionally accepted.

```bash
npm run assets:fingerprint
```

After this, `npm run assets:audit` can detect source-file drift.

### Decide Whether Codex Can Auto-Generate

Use this table:

| Asset | Codex can auto-generate? |
| --- | --- |
| Missing manifest entry | Yes, manifest only. |
| Static poster derived from approved asset | Yes. |
| OG image from approved template | Yes. |
| Screenshot from founder-approved demo route | Yes, if no private data appears. |
| Real customer screenshot | No, founder approval required. |
| Hero motion | No, founder approval required. |
| Launch video | No, founder approval required. |
| Analytics proof | No, founder approval required. |

## Troubleshooting

### Audit says an approved asset is stale

Check which fingerprint changed:

- page/component changed;
- brand context changed;
- asset slot changed;
- demo flow changed.

If the visual still matches, update the review record after re-approving. If not, generate a new brief.

### Asset is oversized

Use the optimizer path once implemented. Until then, do not publish the asset. The target budgets should come from the slot.

### Asset looks good but feels wrong

Use the rejection rules, not personal taste alone. Reject if:

- Canonica looks like a generic SaaS dashboard;
- Canonica looks like MenuList with different colors;
- MenuList looks like POS, payroll, CRM, or restaurant operations software;
- the clip needs explanation;
- it shows too many features at once;
- it uses forbidden public claims;
- it lacks a poster/fallback;
- it is not connected to a declared slot.

### Codex asks for brand context again

That means the implementation is incomplete. The workflow should store brand context in repo files and skill references so repeated prompts are not needed.

## Related Docs

- `__docs__/website-asset-operating-system/website-asset-operating-system_usage-guide.md`
- `__docs__/main-website/main-website_image-assets.md`
- `__docs__/canonica/canonica-website/README.md`
- `__docs__/strategy/product-universe-ssot.md`
- `__docs__/constitution/12-product-separation-doctrine.md`
