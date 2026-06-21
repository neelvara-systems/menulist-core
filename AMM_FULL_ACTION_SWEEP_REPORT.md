# AMM Full Action Sweep Report

**Date/time:** 2026-06-20 18:14 IST  
**Branch:** staging  
**Commit:** 81fdef8c  
**App URL intended for Chrome test:** http://localhost:3000/menu-manager  
**Selected store/project:** Not captured in this sweep because the Chrome connector failed before tab claim/page interaction.  
**Browser/device viewport:** Chrome requested; UI runtime validation blocked by Chrome plugin connector. No UI result below is claimed as live-click verified.

## Environment

AMM feature flags in [src/config/features.ts](/Users/danny/Projects/MenuListAi/menulist-core/src/config/features.ts:1066):

| Flag | Value |
| --- | --- |
| `ENABLE_AI_MENU_MANAGER` | `true` |
| `ENABLE_AI_MENU_MANAGER_MOBILE` | `true` |
| `ENABLE_AI_MENU_MANAGER_VOICE_INPUT` | `true` |
| `ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS` | `true` |
| `ENABLE_AI_MENU_MANAGER_RULES` | `true` |
| `ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES` | `true` |
| `ENABLE_AI_MENU_MANAGER_DEBUG_ARTIFACTS` | `false` |
| `AI_MENU_MANAGER_SESSION_STORAGE_MODE` | `daily_compact` |

## Chrome Runtime Status

Chrome validation is **blocked**. The required Chrome plugin path failed before browser runtime startup with:

`Mcp error: -32602: js: codex/sandbox-state-meta: missing field sandboxPolicy`

I read the Chrome plugin troubleshooting guide and retried once through the required plugin path. The same connector error repeated. The troubleshooting guide says not to complete a Chrome task through AppleScript, bash browser scripting, or other fallback automation when extension communication fails. Therefore this report does **not** claim actual UI click-through coverage.

## Summary

| Metric | Count |
| --- | ---: |
| Action definitions in code registry | 110 |
| Current executable client-project mutation actions | 19 |
| Unique checklist action IDs parsed from checklist tables | 218 |
| Checklist IDs not present in code registry | 118 |
| Code registry IDs not parsed as checklist table rows | 10 |
| Chrome UI actions live-tested | 0 |
| Verifier-backed deterministic executable actions | 19 |
| Intentionally blocked/unsupported registry actions | 16 |
| Remaining critical failures in automated checks | 0 |

Readiness counts:

| Readiness | Count |
| --- | ---: |
| `ready_adapter` | 34 |
| `needs_adapter_glue` | 52 |
| `manual_task_only` | 14 |
| `blocked` | 2 |
| `existing_api_only` | 8 |

Execution mode counts:

| Execution mode | Count |
| --- | ---: |
| `client_project_mutation` | 35 |
| `manual_task_card` | 17 |
| `existing_api_job` | 12 |
| `read_only_card` | 12 |
| `existing_client_dal` | 21 |
| `browser_local_export` | 11 |
| `existing_server_api` | 2 |

## Core Findings

- The current production executable boundary is the 19-action `AI_MENU_MANAGER_EXECUTABLE_ACTIONS` list. These actions are verifier-covered for resolver, card, approval metadata, patch creation, stale-hash direction, compact session DAL use, and project patch verification.
- Actual Chrome owner-POV UI testing could not run because the Chrome plugin connector failed before the opened tab could be claimed.
- The checklist is broader than the code registry. 118 checklist action IDs are not present in `AI_MENU_MANAGER_ACTION_DEFINITIONS`. They remain catalog/discovery rows, not live registry actions. This is the main readiness gap before claiming full checklist coverage.
- No code changes were made in this sweep after the previous AMM resolver/registry tightening; the only added artifact is this report.

## Action-by-Action Registry Table

