# Weekly Digest Test Cases

| ID | Case | Expected |
| --- | --- | --- |
| WD-001 | Exact seven-day deterministic row | Strict parser admits it. |
| WD-002 | Wrong product, tenant, or store | Parser/rules deny it. |
| WD-003 | Six- or eight-day date range | Parser rejects it. |
| WD-004 | Missing or non-deterministic generation mode | Parser rejects it. |
| WD-005 | Legacy deterministic row without completeness | Renders as incomplete; comparisons remain unavailable. |
| WD-006 | Current 7 days, previous fewer than 7 | Current summary renders; comparisons remain unavailable. |
| WD-007 | Both windows contain 7 admitted days | Comparison metrics render and export. |
| WD-008 | Current source day is incomplete | Scheduled/manual preparation fails closed without write. |
| WD-009 | Invalid daily source row | Writer fails closed. |
| WD-010 | Future generated timestamp | UI marks timestamp invalid. |
| WD-011 | Old completed week | UI marks digest stale. |
| WD-012 | Same source hash | Writer skips weekly write. |
| WD-013 | User has view but not support-management permission | Digest renders; manual prepare is hidden. |
| WD-014 | Support-only staff without readiness permission | Dedicated and shared rules deny the weekly insight read. |
| WD-015 | Suggested route is not permitted | Route action is omitted. |
| WD-016 | Export from partial digest | Comparison values say `Not available`. |
| WD-017 | Long repeated question | Text wraps without resizing the grid. |
| WD-018 | Missing weekly row | Empty state renders with safe recovery. |
| WD-019 | Malformed browser row | Fixed load error; no stored text renders. |
| WD-020 | Manual prepare requested repeatedly | Workspace limiter returns bounded retry behavior. |
| WD-021 | Mobile width | Controls stack, content wraps, and actions remain usable. |
| WD-022 | Scheduled then manual write over identical complete source | Source hash and payload agree; the second writer performs no write. |
| WD-023 | Previous conversation or feedback denominator is absent | The corresponding comparison is `null` and renders `Not available`, not zero. |
| WD-024 | Legacy weekly metric names | Parser maps them into the precise current DTO until regeneration. |
| WD-025 | Existing insight contains retired merged fields | Schema-v2 replacement removes them. |
| WD-026 | Positive-feedback share changes from 50% to 80% | UI/export report `+30.0` percentage points, not `+60%` satisfaction. |
| WD-027 | Missing exact `weekly` insight in an active workspace | Authorized readiness viewer receives an empty result rather than a rules error. |
| WD-028 | Missing insight uses another workspace or a non-`weekly` ID | Dedicated and shared rules deny the read. |
| WD-029 | Existing insight has forged product or scope data | The missing-document exception does not apply; data-bound rules deny the read. |

## Focused Commands

```bash
npm run test:answerlattice-chat-analytics-contracts
npm run test:answerlattice-chat-analytics:scheduler
npm run test:answerlattice-chat-analytics:rules
npm run test:answerlattice-chat-analytics:shared-rules
npm run verify:answerlattice-founder-daily-brief
node scripts/verification/verify-answerlattice-runtime-truth.js
npx tsc --noEmit --pretty false --incremental false
```

The scheduler emulator command clears inherited `GOOGLE_APPLICATION_CREDENTIALS` before emulator startup and test execution.
