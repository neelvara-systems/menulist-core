# Website Asset Factory Skill

Use this skill when asked to create, audit, refresh, review, or brief MenuList or Canonica website assets.

## Required Context

1. Read `__docs__/website-asset-operating-system/README.md`.
2. Read `packages/asset-factory/README.md`.
3. Read the relevant brand context:
   - `packages/asset-factory/brand/menulist.asset-context.md`
   - `packages/asset-factory/brand/canonica.asset-context.md`
4. Read the relevant slot file:
   - `packages/asset-factory/slots/menulist.asset-slots.ts`
   - `packages/asset-factory/slots/canonica.asset-slots.ts`
5. Run `npm run assets:audit` before proposing public asset changes.

## Workflow

1. Classify the asset brand and slot.
2. Confirm the slot exists.
3. Generate or refresh the brief with `npm run assets:brief -- --slot <slot-id>`.
4. Use the brief, brand context, source files, and manifest as the source of truth.
5. Keep raw and working media outside public paths.
6. Run `npm run assets:review` after adding or changing generated assets.
7. Require founder approval for any slot marked `founder-review` or `founder-required`.

## Hard Stops

- Do not publish a new public route for Website Asset Operating System.
- Do not treat this as a MenuList owner feature.
- Do not treat this as Canonica runtime.
- Do not mix MenuList restaurant visuals into Canonica assets.
- Do not use real customer screenshots without founder approval and scrubbing.
- Do not add heavy media dependencies without a specific implementation plan.

