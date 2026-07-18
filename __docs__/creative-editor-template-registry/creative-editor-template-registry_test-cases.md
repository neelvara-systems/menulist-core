# Creative Editor Template Registry Test Cases

**Status:** Implemented
**Last Updated:** July 13, 2026

## Platform Manager

| Case | Steps | Expected |
| --- | --- | --- |
| Platform access guard | Open `/platform/asset-templates` as a non-platform user. | Manager content does not render; platform access required message appears. |
| Category catalog load | Open `/platform/asset-templates`; choose `generic`, `food`, or `service`. | Exactly one selected `platformAssetTemplates/{businessCategory}` catalog is read and cards update for that category. |
| Asset filtering is local | After a category loads, switch asset type. | Cards filter by `assetTypeId` without another catalog read. |
| Non-renderable asset disabled | Open asset type selector. | Asset types that do not use the Fabric editor yet are disabled for platform design creation. |
| Create draft platform template | Select category, renderable asset, family, status `Draft`, then start design and save. | Storage document is uploaded and the category catalog receives a draft summary hidden from owner Ready templates. |
| Publish metadata | Select an existing draft, change status to `Published`, and save metadata. | One catalog read/write updates status; no Storage upload is needed. |
| Reopen unpublished template | Select a draft or archived template and choose Edit design. | Platform manager opens the stored editor document even though owner-facing opens still require published templates. |
| Delete platform template | Delete a selected platform template. | Summary is removed from `data`; document and preview Storage cleanup runs best-effort. |
| Concurrent category saves | Save two templates against the same category catalog concurrently. | The transaction retries from current catalog truth and both committed summaries remain. |
| Generic mirror atomicity | Fail one generic catalog write inside the transaction. | No category mirror commits; the uploaded immutable attempt is deleted only after the authoritative probe proves absence. |
| Full platform catalog | Save a new template when the 200-summary cap is reached. | The requested template remains in the bounded catalog and the lowest-priority evicted object is cleaned only after commit. |
| Feature flag off | Disable `ENABLE_PLATFORM_ASSET_TEMPLATE_MANAGER`. | Platform nav item hides and direct manager route shows disabled state. |

## Desktop Printable Assets

| Case | Steps | Expected |
| --- | --- | --- |
| Platform templates load | Open `/assets`; choose asset type. | MenuList template cards can come from the platform catalog when present. |
| Category platform templates load | Open `/assets` with a food, service, or retail store context. | Platform request includes resolved `businessCategory`; templates from `platformAssetTemplates/{businessCategory}` render and are filtered by product, source, and selected asset type in UI. |
| Generic fallback category loads | Open `/assets` with no resolvable business category. | `platformAssetTemplates/generic` is read as the single platform catalog fallback. |
| Asset tab switch is local | Switch between printable asset types after `/assets` is ready. | No additional registry read is needed; cards are filtered from the already-loaded platform/user `data` arrays by product, source, and asset. |
| Generated fallback still loads | Simulate platform catalog failure or empty catalog. | Generated MenuList template family cards render with no blocking global error. Registry failures stay inline to the template section. |
| Save customized template | Open a generated template in editor; change copy; click Save as template. | Success message appears; template is added to Saved designs. |
| Save line-heavy print template | Open a Table Tent or other print template that includes vertical or horizontal divider lines; click Save as template. | Valid line layers with one zero dimension are accepted; zero-size layers are still rejected. |
| Storage quota reached | Force Firebase Storage to return structured code `storage/quota-exceeded`; click Save as template. | Editor shows a clear storage-full message and does not create broken metadata or depend on raw provider exception text. |
| Saved template opens | Click a Saved designs card. | Fullscreen editor opens with saved layout. |
| Current QR is rehydrated | Change selected project, then open saved template. | QR layer value uses selected project's current menu/feedback URL. |
| Save failure is recoverable | Simulate DAL/Storage failure on save. | Editor remains open and generated templates still work. |
| List failure is non-blocking | Simulate platform catalog/store template index read failure. | MenuList template cards still render. |
| Delete saved template | Delete through client action. | Template index entry is removed from `data`, the `default` doc remains, and Storage document/preview are removed. |
| Concurrent saved-design writes | Save or delete while another owner session mutates the same store index. | Transaction retry preserves unrelated committed summaries and applies the requested mutation once. |
| Ambiguous save acknowledgement | Commit the index write, then simulate a lost client acknowledgement. | Probe finds the exact immutable document path and returns the committed summary without deleting it. |
| Failed save probe | Fail the index transaction and fail the authoritative probe. | New attempt-owned objects are retained for reconciliation; existing referenced objects remain untouched. |

## Security

| Case | Expected |
| --- | --- |
| Unauthenticated request | Firestore/Storage rules deny reads and writes. |
| Missing tenant/store scope | DAL throws before user template read/write. |
| Cross-store template ID | Firestore/Storage rules deny without leaking another store template. |
| Wrong source or asset id | DAL does not open or delete a template unless product, source, and requested asset metadata match. |
| Invalid product/source/asset type | Zod validation rejects before persistence. |
| Oversized document | DAL rejects before Storage upload. |
| Raw persistence path in request | Ignored/rejected; DAL computes scoped paths. |
| Platform delete attempt | Owner UI/DAL does not expose platform delete; Storage/Firestore writes require platform admin. |
| Cleanup path substitution | Supply a cross-store, cross-category, or cross-template path through malformed persisted metadata. | Cleanup ownership boundary refuses deletion and logs bounded diagnostics. |
| Versioned filename rules | Upload valid `document-{versionId}.json` and `preview-{versionId}.{ext}` paths. | Correct owner/platform scope and MIME succeed; short/malformed names, cross-store paths, and wrong MIME fail. Legacy exact filenames remain readable/deletable for migration cleanup. |

## Cost

| Case | Expected |
| --- | --- |
| Preview generated template | No registry write. |
| Download generated template | No registry write. |
| Edit without Save as template | No registry write. |
| Save as template | One index read, one index write, one Storage document upload, optional Storage preview upload. |
| List Saved designs | One bounded index doc read. |
| Delete saved template | One index read, one index write, up to two Storage deletes; the `default` index doc remains with `data: []` when empty. |
| List platform templates | One business-category catalog read; no per-asset or second generic platform catalog read. |

## Regression Checks

- Shared editor module does not import Firebase admin/client modules.
- Saved document remains `CreativeEditorDocument`.
- Raw Fabric JSON is not used as saved template truth.
- Thumbnail data is persisted only as a bounded private Storage object when preview capture is enabled.
- Existing printable asset verifier checks registry docs, DAL, Firebase rules, flags, client route, and rehydration helper.
