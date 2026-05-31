# Asset Review Prompt

Use this prompt when reviewing changes under `packages/asset-factory/`, `public/images/website/`, `public/canonica-*`, or `public/canonica-splash/`.

## Review Order

1. Run `npm run assets:audit`.
2. Run `npm run assets:review`.
3. Confirm changed public assets are represented in `packages/asset-factory/manifest/assets.json`.
4. Confirm every changed slot still matches `packages/asset-factory/brand/*.asset-context.md`.
5. Confirm founder-review and founder-required slots are not treated as approved unless the manifest says so.

## Blockers

- Missing generated/approved files.
- Oversized generated/approved files.
- Public media not connected to any slot.
- MenuList assets using campaign/canvas/marketing-product UI.
- Canonica assets using MenuList restaurant visuals or generic helpdesk positioning.
- Real customer or private tenant data in public paths.

