# SurfaceOS - Planning Boundary Test Cases

**Status:** Active source-boundary tests
**Command:** `npm run verify:surfaceos-boundary`
**Last verified:** July 17, 2026

| Test | Expected |
| --- | --- |
| Product code | `SURFACE_OS: 'SF'` is reserved |
| Product domain | placeholder exists and `enabled` remains `false` |
| Deployment matrix | no `surfaceos` target |
| App/API paths | no SurfaceOS route exists |
| Feature flags | no executable `ENABLE_SURFACEOS_*` flag |
| Data constants | no SurfaceOS collection |
| Firebase files | no dedicated config, rules, indexes, Storage, or Functions package |
| Environment | no tracked `SURFACEOS_*` key |
| Billing/providers | no executable SurfaceOS flow |
| Public copy | maintained website/help docs remain publication-blocked |
| Historical planning | strategy remains archived and non-authoritative |

Future implementation must replace negative planning assertions with focused
runtime, auth, rule-emulator, provider, cost, mobile, public-route, and release
tests.
