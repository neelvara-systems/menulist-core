# Menu Link Import Firebase

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

## Storage Paths

```text
menuLinkImports/{tId}/{sId}/{projectId}/{jobId}/source.txt
menuLinkImports/{tId}/{sId}/{projectId}/{jobId}/source.pdf
menuLinkImports/{tId}/{sId}/{projectId}/{jobId}/source.jpg
```

Artifacts are private and immutable. The extraction job receives a tokenized Firebase download URL for the single artifact it must process. Raw HTML is not stored separately in v1.

## Cost Impact

- Oversized or malformed request bodies fail before project reads, source acquisition, Storage writes, artifact metadata, or job creation.
- One Firestore write for artifact metadata.
- One Firestore write for job creation.
- One Storage write for the source artifact.
- HTML/text/JSON link imports store a normalized text artifact only. Raw HTML is not stored separately.
- Link import metadata stores source text presence and length only; it does not store raw source text previews in artifact, job, or public draft metadata.
- Same-origin discovery can add bounded server fetches before artifact creation: up to 6 candidate URLs are considered and up to 4 high-confidence HTML pages can be combined into the single text artifact.
- Rendered fallback adds bounded app-server Chrome CPU and one additional render-target DNS validation only when static acquisition cannot read a safe client-routed menu page. It does not add an extra Storage write beyond the final text artifact.
- Deterministic text extraction can process high-confidence `html_text`, `rendered_html_text`, `plain_text`, and `json_text` artifacts with zero model charge. The existing AI extraction cost applies only when the deterministic parser cannot produce a reliable draft or when the artifact is PDF/image.
- Deterministic text extraction diagnostics add no Firestore reads/writes and no model calls. Success/skip logs use bounded job ID length/count/source metadata and stable local failure codes instead of raw job IDs or exception messages.
- Failed job creation after Storage writes triggers best-effort cleanup of the new private artifact objects and artifact metadata.
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
