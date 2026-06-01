# GrowthOS Add-on - Test Cases

**Status:** Planning test matrix
**Run before activation:** Yes
**Applies to:** Desktop, mobile, API, DAL, security, cost, docs

---

## 1. Feature Flag Tests

| Test | Expected result |
| --- | --- |
| `ENABLE_GROWTHOS_ADDON=false` | No Growth Kits navigation, Today entry point, API generation, or mobile card is available. |
| `GROWTHOS_ADDON_ACCESS=disabled` | Feature remains hidden even if entitlement exists. |
| `GROWTHOS_DIRECT_POSTING=disabled` | No post/send/schedule API or UI action appears. |
| `GROWTHOS_STAFF_BRIEF_MODE=deterministic` | Staff Brief generation uses current source facts with no provider call. |
| `GROWTHOS_PILOT_STORE_IDS=[]` | Pilot mode shows no store unless its store ID is explicitly listed. |
| `GROWTHOS_PAID_PLAN_IDS=["pro","premium"]` | Paid mode is limited to configured plan IDs or explicit GrowthOS entitlement. |
| `GROWTHOS_IMAGE_MODE=disabled` | Missing item image does not trigger image generation or asset rendering. |
| `GROWTHOS_REVIEW_REPLY_MODE=manual_paste_guarded` | Review reply requires pasted text and triage before draft. |
| offer/quick-reply/photo/multi-outlet pilot flags disabled | No pilot-only UI or API path appears. |

## 2. Entitlement Tests

| Test | Expected result |
| --- | --- |
| Free/base store opens desktop route directly | Access denied with owner-safe message. |
| Free/base store calls generate API directly | API returns forbidden/payment/entitlement response before provider call. |
| Paid eligible store opens module | Growth Kits summary appears. |
| Pilot allowlist excludes store | Store cannot access even when flag is on. |
| Entitlement removed mid-session | Next generation/export attempt is blocked. |

## 3. Source Truth Tests

| Test | Expected result |
| --- | --- |
| Item unavailable | Kit must not promote it. |
| Price changed after kit generation | Kit becomes stale before copy/export. |
| Project unavailable after kit generation | Copy/share/download is blocked as stale. |
| Public menu link missing | Kit either omits link or blocks link-based destination. |
| Store closed today | Kit does not imply the item is available today. |
| Item has no image and image mode is disabled/existing-only | Text and Staff Brief kits still work without generating image. |
| Review text not supplied | Review reply cannot be generated. |
| Staff Brief item unavailable | Staff Brief must not suggest it and should place it in avoid list if relevant. |
| Store-specific facts differ | No cross-store kit reuse unless facts are identical. |
| Legacy project ID from another store | Source project read returns no Growth Kit data. |

## 4. Output Safety Tests

| Test | Expected result |
| --- | --- |
| Prompt attempts to add discount | Output rejects or removes unsupported discount. |
| Prompt attempts "best in city" claim | Output rejects unsupported claim. |
| Prompt attempts to invent offer | Output rejects unsupported offer. |
| Generated copy includes phone number in GBP text | Output warns or removes if not sourced/allowed. |
| Regulated category wording appears | Output blocks or requires owner review. |
| Model returns malformed JSON | API returns safe error without charging if no successful output. |
| Forbidden public language appears | Output guard replaces or rejects it. |

## 5. API Security Tests

| Test | Expected result |
| --- | --- |
| Missing auth | Route rejects. |
| Wrong tenant/store | Route rejects and logs security event. |
| Valid session with another store's project ID | Route rejects or returns no eligible kit before generation/export. |
| Invalid body | Zod validation rejects. |
| Rate limit exceeded | Route rejects before expensive work. |
| Safe Mode on | Provider calls are blocked. |
| Insufficient AI capacity | Provider call is not made. |
| Raw review text causes API error | Raw text is not logged. |

## 6. Firebase Cost Tests

| Test | Expected result |
| --- | --- |
| Open Growth Kits home | One summary read target. |
| Generate deterministic action queue | Bounded reads and changed-only summary write target. |
| Generate Staff Brief | No provider call and no extra write until kit/export action. |
| Generate text kit | Deterministic V1 has no provider call; kit and summary writes only. |
| Copy output | One export write plus changed-only kit/summary status updates. |
| Repeat refresh with unchanged facts/actions | No summary write. |
| Copy/share unchanged latest-kit status | No summary status write. |
| Mark used | Execution signal only; no ROI/order/customer field written. |
| View history | Paginated query only. |
| No activity | No background writes. |

