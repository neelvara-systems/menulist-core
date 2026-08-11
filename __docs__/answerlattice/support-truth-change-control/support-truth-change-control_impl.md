# Support Truth Change Control Implementation

## Architecture

```text
Pending release
  -> existing affected-answer query
  -> existing Answer Test summary
  -> canonical evidence source IDs -> capped direct source reads
  -> one product-surface summary read
  -> one source-version read
  -> one bundle-manifest read
  -> strict private preview DTO
  -> owner review modal
  -> existing fingerprinted release activation
```

## Shared Contract

`src/lib/answerlattice/supportTruthChangeControl.ts` owns deterministic DTO schemas and pure projections for:

- source governance watch;
- direct product-surface dependency review;
- compiled truth propagation proof.

It must remain free of Firestore clients, model calls, and UI code.

## Release Server Wiring

`src/lib/answerlattice/releaseServer.ts` keeps the existing release write authority. The preview path:

1. reads and validates the pending release;
2. loads directly affected active answers;
3. retains their validated canonical evidence source IDs internally;
4. loads Answer Test proof;
5. loads only the capped direct Knowledge Intake source references;
6. reads the existing context summary, source-version document, and manifest;
7. builds one strict `changeControl` response.

The optional proof sections do not enter the release activation fingerprint. The fingerprint protects the release and canonical-answer mutation set. Source, surface, and distribution sections are point-in-time advisory evidence and activation itself intentionally changes source-version and manifest state.

## Source Read Boundary

- Maximum direct source lookups: 50.
- Lookup candidates come only from the evidence IDs already present on affected answers.
- Non-Knowledge-Intake evidence IDs are counted as non-governed; they are not probed across collections.
- Malformed legacy evidence references are counted and skipped; they do not make the existing release preview fail.
- A Firestore field mask reads identity, title, status, and governance metadata only.
- Source bodies and excerpts are not loaded or returned.

## Product Surface Boundary

The preview reads `platformSummary/contextContent_{tId}_{sId}`. It never scans product surfaces, articles, FAQs, changelogs, or tickets. The pure projection selects only direct entity-linked surfaces and exposes already-compiled visible counts.

## Propagation Boundary

The preview reads:

- `platformSummary/sourceVersions_{tId}_{sId}`;
- `platformSummary/bundleManifest_{tId}_{sId}`.

The projection validates source-version equality, manifest ownership, bundle reference shape, and enabled delivery modes. It exposes no Storage URL, hash, source counter, or internal bundle path.

## Owner UI Wiring

The existing changelog release-impact modal gains three compact proof sections and existing route handoffs:

- affected answers and Answer Tests;
- evidence source review -> Knowledge Intake;
- mapped surfaces -> Product Surfaces / Knowledge Map;
- compiled distribution -> Activation Command Center.

Knowledge Intake derives approved, due, conflict, and unreviewed counters from its already-loaded job bundle, adding no read.

## Runtime Boundaries

- No new route.
- No new collection or persisted summary.
- No new scheduled work.
- No AI call.
- No public DTO change.
- No autonomous action.
