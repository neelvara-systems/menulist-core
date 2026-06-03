# Extracted Business Profile Firebase Notes

## Collections

No new collection is introduced.

Touched existing documents:

- `menuImageProcessingJobs/{jobId}`
- `publicMenuDrafts/{draftId}`
- `messagingOnboardingSessions/{sessionId}`
- `projects/{tId}/{sId}/{projectId}`
- `stores/{storeId}` only when the owner accepts preflight suggestions or a new public/messaging store is created
- `tenants/{tenantId}` and `platformSummary/storesSummary` only when the owner manually edits Brand name in business settings

## Read and Write Impact

Owner first extraction:

- No extra project read.
- No extra project write.
- Profile defaults are added to the existing `saveFilesToProject()` transaction write when applicable.

Owner approved re-extraction:

- Optional one project write only when missing visual defaults can be applied.
- Uses existing project DAL/cache invalidation.

Public create-menu:

- No extra draft write.
- Profile fields piggyback on the existing draft completion update.
- Claim writes are inside the existing tenant/store/project transaction.
- New-store claim writes permanent subdomain into `stores`, tenant `subDomain`/`storesList`, and `storesSummary` through the shared onboarding helper.

Messaging onboarding:

- No extra extraction-session write.
- Profile piggybacks on the existing session update when extraction completes.
- Publish writes are inside the existing tenant/store/project/session transaction.
- Publish writes permanent subdomain into `stores`, tenant `subDomain`/`storesList`, and `storesSummary` through the shared onboarding helper.

Owner preflight suggestion acceptance:

- Optional one store write only when the owner selects detected fields.
- Existing store DAL handles summary sync, propagation, and public cache invalidation.

Owner Brand name edit:

- One tenant write.
- One batched store update across the tenant's stores to mirror `tenantName`.
- One summary merge write per affected store.
- One public cache revalidation call per affected store.
- This is intentionally rare owner-initiated identity maintenance, not part of extraction polling or routine menu upload cost.

Subdomain derivation:

- No extra AI cost.
- New-store public/messaging onboarding already performs the subdomain availability read before transaction.
- Store-summary subdomain is written in the same summary merge/write used for store creation or owner-managed subdomain update.
- Existing extraction/re-extraction does not write subdomain.

## Indexes

No Firestore index is required. Profile fields are stored for operational inspection and downstream defaults, not queried as filters.

## AI Cost

No new AI operation is added. Profile extraction is included in the existing main menu extraction prompt. Menu-intake identity remains the existing preflight operation and keeps its current billing mode behavior.

Free/public/internal billing modes are unchanged. Initial free operations still record through the existing AI accounting path with zero owner credit consumption where the existing operation configuration marks them free.

## Cache

- Store updates use the existing store DAL cache invalidation.
- Owner project updates use the existing project DAL cache invalidation.
- Server first-extraction project writes keep the existing `processMenuImagesJob` cache revalidation behavior.
- Brand name updates revalidate each affected store so public menus and official business pages do not show stale brand identity.
