# Advanced White Label Firebase Contract

## Data Shape

Path: `platformSummary/branding_{tId}_{sId}`

Required document identity: `pId: AL`, exact positive `tId`, exact positive `sId`, and one `branding` map. Standard Answerlattice composer metadata may also be present.

The nested branding map is allowlisted. `customCss`, `fontFamily`, unknown root fields, insecure URLs, credential-bearing URLs, fragments, invalid colors, malformed email, and wrong document scope are rejected by both dedicated and shared Firestore rules.

## Authorization

Read/write requires an authenticated workspace member with widget, workspace, knowledge, or governance control under the existing Answerlattice permission model. Tenant and store claims must match the document identity and document ID.

## Cost

| Action | Reads | Writes |
|---|---:|---:|
| Open editor with an existing or absent profile | 1 | 0 |
| Save valid profile | 0 additional DAL reads | 1 |
| Invalid client input | 0 | 0 |
| Customer runtime request | 0 | 0 |

No query, listener, index, Storage object, Cloud Function, scheduler, AI call, cache-version write, or compiled-bundle write is added.

## Retention And Deletion

The profile is workspace configuration and has no TTL. Workspace deletion must remove the dedicated summary document through the existing workspace-deletion process before customer delivery is enabled. No separate asset is owned by Answerlattice because this prototype accepts links only.

## Deployment

The rule validators require deployment to both Answerlattice QA rules and the shared QA rules target. Local emulator proof does not establish remote deployment.
