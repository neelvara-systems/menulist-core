# Website Asset Factory Skill

Use this skill when asked to create, audit, refresh, review, or brief MenuList or Answerlattice website assets.

## Required Context

1. Read `__docs__/website-asset-operating-system/README.md`.
2. Read `packages/asset-factory/README.md`.
3. Read the relevant brand context:
   - `packages/asset-factory/brand/menulist.asset-context.md`
   - `packages/asset-factory/brand/answerlattice.asset-context.md`
4. Read the relevant slot file:
   - `packages/asset-factory/slots/menulist.asset-slots.ts`
   - `packages/asset-factory/slots/answerlattice.asset-slots.ts`
5. Run `npm run assets:audit` before proposing public asset changes.

## Workflow

1. Classify the asset brand and slot.
2. Confirm the slot exists.
3. Generate or refresh the brief with `npm run assets:brief -- --slot <slot-id>`.
4. Use the brief, brand context, source files, and manifest as the source of truth.
5. Keep raw and working media outside public paths.
6. Run `npm run assets:review` after adding or changing generated assets.
7. Require founder approval for any slot marked `founder-review` or `founder-required`.

## Optional Creative Skills

Use these installed skills only as production helpers under the AssetOS rules, never as replacements for the manifest, slot, brand, approval, or source-truth workflow:

- `imagegen-frontend-web`: art-direct website hero, section, dashboard, browser, social, and product-proof image references.
- `imagegen-frontend-mobile`: art-direct mobile app screenshots, phone mockups, onboarding frames, and app-store-style image references.
- `brandkit`: explore brand boards or identity systems when a brand is being created or materially refreshed.
- `image-to-code-skill`: translate an approved visual reference into implementation guidance when the source product surface is already verified.

For MenuList and Answerlattice, prompts must start from the generated AssetOS brief and the relevant product surface. Do not invent unsupported product capabilities, real customer proof, customer data, private identifiers, or external-platform sync claims.

## Video And Motion Default

For MenuList video or motion assets, default to local HyperFrames plus FFmpeg and keep source assets under `__docs__/videos/` unless a slot-specific doc says otherwise. Cloud video tools, paid avatar/voice services, Remotion, Motion Canvas, or other parallel render stacks require a specific implementation plan and explicit founder approval for that asset.

## Coordinated Launch Packs

Build launch packs by composing approved slots instead of duplicating equivalent website, social, device, and motion assets. A launch-pack record must name the shared demo identity, data policy, source slots, output files, and regeneration commands. Extract still frames from the approved local motion render when the requested frames are editorial derivatives; create a new HyperFrames composition only when the motion narrative itself changes.

## Rule Ownership

If a better asset workflow requires a repo-rule change, update this skill and the AssetOS docs in the same pass instead of leaving the rule only in chat. Keep changes bounded by product separation, customer-data safety, approval gates, and the current public-output contract.

## Hard Stops

- Do not publish a new public route for Website Asset Operating System.
- Do not treat this as a MenuList owner feature.
- Do not treat this as Answerlattice runtime.
- Do not mix MenuList restaurant visuals into Answerlattice assets.
- Do not use real customer screenshots without founder approval and scrubbing.
- Do not add heavy media dependencies without a specific implementation plan.
