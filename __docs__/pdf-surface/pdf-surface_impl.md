# PDF Surface — Compatibility Implementation

**Status:** Implemented compatibility bridge
**Last Updated:** July 16, 2026

---

## Runtime Topology

```text
Legacy or flag-off Menu PDF caller
  -> generateMenuPdf(options)
     -> normalize caller project/store context
     -> buildPrintSource()
     -> buildDefaultSettings(home_print)
     -> renderPdf()
  -> downloadPdf(result)
     -> browser Blob download

Normal current owner action
  -> /use-menulist/menu-card-export
```

## Source Ownership

| Concern | Current source |
| --- | --- |
| Compatibility adapter | `src/lib/export/menuPdfGenerator.ts` |
| Canonical print model/renderer | `src/lib/menu-card-export/` |
| Routed desktop/mobile controller | `src/hooks/useMenuCardExportController.ts` |
| Routed desktop UI | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx` |
| MobileShell UI | `src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx` |

The adapter may receive already-loaded item/category arrays or full project/store context from older callers. It must not restore the archived CRC32/density/header/footer renderer as a parallel implementation.

## Persistence and Cost

Generation and delivery are browser-local. The adapter adds no Firestore write, Storage upload, export API route, server artifact, rule, index, or Cloud Function. A caller may need one existing selected-project read when its mobile cache does not already hold full project data.

The routed Menu Card Export workflow owns device-local history. Its keys are tenant/store/project scoped and its writes are best-effort; PDF Surface does not add another history store.

## Failure Contract

- Invalid or empty source stays an owner-safe generation failure or empty-state path.
- Because `menuUrl` is optional on the compatibility DTO, an absent, malformed,
  credential-bearing, or non-HTTP(S) destination disables QR output even when
  the auto-design would normally include it. A valid destination still
  respects explicit `showQrCode` or the auto-design default.
- A file is reported successful only after the browser delivery helper returns.
- Native file-share cancellation and unsupported sharing are owned by the Menu Card Export shared browser file-share contract, not by this adapter.
- Raw project/store/menu payloads and generated file bodies are excluded from diagnostics.

## Historical Material

The archived v2.2 implementation guide describes the removed standalone layout implementation. It is retained for history only and is not a current code contract.

## Verification

```bash
npm run verify:menu-export
npm run verify:menu-card-export
npm run test:print-export-browser-boundaries
npx tsc --noEmit --incremental false --pretty false
```
