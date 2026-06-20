# Business Brain — Implementation Plan

## Service

`BusinessBrainService` owns profile, catalog, brand kit, Brand Playbook, CTA, locale, source confidence, and readiness summaries. Other services read Business Brain through typed service methods, not raw collection access.

## Data Shape

| Entity | Fields |
| --- | --- |
| BusinessBrain | `workspaceId`, `businessBrainId`, `businessType`, `name`, `locality`, `contacts`, `brandKit`, `locale`, `tone`, `readinessStatus` |
| BrandKit | `primaryColor`, `logoUrl`, `voice`, `playbook` |
| BrandPlaybook | `targetAudience`, `brandFeel`, `inspirationNotes`, `visualMotifs`, `avoidList`, `productFocus`, `typographyNotes` |
| RestaurantCatalog | `items`, `categories`, `prices`, `photos`, `availability`, `sourceReferences` |
| SalonCatalog | `services`, `packages`, `prices`, `bookingCTA`, `consentFlags`, `sourceReferences` |
| BusinessFact | `field`, `value`, `sourceType`, `sourceSnapshotId`, `confidence`, `confirmedByUserId`, `updatedAt` |

## APIs

Current runtime:

- `GET /api/campaigncue/workspace`
- `PATCH /api/campaigncue/workspace`

The server derives `workspaceId` from the signed-in tenant/store session and bootstraps the default Business Brain from the existing MenuList store profile through a read-only MenuList Admin source read. CampaignCue workspace, Business Brain, source snapshot, campaign, trust, asset, schedule, approval, and analytics writes use the dedicated CampaignCue Firebase Admin client. Client code does not pass owner/store authority.

Long-term provider/account-specific APIs may still use nested workspace paths, but they must preserve this server-derived workspace boundary.

## Validation

- Validate workspace membership server-side.
- Validate business type enums.
- Block raw generated facts from becoming high-confidence source truth.
- Store Brand Playbook values as bounded owner-edited strings/arrays; do not treat prompt-only style words as verified campaign facts unless saved by the owner.
- Sanitize Firestore writes.
- Keep catalog updates scoped to CampaignCue, not MenuList.

## Acceptance

Business Brain is ready when signed-in store bootstrap or owner-edited details can produce a source-backed campaign cue without duplicate setup. Brand Playbook fields are optional quality inputs for creative briefs, proof decks, editor placeholders, CueLayers source packages, and Trust Center checks; missing playbook details create review posture rather than blocking safe packs. Agency and multi-location posture plus location records exist today; location-specific cue automation requires provider/location setup before activation.
