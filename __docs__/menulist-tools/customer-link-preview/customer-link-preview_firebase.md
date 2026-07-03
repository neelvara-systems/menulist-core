# One Customer Link Preview - Firebase and Cost

**Status:** Implemented V0 public browser-local checker

## V0 Cost Boundary

| Operation | Count |
| --- | ---: |
| Firestore reads | 0 |
| Firestore writes | 0 |
| Storage reads | 0 |
| Storage writes | 0 |
| Cloud Functions | 0 |
| External URL fetches | 0 |
| AI/provider calls | 0 |
| Report storage | 0 |

The report is generated in the browser from owner-entered fields and owner-selected facts.

## Optional Contact Handoff

If the owner explicitly submits the follow-up form, the tool reuses the existing `/api/public/contact` path. That is the only write path and is outside report generation.

## V1 Cost Boundary

V1 maps to existing owner readiness surfaces and already-loaded MenuList store/project truth. No additional report storage or customer-link scan is introduced by this tool.