| Action type | Command tested | Expected | Observed | Buttons tested | Execution verified | Cost verified | Mobile verified | Fix | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `item_price_update` | Masala tea 20 now | client_project_mutation / high_confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `item_create` | Not UI-run; classified from registry | manual_task_card / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | Compact proposal/session write | Task card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_name_update` | rename Masala Tea to Kadak Masala Tea | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `item_description_update` | Add description for Masala Tea: Strong tea with fresh spices. | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `item_description_generate` | Not UI-run; classified from registry | existing_api_job / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C2 job/storage | Draft card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_description_refresh` | Not UI-run; classified from registry | existing_api_job / bulk_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C2 job/storage | Summary card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_category_update` | move Cold coffee to Starters | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `item_availability_update` | Masala chai khatam hai / Cold coffee sold out | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Fast card | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `item_visibility_update` | deactivate Cold coffee item | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Fast card | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `item_attribute_create` | Not UI-run; classified from registry | manual_task_card / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | Compact proposal/session write | Task card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_attribute_update` | Not UI-run; classified from registry | client_project_mutation / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_attribute_delete` | Not UI-run; classified from registry | manual_task_card / destructive_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | Compact proposal/session write | Task card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_attribute_name_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_attribute_price_update` | Not UI-run; classified from registry | client_project_mutation / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_attribute_visibility_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Fast card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_attribute_order_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_bestseller_update` | mark Cold coffee as bestseller | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `item_prep_time_update` | set Cold coffee prep time to 10 minutes | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `item_promotion_weight_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_metadata_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_metadata_generate` | Not UI-run; classified from registry | existing_api_job / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C2 job/storage | Draft card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_translation_repair` | Not UI-run; classified from registry | existing_api_job / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C2 job/storage | Draft card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_image_update` | Not UI-run; classified from registry | manual_task_card / confirm / manual_task_only | manual_task_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | C5 manual only | Image task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `item_order_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_quality_review_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Fast card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `item_identity_reference` | Not UI-run; classified from registry | read_only_card / none / blocked | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Blocked by registry. | C0 local | Read-only card | None in this pass | Classified only; live UI blocked | BLOCKED |
| `item_delete` | Not UI-run; classified from registry | manual_task_card / destructive_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | Compact proposal/session write | Destructive task card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `category_create` | Not UI-run; classified from registry | manual_task_card / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | Compact proposal/session write | Task card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `category_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `category_name_update` | rename Drinks category to Beverages | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `category_visibility_update` | deactivate Drinks category | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Fast card | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `category_icon_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `category_image_update` | Not UI-run; classified from registry | manual_task_card / confirm / manual_task_only | manual_task_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `category_time_slot_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `category_time_slot_preset_create` | Not UI-run; classified from registry | existing_client_dal / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Task card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `category_translation_repair` | Not UI-run; classified from registry | existing_api_job / bulk_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C2 job/storage | Summary card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `category_order_update` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `category_identity_reference` | Not UI-run; classified from registry | read_only_card / none / blocked | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Blocked by registry. | C0 local | Read-only card | None in this pass | Classified only; live UI blocked | BLOCKED |
| `category_delete` | Not UI-run; classified from registry | manual_task_card / destructive_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | Compact proposal/session write | Destructive task card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `decision_blocks_update` | Show Cold coffee in Featured section | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Fast card | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `menu_special_note_update` | Show note: Fresh menu today | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Fast card | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `menu_design_mood_update` | Set menu tone to Premium & Minimal | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `menu_design_layout_update` | Use grid layout | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `menu_design_preset_apply` | Make menu premium | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `menu_design_visibility_update` | Hide item prices / Show category icons | client_project_mutation / high_confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `menu_design_color_update` | Set theme color to Gold | client_project_mutation / confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Card approve/edit | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `bulk_price_update` | increase all drinks by 10 | client_project_mutation / bulk_confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Summary card | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `bulk_availability_update` | mark all drinks unavailable | client_project_mutation / bulk_confirm / ready_adapter | Static resolver/card/patch verifier passed; Chrome UI blocked before page interaction. | Approve/Edit/Cancel expected. | Verified by static execution-directive and patch tests; browser approval not performed. | C1 single project save | Summary card | None in this pass | Verifier passed; live UI retest blocked | CODE PASS / UI BLOCKED |
| `image_item_generate` | Not UI-run; classified from registry | existing_api_job / confirm / existing_api_only | existing_api_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C2 job/storage | Draft card | None in this pass | Classified only; live UI blocked | EXISTING API ONLY |
| `image_item_apply_generated` | Not UI-run; classified from registry | client_project_mutation / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Image/card approve | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `menu_file_upload` | Not UI-run; classified from registry | existing_api_job / confirm / existing_api_only | existing_api_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C2 job/storage | Upload card | None in this pass | Classified only; live UI blocked | EXISTING API ONLY |
| `menu_link_import` | Not UI-run; classified from registry | existing_api_job / confirm / existing_api_only | existing_api_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C2 job/storage | Upload card | None in this pass | Classified only; live UI blocked | EXISTING API ONLY |
| `menu_import_review_apply` | Not UI-run; classified from registry | client_project_mutation / bulk_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C1 single project save | Review card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `special_menu_create` | Not UI-run; classified from registry | existing_api_job / high_confirm / existing_api_only | existing_api_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Native mobile screen | None in this pass | Classified only; live UI blocked | EXISTING API ONLY |
| `special_menu_activate` | Not UI-run; classified from registry | existing_api_job / high_confirm / existing_api_only | existing_api_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Native mobile screen | None in this pass | Classified only; live UI blocked | EXISTING API ONLY |
| `menu_publish` | Not UI-run; classified from registry | existing_api_job / high_confirm / existing_api_only | existing_api_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Fast card | None in this pass | Classified only; live UI blocked | EXISTING API ONLY |
| `menu_share_copy_link` | Not UI-run; classified from registry | browser_local_export / none / ready_adapter | Registry and resolver fixtures classify as local export where covered; no Firestore proposal expected by cost contract. Chrome UI blocked. | Copy/Open/Download or Cancel expected; no approval. | Must stay browser-local; not mutation-tested. | C0 local | Share card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `menu_qr_download` | Not UI-run; classified from registry | browser_local_export / external_confirm / ready_adapter | Registry and resolver fixtures classify as local export where covered; no Firestore proposal expected by cost contract. Chrome UI blocked. | Copy/Open/Download or Cancel expected; no approval. | Must stay browser-local; not mutation-tested. | C0 local | Download card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `menu_design_background_update` | Not UI-run; classified from registry | manual_task_card / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | C2 job/storage | Task card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `menu_design_settings_open` | Not UI-run; classified from registry | manual_task_card / none / manual_task_only | manual_task_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `menu_temp_status_set` | Not UI-run; classified from registry | existing_server_api / high_confirm / existing_api_only | existing_api_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C4 guarded server mutation | Fast card | None in this pass | Classified only; live UI blocked | EXISTING API ONLY |
| `menu_temp_status_clear` | Not UI-run; classified from registry | existing_server_api / confirm / existing_api_only | existing_api_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C4 guarded server mutation | Fast card | None in this pass | Classified only; live UI blocked | EXISTING API ONLY |
| `store_business_profile_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `store_locale_region_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `store_working_hours_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `store_time_slot_preset_create` | Not UI-run; classified from registry | existing_client_dal / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `store_time_slot_preset_update` | Not UI-run; classified from registry | existing_client_dal / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `store_time_slot_preset_delete` | Not UI-run; classified from registry | existing_client_dal / destructive_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `store_address_contact_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `public_presence_text_update` | Not UI-run; classified from registry | existing_client_dal / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `public_presence_link_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `public_presence_link_share` | Not UI-run; classified from registry | browser_local_export / none / ready_adapter | Registry and resolver fixtures classify as local export where covered; no Firestore proposal expected by cost contract. Chrome UI blocked. | Copy/Open/Download or Cancel expected; no approval. | Must stay browser-local; not mutation-tested. | C0 local | Share card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `public_presence_qr_download` | Not UI-run; classified from registry | browser_local_export / external_confirm / ready_adapter | Registry and resolver fixtures classify as local export where covered; no Firestore proposal expected by cost contract. Chrome UI blocked. | Copy/Open/Download or Cancel expected; no approval. | Must stay browser-local; not mutation-tested. | C0 local | Download card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `public_presence_social_links_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `public_presence_business_attributes_update` | Not UI-run; classified from registry | existing_client_dal / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `public_presence_business_copy_generate` | Not UI-run; classified from registry | existing_api_job / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C2 job/storage | Draft card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `seo_settings_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `analytics_tracking_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `domain_subdomain_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Task card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `customer_app_settings_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `customer_app_icon_update` | Not UI-run; classified from registry | existing_client_dal / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C2 job/storage | Image/card approve | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `customer_app_install_link_share` | Not UI-run; classified from registry | browser_local_export / external_confirm / ready_adapter | Registry and resolver fixtures classify as local export where covered; no Firestore proposal expected by cost contract. Chrome UI blocked. | Copy/Open/Download or Cancel expected; no approval. | Must stay browser-local; not mutation-tested. | C0 local | Copy/open/download card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `digital_screen_status_card` | Not UI-run; classified from registry | read_only_card / none / needs_adapter_glue | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Not executed by design in this sweep. | C3 summary/store write | Status card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `digital_screen_link_share` | Not UI-run; classified from registry | browser_local_export / external_confirm / ready_adapter | Registry and resolver fixtures classify as local export where covered; no Firestore proposal expected by cost contract. Chrome UI blocked. | Copy/Open/Download or Cancel expected; no approval. | Must stay browser-local; not mutation-tested. | C0 local | Share card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `digital_screen_override_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `digital_screen_slide_upload` | Not UI-run; classified from registry | existing_client_dal / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C2 job/storage | Upload card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `feedback_inbox_list` | Not UI-run; classified from registry | read_only_card / none / needs_adapter_glue | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Not executed by design in this sweep. | C3 summary/store write | Summary card | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `feedback_reply_save` | Not UI-run; classified from registry | existing_client_dal / confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `feedback_link_share` | Not UI-run; classified from registry | browser_local_export / external_confirm / ready_adapter | Registry and resolver fixtures classify as local export where covered; no Firestore proposal expected by cost contract. Chrome UI blocked. | Copy/Open/Download or Cancel expected; no approval. | Must stay browser-local; not mutation-tested. | C0 local | Copy/open/download card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `feedback_qr_download` | Not UI-run; classified from registry | browser_local_export / external_confirm / ready_adapter | Registry and resolver fixtures classify as local export where covered; no Firestore proposal expected by cost contract. Chrome UI blocked. | Copy/Open/Download or Cancel expected; no approval. | Must stay browser-local; not mutation-tested. | C0 local | Download/copy card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `pos_sync_settings_update` | Not UI-run; classified from registry | existing_client_dal / high_confirm / needs_adapter_glue | needs_adapter_glue registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Must remain handoff/blocked until adapter is connected. | Not executed by design in this sweep. | C3 summary/store write | Card approve/edit | None in this pass | Classified only; live UI blocked | NEEDS ADAPTER GLUE |
| `pos_sync_setup_info_copy` | Not UI-run; classified from registry | browser_local_export / external_confirm / ready_adapter | Registry and resolver fixtures classify as local export where covered; no Firestore proposal expected by cost contract. Chrome UI blocked. | Copy/Open/Download or Cancel expected; no approval. | Must stay browser-local; not mutation-tested. | C0 local | Copy card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `pos_sync_technical_summary_copy` | Not UI-run; classified from registry | browser_local_export / external_confirm / ready_adapter | Registry and resolver fixtures classify as local export where covered; no Firestore proposal expected by cost contract. Chrome UI blocked. | Copy/Open/Download or Cancel expected; no approval. | Must stay browser-local; not mutation-tested. | C0 local | Copy card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `pos_sync_sample_payload_download` | Not UI-run; classified from registry | browser_local_export / external_confirm / ready_adapter | Registry and resolver fixtures classify as local export where covered; no Firestore proposal expected by cost contract. Chrome UI blocked. | Copy/Open/Download or Cancel expected; no approval. | Must stay browser-local; not mutation-tested. | C0 local | Download card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `integration_status_review` | Not UI-run; classified from registry | read_only_card / none / ready_adapter | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Not executed by design in this sweep. | C0 local | Status card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `locations_screen_open` | Not UI-run; classified from registry | manual_task_card / none / manual_task_only | manual_task_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `staff_access_open` | Not UI-run; classified from registry | manual_task_card / none / manual_task_only | manual_task_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `roles_permissions_open` | Not UI-run; classified from registry | manual_task_card / none / manual_task_only | manual_task_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `billing_screen_open` | Not UI-run; classified from registry | manual_task_card / none / manual_task_only | manual_task_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `transactions_screen_open` | Not UI-run; classified from registry | read_only_card / none / manual_task_only | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `business_health_open` | Not UI-run; classified from registry | read_only_card / none / manual_task_only | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `past_activity_open` | Not UI-run; classified from registry | read_only_card / none / manual_task_only | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `print_assets_open` | Not UI-run; classified from registry | manual_task_card / none / manual_task_only | manual_task_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `print_menu_open` | Not UI-run; classified from registry | manual_task_card / none / manual_task_only | manual_task_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `help_screen_open` | Not UI-run; classified from registry | read_only_card / none / manual_task_only | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Not executed by design in this sweep. | C5 manual only | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `system_manual_task_create` | Not UI-run; classified from registry | manual_task_card / none / manual_task_only | manual_task_only registry classification present; not executable unless adapter glue/existing guarded path is connected. Chrome UI blocked. | Exact handoff/local controls or Cancel; no fake external done. | Not executed by design in this sweep. | Compact proposal/session write | Task card | None in this pass | Classified only; live UI blocked | MANUAL TASK ONLY |
| `system_context_answer` | Not UI-run; classified from registry | read_only_card / none / ready_adapter | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Not executed by design in this sweep. | C0 local plus compact session doc | Answer card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `system_clarification_request` | Not UI-run; classified from registry | read_only_card / none / ready_adapter | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Not executed by design in this sweep. | C0 local | Conversation card | None in this pass | Classified only; live UI blocked | READY ADAPTER |
| `system_unsupported_action` | Not UI-run; classified from registry | read_only_card / none / ready_adapter | Registry/read-only classification present; no approval or mutation expected. Chrome UI blocked. | Cancel or suggested draft only; no approval. | Not executed by design in this sweep. | C0 local plus compact session doc | Unsupported card | None in this pass | Classified only; live UI blocked | READY ADAPTER |

