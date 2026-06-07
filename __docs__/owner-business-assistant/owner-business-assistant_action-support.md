# Owner Business Assistant Action Support Track

**Owner-Facing Name:** Business Health Action Support
**Internal Slug:** owner-business-assistant-action-support
**Product:** MenuList
**Status:** Final plan freeze, implementation not started
**Last Updated:** June 7, 2026

---

## Decision

Action Support ships in the same day-one implementation as Business Health, but it is treated as a separate runtime track with its own kill switch.

If Action Support is disabled, Business Health remains read-only and fully usable.

Action Support is not a free-form autonomous bot. It is a registry of approved actions. Natural language can map only to registered actions.

## Flags

```ts
ENABLE_OWNER_BUSINESS_ACTION_SUPPORT: false,
ENABLE_OWNER_BUSINESS_ACTION_NAVIGATION: false,
ENABLE_OWNER_BUSINESS_ACTION_DRAFTS: false,
ENABLE_OWNER_BUSINESS_ACTION_CONFIRMED_WRITES: false,
ENABLE_OWNER_BUSINESS_ACTION_PUBLIC_TRUTH: false,
ENABLE_OWNER_BUSINESS_ACTION_MEDIA: false,
ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_TEXT: false,
ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_IMAGE: false,
ENABLE_OWNER_BUSINESS_ACTION_CHECK_WORKFLOW: false,
```

`ENABLE_OWNER_BUSINESS_HEALTH` and `ENABLE_OWNER_BUSINESS_ACTION_SUPPORT` must be independent.

## Action Registry

Every action is registered with:

```ts
type OwnerBusinessActionDefinition = {
  actionType: string;
  ownerLabel: string;
  riskLevel: 'navigate' | 'draft' | 'confirmed_write' | 'public_truth' | 'blocked';
  requiredPermissions: string[];
  requiredFlags: string[];
  targetKinds: Array<'project' | 'menu_item' | 'category' | 'store' | 'media' | 'feedback' | 'review' | 'outlet' | 'billing'>;
  resolver: 'summary' | 'project_doc' | 'store_doc' | 'existing_api' | 'screen_route';
  draftSchema?: string;
  executor: string;
  cacheImpact: 'none' | 'project_public' | 'store_public' | 'screen_public';
  aiCostAction?: string;
};
```

Unregistered actions are refused.

## Day-One Supported Action Catalog

| Action type | Owner request examples | Reuse path | Risk | Confirmation |
| --- | --- | --- | --- | --- |
| `open_business_health_detail` | "Show me more" | `/business-health` route | Navigate | No |
| `open_dashboard_analytics` | "Show analytics" | Existing dashboard analytics | Navigate | No |
| `open_menu_editor_target` | "Open this item" | Existing editor route/context | Navigate | No |
| `open_publish_screen` | "Make this live" | Existing publish/share screen | Navigate | No unless in-assistant publish is enabled |
| `open_feedback_reviews` | "Show feedback" | Existing feedback/review surfaces | Navigate | No |
| `open_business_settings` | "Update business details" | Existing business settings | Navigate | No |
| `menu_item_price_set` | "Change Paneer Tikka to 220" | Project mutation adapter over existing `updateProject()` invariants | Public truth | Yes |
| `menu_item_price_bulk_adjust` | "Increase selected prices by 10%" | Command Center pricing pure functions | Public truth | Yes |
| `menu_item_availability_set` | "Mark this sold out" | Command Center availability pure functions | Public truth | Yes |
| `menu_item_visibility_set` | "Hide this item" | Command Center active/inactive pure functions | Public truth | Yes |
| `menu_item_move_category` | "Move these to Specials" | Command Center move-category pure functions | Public truth | Yes |
| `menu_item_description_prepare` | "Rewrite this description" | Existing description generation helpers/accounting | Draft/provider text | Yes before save |
| `menu_missing_descriptions_prepare` | "Add missing descriptions" | Existing description generation and repair flow | Draft/provider text | Yes before save |
| `menu_item_image_upload_open` | "Update this image" | Existing item image upload flow | Navigate/draft | Owner selects file |
| `menu_item_image_generate_prepare` | "Generate image for this item" | Existing image generation route/accounting | Draft/provider image | Yes before save |
| `menu_item_image_attach_confirm` | "Use this image" | Existing media upload/associate item image path | Public truth | Yes |
| `menu_repair_prepare` | "Fix menu gaps" | Existing Command Center repair flow | Draft/provider text | Yes before save |
| `check_mark_reviewed` | "Done" | Assistant check workflow doc | Draft/check state | Yes |
| `check_dismiss` | "Ignore this" | Assistant check workflow doc | Draft/check state | Yes |

