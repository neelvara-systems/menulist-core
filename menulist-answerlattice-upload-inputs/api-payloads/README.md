# API Payload Notes

Use the Answerlattice dashboard upload/paste UI when possible. It handles source text, file extraction, active-license checks, and owner review.

If using the API directly:

1. Create the job with `create-job.json`.
2. For each line in `add-source-payloads.jsonl`, add a `contentText` field containing the matching file body from `../source-inputs/`.
3. POST each payload to:

```text
/api/answerlattice/knowledge-intake/jobs/{jobId}/sources
```

Notes:

- The route requires authenticated Answerlattice access and an active license.
- `contentText` is capped by the API schema and then normalized by runtime constraints.
- Do not paste private screenshots, tenant IDs, store IDs, tokens, or service account content into `contentText`.
- Media/image upload uses the dashboard media path, not these JSONL text payloads.
- Production onboarding files under `../production-onboarding/` are operating inputs. Upload only the knowledge-oriented parts that should become Answerlattice-reviewed source truth.
- Files `01` through `26` are required before Answerlattice is used by live MenuList SMB owners for help/support. Files `22` through `26` are especially important because they reconcile the live website, public policies, and repo-doc coverage.