## Checklist-Only Action IDs Not In Code Registry

These are present in [ai-menu-manager_action-type-checklist.md](/Users/danny/Projects/MenuListAi/menulist-core/__docs__/ai-menu-manager/ai-menu-manager_action-type-checklist.md:1) but not in `AI_MENU_MANAGER_ACTION_DEFINITIONS` today. They are not owner-reachable registry actions in this implementation pass:

- `bulk_visibility_update`
- `bulk_category_move`
- `bulk_text_case_update`
- `menu_repair`
- `menu_repair_language`
- `menu_repair_descriptions`
- `menu_repair_category_icons`
- `menu_missing_price_review`
- `menu_price_outlier_mark_reviewed`
- `menu_missing_photo_task`
- `menu_pdf_page_prepare`
- `menu_intake_identity_check`
- `menu_import_job_start`
- `menu_import_job_cancel`
- `menu_import_business_identity_accept`
- `menu_import_create_new_project`
- `menu_import_review_discard`
- `menu_upload_file_remove`
- `menu_upload_unprocessed_clear`
- `menu_import_retry_instruction`
- `image_item_upload`
- `image_item_regenerate`
- `image_item_edit`
- `image_batch_generation_start`
- `image_batch_result_apply`
- `image_preferences_update`
- `image_obp_cover_upload`
- `image_obp_cover_generate`
- `image_obp_gallery_update`
- `project_create`
- `project_metadata_update`
- `project_image_update`
- `project_active_update`
- `project_set_default`
- `project_duplicate`
- `project_delete`
- `project_restore`
- `project_reset_files`
- `project_language_update`
- `project_public_content_translate`
- `project_public_content_repair`
- `project_ai_defaults_update`
- `menu_reorder`
- `menu_snapshot_create`
- `menu_share_whatsapp`
- `menu_pdf_download`
- `menu_data_export_json`
- `menu_data_export_xlsx`
- `menu_data_post_external`
- `menu_kit_download`
- `menu_kit_asset_download`
- `menu_kit_asset_share`
- `item_share_card_download`
- `item_share_card_share`
- `physical_surface_tent_card_download`
- `physical_surface_sticker_download`
- `menu_card_export_create`
- `menu_card_export_style_update`
- `menu_card_design_suggest`
- `menu_card_design_apply`
- `special_menu_list`
- `special_menu_update`
- `special_menu_deactivate`
- `special_menu_cancel`
- `special_menu_name_translate`
- `outlet_scope_select`
- `outlet_override_update`
- `outlet_project_save`
- `outlet_store_customization_update`
- `outlet_theme_override_update`
- `outlet_create`
- `outlet_billing_capacity_required`
- `outlet_delete_or_unlink`
- `public_presence_action_toggle`
- `public_presence_google_review_update`
- `public_presence_accent_update`
- `public_presence_business_copy_translation_repair`
- `store_logo_update`
- `feedback_settings_update`
- `domain_subdomain_check`
- `domain_custom_check`
- `domain_custom_connect`
- `domain_custom_verify`
- `domain_custom_remove`
- `compliance_page_status`
- `compliance_page_override_save`
- `compliance_page_override_reset`
- `communication_template_generate`
- `communication_template_copy`
- `communication_template_share`
- `presence_surface_status`
- `presence_surface_confirm`
- `presence_surface_unconfirm`
- `review_risk_status`
- `review_reply_suggest`
- `review_reply_copy`
- `review_reply_post_external`
- `digital_screen_slide_caption_update`
- `digital_screen_slide_delete`
- `feedback_status_update`
- `pos_sync_secret_rotate`
- `pos_sync_secret_copy`
- `pos_sync_test`
- `pos_sync_instruction_email_draft`
- `staff_list`
- `staff_create`
- `staff_update`
- `staff_remove`
- `staff_password_reset`
- `staff_force_signout`
- `staff_role_save`
- `staff_role_delete`
- `system_receipt_create`
- `system_rollback_offer`
- `rule_suggestion`
- `rule_create`
- `rule_pause`
- `rule_execute`