## Blocked Actions

These actions are refused in the day-one contract:

- Delete items or categories.
- Bulk delete.
- Change every price without preview.
- Publish public truth without explicit confirmation.
- Buy credits, change subscription, or make payments.
- Force POS delivery or change POS integration settings.
- Infer revenue/profit and apply pricing from that inference.
- Cross-tenant or cross-store actions outside verified permission scope.
- Direct Firestore writes to public menu/store truth.

## Reuse Rules

Action Support must reuse existing systems:

| Existing system | Action use |
| --- | --- |
| `CommandCenterModal/utils/bulkOperations.ts` | Price, availability, move category, show/hide pure transformations |
| `src/database/projects/index.ts` `updateProject()` path | Public menu truth save invariants, MCE, MOL, multi-outlet awareness, cache invalidation |
| `publishProject()` | Publish behavior and menu snapshots |
| `descriptionGeneration.shared.ts` and `descriptionUtils.ts` | Add/rewrite descriptions with manual edit protection |
| `prepareMediaImage()`, `uploadFile()`, `associateItemImagesWithProject()` | Item image upload/attach |
| Image generation routes | Provider-generated item images with existing AI accounting |
| `requireAnyStorePermission()` and permission constants | Role enforcement |
| Public cache helpers | Public output invalidation |

## Mutation Adapter Rule

Assistant action code must not write raw project or store docs.

Confirmed write path:

1. Resolve target from server-side scope.
2. Read current project/store target.
3. Verify tenant/store/role/permission.
4. Verify draft target fingerprint.
5. Apply registered transformation.
6. Save through existing UI flow or server-safe mutation adapter preserving `updateProject()` behavior.
7. Invalidate public cache when public output changes.
8. Mark action audit result.

## Draft Storage

```text
ownerBusinessAssistantDrafts/{draftId}
ownerBusinessAssistantActions/{actionId}
```

Drafts store:

- Target IDs.
- Target fingerprint.
- Proposed patch.
- Preview summary.
- Expiry.
- Source question/intent ID.

Drafts do not store:

- Full project documents.
- Base64 images.
- Raw transcripts.
- Provider prompts.
- Secrets or tokens.

## Firebase Cost Contract

Action Support has no cost on Business Health page open when disabled.

| Flow | Reads | Writes |
| --- | ---: | ---: |
| Navigate action | 0-1 | 0-1 audit |
| Prepare price/availability/show-hide/move draft | 1 project read | 1 draft + 1 action audit |
| Prepare description draft | 1 project read + provider accounting if generated | 1 draft + AI operation writes |
| Prepare image generation draft | 1 project read + provider accounting if generated | 1 draft + AI operation writes + existing image output |
| Confirm public menu write | 1 draft + 1 target read | Existing project write + action audit |
| Mark/dismiss check | 0-1 | 1 compact check/action write |

No action route may scan analytics, feedback, review, menu change logs, or all projects.

## Failure Behavior

If Action Support has errors:

- Disable `ENABLE_OWNER_BUSINESS_ACTION_SUPPORT`.
- Keep Business Health read-only.
- Do not delete action audit docs.
- Do not retry confirmed public writes automatically.
- Surface a generic owner-safe error.