## 7. Desktop UI Tests

| Test | Expected result |
| --- | --- |
| Paid store sees Growth Kits module | Navigation and page render only when gate passes. |
| No eligible action | Shows calm empty state, not suggestions theater. |
| Long item name | Text wraps without layout overlap. |
| Copy action | Clipboard copy succeeds and records export. |
| Stale kit | Copy action blocked or warning requires regeneration. |
| Blocked preflight output | Copy/share/download is blocked until the output is regenerated or reviewed. |
| Staff-only preflight issue | Safe public outputs are not blocked by a staff-only guard result. |
| Staff Brief Pack | Main line, avoid list, menu fallback, copy/share/mark-used render correctly. |
| Used History UI flag disabled | No analytics/history dashboard appears beyond core execution signals. |
| Direct posting | No direct posting control appears. |

## 8. Mobile UI Tests

| Test | Expected result |
| --- | --- |
| Paid store opens mobile Today | Latest Growth Kit entry point is visible when eligible. |
| Copy/share buttons | Minimum 44px target and instant feedback. |
| Long text | Wraps without overlapping buttons. |
| Kit detail sheet | All outputs are reachable without dense desktop UI. |
| Stale kit | Warning is visible and action remains clear. |
| Blocked preflight output | Copy/share is blocked and owner sees a short warning. |
| Refresh/generation failure | Latest loaded kit remains visible with retry state. |
| Staff Brief mobile card | Copy/share/mark-used works with 44px targets. |
| Free/base store | Cannot access through mobile route or deep link. |

## 9. Review Reply Tests

| Test | Expected result |
| --- | --- |
| Positive review pasted | Short deterministic thank-you draft generated. |
| Negative review pasted | Calm owner-approved draft generated or warning shown. |
| Volatile review pasted | System can advise not to reply publicly. |
| Food-safety/legal review pasted | Public reply can be blocked or escalation warning shown. |
| Raw review text on error | Raw review text is not logged or persisted. |
| No pasted text | Generate button disabled. |
| GBP ingestion unavailable | No automatic review fetch is attempted. |

## 10. Pilot Extension Tests

| Test | Expected result |
| --- | --- |
| Existing Image Adaptation enabled | Uses existing item image only, owner-triggered, no AI image provider call. |
| Missing image in image adaptation | Shows Add Photo/readiness prompt; does not generate fake image. |
| Offer Builder disabled | No offer creation UI/API appears. |
| Offer Builder later enabled | Owner-created offer required; expired/unavailable/store-mismatched offers blocked. |
| Customer FAQ snippets enabled | Snippets are deterministic where possible and never act as chatbot/inbox. |
| Photo Capture Prompts enabled | Prompts rank only useful missing-image items and do not become a tutorial. |
| Multi-outlet enabled | Outputs are store-specific and blocked per outlet when facts differ. |
| Used History UI enabled | Shows copied/shared/downloaded/printed/marked-used only; no revenue/ROI. |
| Advanced low-data enabled | Stale price/availability-sensitive copy is not silently reusable offline. |

## 11. Docs And Public Copy Tests

| Test | Expected result |
| --- | --- |
| Website copy claims auto-posting | Fail. |
| Website copy promises orders/revenue | Fail. |
| Helpdoc implies Google publishing is automatic | Fail. |
| Marketing copy uses banned public terms | Fail for public surfaces. |
| Docs mention Firebase cost | Pass required. |
| Docs mention mobile support | Pass required. |

## 12. Rollout Tests

| Test | Expected result |
| --- | --- |
| Internal test store | All paths work with flag on and entitlement active. |
| Pilot store | Owner can create and copy at least one kit without instruction. |
| Non-pilot paid store | Hidden unless access mode allows paid rollout. |
| Feature flag turned off | Module disappears and APIs stop generation safely. |
| Billing capacity exhausted | Owner sees clear capacity message and no provider call occurs. |

## 13. Completion Criteria

Implementation is not complete until:

- desktop and mobile paths pass
- deterministic dry run passes with `npm run verify:growthos`
- API security tests pass
- entitlement bypass tests pass
- Firestore rules/indexes are updated and deployed if changed
- docs match implemented flags, paths, and data shapes
- `npx tsc --noEmit --incremental false` passes for code implementation work
