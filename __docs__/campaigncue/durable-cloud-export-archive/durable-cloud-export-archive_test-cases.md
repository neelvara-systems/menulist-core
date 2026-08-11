# Durable Cloud Export Archive Test Cases

## Deterministic Unit and Contract Tests

1. First save selects slot `a`; later current slots alternate `a -> b -> a`.
2. Derived path includes the exact workspace, campaign, and selected slot.
3. `123456789` produces CRC32C `4waSgw==` and the expected SHA-256.
4. Non-Latin-only and very long campaign titles produce safe, schema-valid ZIP filenames no longer than 120 characters.
5. Empty, oversized, non-ZIP-name, malformed digest, malformed CRC32C, and unknown-field prepare inputs fail.
6. `archive_export` without finalize evidence fails.
7. Any other action carrying archive evidence fails.
8. Persisted current pointers and leases require exact derived paths.
9. Cross-workspace, cross-campaign, and slot/path mismatch records fail parsing.

## Server Security and Reliability Cases

1. Disabled feature returns unavailable without signing Storage access.
2. Missing workspace/campaign, unauthorized role, or wrong location fails.
3. Blocked, stale, expired, waiting-approval, rejected, and unapproved agency packs fail.
4. Matching live generation returns `already_stored` without a lease write or upload.
5. Matching pointer with missing generation creates a replacement lease.
6. An active lease from another member is not returned.
7. Repeating the same member/file prepare reuses the live lease.
8. Different concurrent input fails until the lease expires.
9. Signed PUT includes exact content type, CRC32C, custom metadata, and generation precondition.
10. Corrupt bytes fail Cloud Storage checksum validation.
11. Wrong path, metadata, CRC32C, size, MIME, ZIP header, generation, token, owner, or expired lease fails finalization.
12. ZIP header inspection is pinned to the same immutable generation returned by the metadata read.
13. A stale signed URL cannot overwrite a newer generation.
14. Failed finalization leaves the previous current pointer unchanged.
15. Idempotent replay returns the deterministic asset and current campaign.

## Storage Rules Cases

1. Owner, same-scope nonmember, another workspace, and unauthenticated clients cannot directly read report objects.
2. Owner cannot directly upload, overwrite, or delete report objects.
3. Existing asset, render, template, and CueLayers rule behavior remains unchanged.

## Owner UI Cases

1. Ready campaign shows local ZIP download and cloud save.
2. Saved campaign shows replace and re-download.
3. Duplicate clicks are disabled while the operation runs.
4. `already_stored` updates the local campaign without another action write.
5. A successful finalize updates campaign and Asset Library state once.
6. Save failure keeps local ZIP download available.
7. Copy never claims public sharing, posting, or unlimited history.

## Deployment and Device Cases

1. Exact-origin QA CORS preflight permits required PUT headers.
2. QA service account can sign upload/read URLs but does not expose credentials.
3. Save, replace, and current-generation download pass in an authenticated QA workspace.
4. iOS and Android PWA uploads pass.
5. Bucket versioning/lifecycle configuration preserves the two-object cost intent.