## Code Registry IDs Not Parsed As Checklist Table Rows

These are in code registry but were not parsed from checklist table rows. Most are exact screen-open handoffs that are described in prose or adjacent docs rather than table rows:

- `decision_blocks_update`
- `locations_screen_open`
- `roles_permissions_open`
- `billing_screen_open`
- `transactions_screen_open`
- `business_health_open`
- `past_activity_open`
- `print_assets_open`
- `print_menu_open`
- `help_screen_open`

## Bugs Fixed In This Sweep

No new code bugs were fixed in this specific sweep because Chrome UI execution was blocked. The current working tree already contains earlier AMM fixes for:

- Resolver precedence for item rename versus category alias overlap.
- Description delimiter parsing for item names containing `as`, such as `Masala`.
- Explicit executable-action boundary and verifier checks.
- Docs alignment for executable actions versus field-coverage/future adapter rows.

## Verification Output

| Command | Result |
| --- | --- |
| `npm run verify:ai-menu-manager` | PASS: `AI Menu Manager verification passed` |
| `npx tsc --noEmit --incremental false --pretty false` | PASS |
| `npm run lint` | PASS: `No ESLint warnings or errors` |
| `git diff --check` | PASS |

## Remaining Gaps

- **Chrome UI sweep blocked:** The requested owner-POV click-through cannot be completed until the Chrome plugin connector works. Reinstall/repair the Codex Chrome plugin from the Codex plugin UI, then rerun the UI loop from this report.
- **Full checklist parity is not complete:** 118 checklist-only action IDs are not registered in code definitions. They should either be added as non-executable registry metadata or explicitly marked as checklist backlog outside the code registry contract.
- **Server/job/external/provider actions not runtime-executed:** Image generation, import, publish, special menu, temp status, store/public presence, POS, feedback, and digital screen actions are classified by registry/verifier, but not live-executed in Chrome.
- **MobileShell live smoke not completed:** Mobile route wiring and MobileShell invariants are statically verified by `verify:ai-menu-manager`, but no mobile viewport click-through was possible in this sweep.

## Product Readiness Verdict

**Ready for internal QA with browser sweep blocked.**

Do not mark this as owner beta complete until the Chrome connector is fixed and the real UI loop is run for at least the 19 executable actions plus the local export/read-only/unsupported flows.

## Product Contract Confirmation

Based on current code and verifier results:

- No hidden AI writes are allowed by the deterministic executable boundary.
- Registered adapters/definitions are the current control point.
- Price changes use `high_confirm` and verifier coverage requires old/new price card behavior.
- Unsupported external publish requests resolve to `system_unsupported_action`, not fake manual completion.
- Compact Firestore session model is preserved; deterministic cards do not require proposal docs by default.
- Selected project context is required by schemas and compact-session DAL paths.
- Mobile stays in MobileShell by static verifier coverage, pending live Chrome/mobile smoke.
