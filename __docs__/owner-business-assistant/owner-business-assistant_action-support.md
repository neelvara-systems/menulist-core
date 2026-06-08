# Owner Business Assistant Action Support Track

**Owner-Facing Name:** Business Health Action Support
**Internal Slug:** owner-business-assistant-action-support
**Product:** MenuList
**Status:** Implemented behind dedicated Action Support flags
**Last Updated:** June 8, 2026

---

## Decision

Action Support ships in the same day-one implementation as Business Health, but it is treated as a separate runtime track with its own kill switch.

If Action Support is disabled, Business Health remains read-only and fully usable.

Action Support is not a free-form autonomous bot. It is a registry of approved actions. Natural language can map only to registered actions.

The AI answering layer may suggest actions only from the cached `OwnerBusinessAssistantContextPacket` action catalog. It cannot invent action types, choose hidden executors, or mutate targets directly.

## Flags

```ts
ENABLE_OWNER_BUSINESS_ACTION_SUPPORT: true,
ENABLE_OWNER_BUSINESS_ACTION_NAVIGATION: true,
ENABLE_OWNER_BUSINESS_ACTION_DRAFTS: true,
ENABLE_OWNER_BUSINESS_ACTION_CONFIRMED_WRITES: false,
ENABLE_OWNER_BUSINESS_ACTION_PUBLIC_TRUTH: false,
ENABLE_OWNER_BUSINESS_ACTION_MEDIA: false,
ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_TEXT: true,
ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_IMAGE: false,
ENABLE_OWNER_BUSINESS_ACTION_CHECK_WORKFLOW: true,
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
  targetKinds: Array<'project' | 'menu_item' | 'category' | 'store' | 'media' | 'feedback' | 'review' | 'outlet' | 'billing' | 'domain' | 'screen' | 'customer_app' | 'qr' | 'pos' | 'team' | 'compliance'>;
  resolver: 'summary' | 'project_doc' | 'store_doc' | 'existing_api' | 'screen_route';
  draftSchema?: string;
  executor: string;
  cacheImpact: 'none' | 'project_public' | 'store_public' | 'screen_public';
  aiCostAction?: string;
};
```

Unregistered actions are refused.

## AI Action Mapping

When an owner asks for a change, the AI may return an action option only if:

- The action type exists in the registry.
- The action appears in the context packet's `allowedActions`.
- The response includes source/target facts from the packet.
- The server revalidates permission and target scope.
- Public-truth actions still require confirmation.

The AI result is advisory. The `/action` route performs the real target resolution, draft creation, confirmation, and execution.

## Implemented Registered Action Catalog

The implemented registry exposes safe navigation, compact draft storage, temporary-status draft storage, review-reply draft storage, and check workflow actions. Public-truth mutations are not executed directly by Business Health unless a registered adapter preserves the existing MenuList save, validation, audit, and cache-invalidation path.

