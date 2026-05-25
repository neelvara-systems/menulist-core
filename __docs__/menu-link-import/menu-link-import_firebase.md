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

- One Firestore write for artifact metadata.
- One Firestore write for job creation.
- One Storage write for the source artifact.
- HTML/text/JSON link imports store a normalized text artifact only. Raw HTML is not stored separately.
- Same-origin discovery can add bounded server fetches before artifact creation: up to 6 candidate URLs are considered and up to 4 high-confidence HTML pages can be combined into the single text artifact.
- Rendered fallback adds bounded app-server Chrome CPU only when static acquisition cannot read a safe client-routed menu page. It does not add an extra Storage write beyond the final text artifact.
- Deterministic text extraction can process high-confidence `html_text`, `rendered_html_text`, `plain_text`, and `json_text` artifacts with zero model charge. The existing AI extraction cost applies only when the deterministic parser cannot produce a reliable draft or when the artifact is PDF/image.
- Failed job creation after Storage writes triggers best-effort cleanup of the new private artifact objects and artifact metadata.
- No public cache invalidation until approved review write.

## Security Controls

- Protected route through `withAuth`.
- Tenant/store access via `verifyTenantAccess`.
- Rate limit key scoped to user/tenant/store.
- SAFE_MODE check before acquisition.
- HTTP/HTTPS only.
- DNS and redirect validation before each fetch.
- Request lookup is pinned to the validated public DNS address to reduce DNS rebinding risk.
- Private, loopback, link-local, multicast, and metadata targets blocked.
- Response size cap.
- Bounded total acquisition budget.
- Content type allowlist.
- No credentialed crawling.
