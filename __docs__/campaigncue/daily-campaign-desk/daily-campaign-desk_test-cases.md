# Daily Campaign Desk — Test Cases

## Unit/Contract

| Case | Expected |
| --- | --- |
| Restaurant business | Uses `restaurant_today_item_push` recipe. |
| Salon business | Uses `salon_slot_fill` recipe. |
| Retail business | Uses `retail_product_push` recipe. |
| Local service business | Uses `local_service_reminder` recipe. |
| Fitness business | Uses `fitness_class_fill` recipe. |
| Clinic business | Uses `clinic_appointment_reminder` recipe and conservative claim guardrails. |
| Other local business | Uses `generic_local_campaign` recipe. |
| Missing CTA | Desk summary routes to Business details. |
| No active source input | Missing input card routes to Inputs. |
| Active input without price/date/availability | Warning routes to Inputs without blocking pack creation. |
| No confirmed asset | Asset card routes to Assets without blocking pack creation. |
| Restricted asset | Asset card has needs-fix severity. |
| Existing campaign | Desk exposes ready pack summary. |
| Existing campaign manual delivery | Desk exposes manual delivery tasks without creating provider actions. |
| Existing or review asset | Desk exposes asset-reuse task from the already-loaded asset list. |
| Used count exceeds result count | Desk prompts to record result. |
| Result option selected | Owner can fill or record a result note from a predefined option. |
| Multi-location mode | Desk routes to Locations. |
| Agency mode | Desk routes to Agency approval. |
| Agency pack awaiting approval | Public-use actions are blocked until approve; reject requires a note. |
| Competing approval decisions | Transactional requested-state recheck allows only the first approve/reject transition. |
| Used, archived, or approved campaign | Approval request action is unavailable and server rejects a direct request. |
| Completed agency campaign | Does not create a stale approval reminder. |
| Due manual task | Desk derives due from elapsed `scheduledAt` without a Firestore write. |
| Useful past campaign | Desk shows `Reuse safely`; new pack rebuilds from current truth and stores provenance only. |
| Legacy pack/current recommendation mismatch | Pack review does not borrow decision evidence or missing-input tasks from another recipe. |

## UI

| Case | Expected |
| --- | --- |
| First load | Home tab label is Daily desk and primary action is visible. |
| Create pack | Local state adds pack and desk recomputes without full overview reload. |
| Download campaign pack ZIP | ZIP includes owner desk summary, `campaign-pack.json`, decision card, missing details, channel handoff files, trust summary, pack readiness, Campaign Rhythm, reuse notes, print/QR brief, result options, review checklist, and manual steps. |
| Schedule action | Button routes to Calendar and requires an explicit owner-selected local date/time. |
| Editor AI Tools | Recommended tools start with ready-to-share and missing-detail checks, not generic generation. |
| Mobile width | Cards stack, buttons remain touch-sized, no horizontal overflow. |

## Security And Cost

| Case | Expected |
| --- | --- |
| Unauthenticated workspace API | `401`. |
| Daily desk render | No new Firestore read, listener, Storage call, or provider call. |
| Provider posting | No direct publish/send action appears as active owner action. |
| Verifier | `npm run verify:campaigncue` checks daily desk constants, shared builder, UI copy, and export pack context. |
| Operating-loop verifier | `npm run verify:campaigncue-operating-loop` checks freshness, rhythm, readiness, approval schemas, reuse boundaries, and zero-cost derivation. |
