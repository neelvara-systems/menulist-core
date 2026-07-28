# Menu Link Import Firebase

**Boundary Reviewed:** July 13, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Link Import evidence only. Both current intake paths require a signed-in owner before source acquisition or extraction: the owner app uses `/api/menu-link-imports`, while the public `/create-menu` page submits through the authenticated `/api/public/create-menu` route. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:functions-deploy-preflight`, authenticated desktop/mobile owner-flow QA, signed-in `/create-menu` browser QA, direct and rendered source-acquisition smoke, Gemini extraction provider smoke where fallback is used, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

The authenticated owner route re-reads `stores/{sId}` and requires current persisted `canUseMenuExtraction` after bounded input validation and before project reads, HTTP/render acquisition, Storage writes, artifact creation, or job creation. This adds one store permission read per valid non-platform owner-route request; rejected requests produce none of the downstream operations. Platform sessions retain the shared permission helper's explicit zero-read bypass. The signed-in public-draft adapter keeps its separate existing admission contract.

## Collections

### `menuLinkImportArtifacts/{artifactId}`

Stores source acquisition metadata only.

```ts
{
  artifactId: string;
  jobId: string;
  projectId: string;
  tId: string;
  sId: string;
  uId: string;
  sourceUrl: string;
  finalUrl: string;
  contentType: string;
  sourceKind: "html_text" | "rendered_html_text" | "plain_text" | "json_text" | "pdf" | "image";
  sourceTextLength?: number;
  sourceTextPresent?: boolean;
  storagePath: string;
  contentHash: string;
  size: number;
  acquisitionProvider: "direct-http";
  redirectCount: number;
  permissionConfirmed: true;
  createdAt: Timestamp;
}
```

### `menuImageProcessingJobs/{jobId}`

Existing collection. Link import adds optional fields:

```ts
{
  source: "menu_link_import";
  forceReview: true;
  sourceMetadata: {
    artifactId: string;
    sourceUrl: string;
    finalUrl: string;
    acquisitionProvider: "direct-http";
    sourceKind: string;
    sourceTextLength?: number;
    sourceTextPresent?: boolean;
  }
}
```

### Signed-in `/create-menu` adapter

The public website page is reachable before sign-in, but it does not perform anonymous acquisition. Link submit redirects unauthenticated visitors to sign-in, and `POST /api/public/create-menu` is protected by `withAuth`.

After sign-in, this adapter:

- stores one private source object under `publicMenuDrafts/{draftId}/source.{ext}`;
- writes one owner-bound `publicMenuDrafts/{draftId}` document with a 24-hour TTL and link-source metadata;
- writes one shared `menuImageProcessingJobs/{jobId}` extraction job targeting the public draft;
- rate-limits with HMAC-hashed user identity through `PUBLIC_MENU_ENTRY_AUTH`;
- requires authenticated claim before creating tenant/store/project truth or publishing.

It does not create a `menuLinkImportArtifacts` document because the temporary `publicMenuDrafts` record owns source metadata until claim.

## Storage Paths

```text
menuLinkImports/{tId}/{sId}/{projectId}/{jobId}/source.txt
menuLinkImports/{tId}/{sId}/{projectId}/{jobId}/source.pdf
menuLinkImports/{tId}/{sId}/{projectId}/{jobId}/source.jpg
```

Artifacts are private and immutable. The extraction job receives a tokenized Firebase download URL for the single artifact it must process. Raw HTML is not stored separately in v1.

The consolidated MenuList maintenance scheduler retains authenticated link-import sources for the same seven-day window as terminal extraction jobs. Its daily `menu_old_cleanup` task scans at most 100 old artifact rows, batch-loads their jobs, and deletes only exact tenant/store/project/owner/job-bound `source.txt`, `source.pdf`, `source.jpg`, `source.png`, or `source.webp` paths. Active jobs are skipped. Storage is deleted before `menuLinkImportArtifacts` metadata; unsafe bindings or failed Storage deletes preserve the metadata as the durable retry record and fail the scheduler task observably.

July 28 audit hardening also covers pre-job cleanup. Storage is necessarily written before the atomic active-job claim. If a concurrent request loses that claim or later job persistence fails, immediate Storage deletion now returns an acknowledged outcome. When deletion fails, the route creates the already validated artifact row as the durable cleanup record before it discards the local path; if neither action succeeds, the route returns failure and emits bounded diagnostics. This prevents a private loser object from becoming invisible to retention. The failure-only recovery adds at most one artifact write and the existing bounded seven-day cleanup work.

## Cost Impact

- The owner-app path uses one `menuLinkImportArtifacts` write, one `menuImageProcessingJobs` write, and one private Storage object before extraction.
- The signed-in `/create-menu` path uses one `publicMenuDrafts` write, one `menuImageProcessingJobs` write, and one private Storage object before extraction; reusable owner-bound drafts may avoid duplicate creation.
- Oversized or malformed request bodies fail before project reads, source acquisition, Storage writes, artifact metadata, or job creation.
- HTML/text/JSON link imports store a normalized text artifact only. Raw HTML is not stored separately.
- Link import metadata stores source text presence and length only; it does not store raw source text previews in artifact, job, or public draft metadata.
- Same-origin discovery can add bounded server fetches before artifact creation: up to 6 candidate URLs are considered and up to 4 high-confidence HTML pages can be combined into the single text artifact.
- Rendered fallback adds bounded app-server Chrome CPU and one additional render-target DNS validation only when static acquisition cannot read a safe client-routed menu page. It does not add an extra Storage write beyond the final text artifact.
- Deterministic text extraction can process high-confidence `html_text`, `rendered_html_text`, `plain_text`, and `json_text` artifacts with zero model charge. The existing AI extraction cost applies only when the deterministic parser cannot produce a reliable draft or when the artifact is PDF/image.
- Deterministic text extraction diagnostics add no Firestore reads/writes and no model calls. Success/skip logs use bounded job ID length/count/source metadata and stable local failure codes instead of raw job IDs or exception messages.
- Failed/lost job creation after Storage writes requires either confirmed object deletion or a durable artifact cleanup record; failure-only recovery may add one metadata write.
- Terminal or already-pruned authenticated link-import jobs add one bounded daily retention read per artifact, one Storage delete, and one batched artifact-metadata delete after seven days. The task is capped at 100 artifacts per run and uses the existing scheduler/lease rather than a new scheduled Function or index.
- Authenticated route diagnostics add no Firestore reads/writes, Storage operations, provider calls, or model calls; they log only bounded project/job/artifact/source-kind presence-length metadata, status/count booleans, and normalized source error metadata.
- June 29 limiter-key hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, or Firebase deploy requirement. The route still uses the same `MENU_LINK_IMPORT` limiter profile, but owner, tenant, and store key material is HMAC-hashed before storage in Upstash.
- Local/emulator dev-trigger failure diagnostics add no Firestore reads/writes beyond the existing best-effort job snapshot read and callable attempt; failures log only bounded job/environment metadata and normalized source error metadata.
- June 29 browser response-parse hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, source-acquisition calls, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. The browser helper only caps `POST /api/menu-link-imports` response parsing at 8KB, logs `menu_link_import_response_parse_failed` / `menu_link_import_response_invalid` with bounded metadata, and preserves the existing fixed owner fallback for malformed acknowledgement responses.
- June 30 browser request-policy hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, source-acquisition calls, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. The shared desktop/mobile browser helper now submits `POST /api/menu-link-imports` with same-origin credentials, `no-store` cache policy, and manual redirect handling before bounded acknowledgement parsing.
- No public cache invalidation until approved review write.

## Security Controls

- Protected route through `withAuth`.
- Tenant/store access via `verifyTenantAccess`.
- Rate limit key scoped to HMAC-hashed user/tenant/store key material.
- SAFE_MODE check before acquisition.
- HTTP/HTTPS only.
- DNS and redirect validation before each fetch.
- Request lookup is pinned to the validated public DNS address to reduce DNS rebinding risk.
- Private, loopback, link-local, multicast, and metadata targets blocked.
- Rendered fallback revalidates and DNS-pins the render URL before Chrome starts, skips IP-literal render targets, sends non-target hostnames through a dead proxy, and removes Chrome's implicit loopback proxy bypass.
- Response size cap.
- Bounded total acquisition budget.
- Content type allowlist.
- No credentialed crawling.
