# KitStamp - Test Cases

**Status:** Planning QA matrix
**Created:** May 31, 2026
**Runtime status:** No tests can run until implementation exists.

---

## 1. Product Flag Tests

| Test | Expected |
| --- | --- |
| `ENABLE_KITSTAMP_PRODUCT=false` | No KitStamp dashboard route, API mutation, or provider call is available. |
| `ENABLE_KITSTAMP_PUBLIC_SITE=false` | Public KitStamp site is not served. |
| `ENABLE_KITSTAMP_GENERATION=false` | Generation APIs reject before provider work. |
| `ENABLE_KITSTAMP_EXPORT_KITS=false` | Export kit creation is blocked. |
| `ENABLE_KITSTAMP_EXPORT_TEMPLATES=false` | Template preview/selection is blocked or omitted. |
| `ENABLE_KITSTAMP_EXPORT_ADAPTERS=false` | Adapter preflight/selection is blocked or omitted. |
| `ENABLE_KITSTAMP_MENU_IMPORT=false` | MenuList import preview and confirm routes reject. |
| Provider flag off | No provider call or credit reservation occurs. |

## 2. Routing Tests

| Test | Expected |
| --- | --- |
| `/__kitstamp` local route when enabled | Renders KitStamp local surface. |
| KitStamp host route | Resolves as product route before tenant/custom-domain routing. |
| KitStamp host with MenuList client path | Does not resolve MenuList tenant route. |
| MenuList host | Does not expose KitStamp dashboard. |
| Answerlattice host | Does not expose KitStamp dashboard. |

## 3. Auth And Scope Tests

| Test | Expected |
| --- | --- |
| unauthenticated API call | rejected |
| MenuList-only session calls KitStamp API | rejected unless `productAccounts.KS` exists |
| Answerlattice-only session calls KitStamp API | rejected unless `productAccounts.KS` exists |
| KitStamp reviewer approves allowed unit | accepted |
| reviewer writes outside scope | rejected |
| client tries to write billing ledger | rejected |

## 4. Firebase Rule Tests

| Test | Expected |
| --- | --- |
| document missing `pId` | rejected |
| document has `pId != "KS"` | rejected |
| wrong `tId/sId` | rejected |
| write to immutable export manifest | rejected |
| append review event in scope | accepted |
| source upload outside KitStamp Storage prefix | rejected |
| public bucket read without signed URL | rejected |

## 5. Source Import Tests

| Test | Expected |
| --- | --- |
| import MenuList item snapshot | copied with `sourceContext.sourcePId="ML"` |
| import external file | source hash created |
| source facts change after import | existing content unit can be marked stale |
| KitStamp render after import | no live MenuList read required |
| import attempts MenuList write-back | blocked |
| MenuList-only session calls import API | rejected unless `productAccounts.KS` exists |
| KitStamp user without MenuList source permission | rejected |
| import writes `pId: "ML"` document | rejected |
| import image writes to MenuList Storage path | rejected |
| import batch over 250 selected items | rejected |
| refresh source creates a new source snapshot | old snapshot unchanged |
| export after source refresh with stale unit | blocked |

## 6. Generation Tests

| Test | Expected |
| --- | --- |
| invalid prompt/request | rejected by Zod |
| Safe Mode enabled | provider work blocked |
| insufficient credits | provider work blocked |
| rate limit exceeded | request rejected before provider call |
| provider success | job, asset/text, ledger, and credit settlement written |
| provider failure | job failed and reserved credits refunded/settled correctly |
| generated result | draft status only |

## 7. Review Tests

| Test | Expected |
| --- | --- |
| approve valid candidate | review event written and unit status becomes approved |
| reject candidate | review event written and unit remains not approved |
| approve stale unit | blocked |
| approve without required source facts visible | blocked by UI acceptance |
| generated output marks itself final | impossible |

## 8. Export Kit Tests

| Test | Expected |
| --- | --- |
| export with unapproved units | blocked |
| export approved units | manifest created and export kit ready |
| export manifest after ready | immutable |
| correction after export | new kit version created |
| signed download expired | fresh signed URL required |
| ZIP packaging failure | kit marked failed and audit logged |

## 8a. Export Template Tests

| Test | Expected |
| --- | --- |
| choose built-in template | template ID/version recorded on export kit |
| template requires missing field | preflight blocks export |
| filename collision | resolved by configured policy or blocks export |
| path contains `../` | rejected |
| template tries to include draft candidate | rejected |
| template changes after old kit ready | old kit unchanged |
| custom template builder visible in first implementation | fail |
| arbitrary script in template | rejected |

## 8b. Export Adapter Tests

| Test | Expected |
| --- | --- |
| adapter flag off | adapter routes reject or omit adapter choices |
| generic handoff adapter selected | adapter ID/version recorded in manifest |
| adapter requires missing source fact | preflight blocks or warns based on rule |
| adapter tries to generate missing SKU/GTIN/price | rejected |
| adapter writes outside KitStamp export path | rejected |
| adapter attempts Shopify/Akeneo/Cloudinary API push in first implementation | rejected |
| adapter output includes stale unit | rejected |
| downstream acceptance guarantee appears in copy | fail |

## 9. Mobile Tests

| Test | Expected |
| --- | --- |
| mobile review list loads | paginated and scoped |
| mobile reviewer sees source facts | visible before approval |
| approve from mobile | same API and audit path as desktop |
| reject from mobile | requires note or reason when configured |
| mobile generation provider call directly | impossible |
| mobile large batch setup | not shown |
| mobile export-template configuration | not shown |
| mobile adapter mapping | not shown |
| mobile MenuList bulk import setup | not shown |

## 10. Cost Tests

| Test | Expected |
| --- | --- |
| project list has many projects | paginated, no broad scan |
| content units exceed page size | paginated |
| batch job limit exceeded | rejected before enqueue |
| rejected candidates retention window passes | cleanup eligible under KitStamp function only |
| credit reservation interrupted | ledger stays balanced |
| billing scope missing | no MenuList fallback |

## 11. Product Boundary Tests

| Test | Expected |
| --- | --- |
| KitStamp project created | stored in KitStamp collections only |
| KitStamp asset uploaded | stored in KitStamp Storage only |
| MenuList cache invalidation triggered by KitStamp prep | no, because no MenuList write occurs |
| Answerlattice functions touched by KitStamp job | never |
| GrowthOS action created by KitStamp export | never without explicit future integration |
| Export adapter mutates Shopify/PIM/DAM/Cloudinary/Google | never in first implementation |
| KitStamp export adapter stores external credential | never in first implementation |

## 12. Public Copy Tests

| Test | Expected |
| --- | --- |
| website claims direct publishing | fail |
| website claims guaranteed growth | fail |
| website says KitStamp changes MenuList truth | fail |
| website describes Final Content Kits | pass |
| website claims direct Shopify/PIM/DAM sync | fail |
| helpdoc requires human approval | pass |

## 13. Required Verification Commands After Implementation

```bash
npx tsc --noEmit --incremental false
firebase --config firebase-kitstamp.json emulators:exec "npm run test:kitstamp:rules"
```

Add product route smoke tests after the actual host and route implementation exists.

## 14. Documentation Cost

This QA matrix creates no runtime cost.