| Action type | Owner request examples | Reuse path | Risk | Confirmation |
| --- | --- | --- | --- | --- |
| `navigate_business_health` | "Show me more" | `/business-health` route | Navigate | No |
| `open_business_health_detail` | "Show me more" | `/business-health` route | Navigate | No |
| `navigate_analytics` | "Show analytics" | Existing dashboard analytics | Navigate | No |
| `open_dashboard_analytics` | "Show analytics" | Existing dashboard analytics | Navigate | No |
| `navigate_menu` | "Open the menu" | Existing editor route/context | Navigate | No |
| `open_menu_editor_target` | "Open this item" | Existing editor route/context | Navigate | No |
| `open_publish_screen` | "Make this live" | Existing publish/editor screen | Navigate | No |
| `open_feedback_reviews` | "Show feedback" | Existing feedback/review surfaces | Navigate | No |
| `open_business_settings` | "Update business details" | Existing business settings | Navigate | No |
| `open_hours_settings` | "Change today's hours" | Existing hours/settings screen | Navigate | No |
| `open_public_info_settings` | "Update address or phone" | Existing business settings tabs | Navigate | No |
| `open_qr_share` | "Show my QR code" | Existing share/QR surface | Navigate | No |
| `open_customer_app_settings` | "Show app install link" | Existing Customer App settings/share surface | Navigate | No |
| `open_digital_screen_settings` | "Show screen link" | Existing digital screen settings | Navigate | No |
| `open_domain_settings` | "Check my domain" | Existing domain settings | Navigate | No |
| `open_locations` | "Switch outlet" | Existing locations/store switch surface | Navigate | No |
| `open_billing` | "Show credits or plan" | Existing billing screen | Navigate | No |
| `open_users_permissions` | "Who can publish?" | Existing users/roles screen | Navigate | No |
| `open_pos_sync_settings` | "Check POS connection" | Existing integrations/POS screen | Navigate | No |
| `open_compliance_pages` | "Show privacy/refund pages" | Existing compliance settings | Navigate | No |
| `prepare_description_rewrite` | "Rewrite this description" | Compact draft storage; owner completes save in existing editor | Draft/provider text | Existing editor confirmation |
| `menu_item_description_prepare` | "Rewrite this description" | Compact draft storage; owner completes save in existing editor | Draft/provider text | Existing editor confirmation |
| `prepare_review_reply` | "Reply to this review" | Compact review-reply draft storage | Draft/provider text | Owner copies/posts outside assistant |
| `review_reply_prepare` | "Reply to this review" | Existing review suggestion API when owner supplies review text or compact review fact exists | Draft/provider text | Owner copies/posts outside assistant |
| `store_temp_status_set` | "Mark us closed today" | Compact draft storage; existing temp-status screen/API remains source of truth | Draft/store public truth | Existing screen confirmation |
| `store_temp_status_clear` | "Remove temporary status" | Compact draft storage; existing temp-status screen/API remains source of truth | Draft/store public truth | Existing screen confirmation |
| `mark_health_check_reviewed` | "Done" | Assistant action audit doc | Check state | Yes |
| `dismiss_health_check` | "Ignore this" | Assistant action audit doc | Check state | Yes |

## Blocked Actions

These actions are refused in the day-one contract:

- Delete items or categories.
- Bulk delete.
- Direct in-assistant price, availability, visibility, image attach, publish, or store-public writes that bypass existing MenuList save flows.
- Change every price without preview.
- Publish public truth without explicit confirmation.
- Buy credits, change subscription, or make payments.
- Add/remove custom domains or change DNS records.
- Add/remove staff, reset passwords, or change roles.
- Force POS delivery or change POS integration settings.
- Scrape external reviews, competitors, weather, or nearby events at question time.
- Infer revenue/profit and apply pricing from that inference.
- Cross-tenant or cross-store actions outside verified permission scope.
- Direct Firestore writes to public menu/store truth.

## Reuse Rules

Action Support must reuse existing systems:

| Existing system | Action use |
| --- | --- |
| `CommandCenterModal/utils/bulkOperations.ts` | Required if a public-truth mutation adapter is registered |
| `src/database/projects/index.ts` `updateProject()` path | Required for public menu truth save invariants, MCE, MOL, multi-outlet awareness, cache invalidation |
| `publishProject()` | Publish behavior and menu snapshots |
| `descriptionGeneration.shared.ts` and `descriptionUtils.ts` | Add/rewrite descriptions with manual edit protection |
| `prepareMediaImage()`, `uploadFile()`, `associateItemImagesWithProject()` | Item image upload/attach |
| Image generation routes | Provider-generated item images with existing AI accounting |
| `/api/store/temp-status` | Temporary public status set/clear with public cache invalidation |
| `/api/reviews/suggest` | Review reply draft generation with existing AI accounting |
| Business settings tabs | Hours, public info, domain, customer app, digital screen, POS, compliance navigation |
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
- Proposed patch or payload.
- Preview summary when available.
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
| Navigate action from cached packet | 0 Firestore reads | 0-1 audit |
| Prepare description draft | 0 Firestore reads in assistant draft path; provider work is separate and flag-gated | 1 draft + 1 action audit |
| Prepare temporary status set/clear | 0 Firestore reads in assistant draft path | 1 draft + 1 action audit |
| Prepare review reply | 0 Firestore reads when owner provides review text | 1 draft + 1 action audit |
| Confirm public menu/store write | Not exposed directly by Business Health | Existing screen handles save and cache invalidation |
| Mark/dismiss check | 0 | 1 compact action audit write |

No action route may scan analytics, feedback, review, menu change logs, or all projects.

## Failure Behavior

If Action Support has errors:

- Disable `ENABLE_OWNER_BUSINESS_ACTION_SUPPORT`.
- Keep Business Health read-only.
- Do not delete action audit docs.
- Do not retry confirmed public writes automatically.
- Surface a generic owner-safe error.
