# Daily Campaign Desk — Implementation

## Code Truth

The implementation is code-first and deterministic.

| Contract | File |
| --- | --- |
| Recipe constants and tab targets | `src/constants/campaigncue/dailyDesk.ts` |
| Campaign Decision Engine | `src/lib/campaigncue/decisionEngine.ts` |
| Navigation label | `src/constants/campaigncue/navigations.ts` |
| Overview and output field types | `src/types/campaigncue.ts` |
| Shared builder | `src/lib/campaigncue/dailyDesk.ts` |
| Server overview wiring | `src/lib/campaigncue/server.ts` |
| Owner UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Regression verifier | `scripts/verification/verify-campaigncue-runtime.js` |

## Data Flow

1. `GET /api/campaigncue/workspace` loads the existing bounded overview documents.
2. `src/lib/campaigncue/server.ts` builds opportunities and source facts.
3. `buildCampaignCueDecisions()` scores campaign recipes from the same in-memory overview data.
4. `buildCampaignCueDailyDesk()` selects the top decision, converts decision missing inputs into owner cards, and returns `decision` plus `candidateDecisions`.
5. `CampaignCueOverview.dailyDesk` is returned to the client.
6. `CampaignCueWorkspaceApp` renders the first tab as Daily Campaign Desk with "Why this recommendation" evidence.
7. Local owner mutations call `updateOverview()`, which runs `withFreshDailyDesk()` so the desk updates without another overview fetch.

## Recipe Contract

`CAMPAIGNCUE_DAILY_DESK_RECIPES` currently includes:

- `restaurant_today_item_push`
- `salon_slot_fill`
- `local_service_reminder`
- `retail_product_push`
- `fitness_class_fill`
- `clinic_appointment_reminder`
- `generic_local_campaign`
- `restaurant_slow_lunch_push`
- `salon_weekend_slots`
- `retail_new_arrival`
- `asset_reuse_old_poster`
- `google_local_visibility_refresh`

Each recipe defines:

- owner goal
- plain owner action
- when-to-use guidance
- required inputs
- recommended channels
- owner output formats
- print formats
- photo tasks
- guardrails
- manual delivery tasks
- result question and one-tap result options

`CampaignCueBusinessPatchSchema` and `CampaignCueBusinessType` accept restaurant, salon, retail, local service, fitness, clinic, multi-location, agency client, and other local business values. Unknown MenuList bootstrap data still defaults to restaurant because the current source connector is MenuList-store-led; owner edits can change the business type.

## Campaign Output Contract

`CampaignCueOutputFields` now supports:

- `ownerUseCase`
- `outputFormats`
- `printFormats`
- `photoTasks`
- `reviewChecklist`
- `handoffFields`

Existing output text, CTA, destination, policy note, consent note, approval note, UTM, and manual steps remain unchanged.

`CampaignCueDailyDeskPackSummary` also carries `manualDeliveryTasks`, `ownerGoal`, `plainAction`, `resultQuestion`, and `resultOptions` so the downloaded pack and owner home screen stay aligned.

`CampaignCueCampaignPackReview` is now the owner-facing pack review contract. It is derived from the latest campaign, the same overview source facts, the missing-input inbox, the latest campaign outputs, the trust gates, and local visibility cues. It carries:

- `campaignId`
- `title`
- `ownerGoal`
- `decision`
- `reason`
- `sourceFacts`
- `missingInputs`
- `trustSummary`
- `deliveryCards`
- `resultQuestion`
- `resultOptions`
- `localVisibilityCues`
- `outputPack`

`CampaignCueOutputPack` is the canonical owner output contract. It is derived by `buildCampaignCueOutputPack()` from the same in-memory overview data and carries decision, facts, missing inputs, creative references, channel copy blocks, manual delivery cards, trust report, reuse notes, mini-page/QR brief, calendar/reminder note, result memory, next actions, and `downloadBundle.files`.

`CampaignCueWorkspaceApp` renders `OutputPackSummary` and downloads a browser-local ZIP through the protected export flow. The ZIP includes `campaign-pack-summary.md`, `campaign-pack.json`, and the structured files from `outputPack.downloadBundle.files`. It is built locally before the action API is called and downloaded only after the server accepts the export action. It does not create fake PNG/PDF binaries when no rendered editor export exists.

`CampaignCueManualDeliveryCard` is the structured manual-use contract. It groups `handoffFields` into copyable channel cards for WhatsApp, Google/local, social creative, ads handoff, video brief, creator script, and calendar/manual reminders. Copying values and ZIP generation are browser-local only; they do not write Firestore and do not call providers.

`CampaignCueCampaign.pack` stores compact pack metadata on campaign creation: owner goal, reason, source fact ids, missing input ids, delivery card ids, and result question. Heavy owner-facing review data remains derived from existing overview data rather than duplicated into another collection.

`CampaignCueCampaign.pack.decision` stores the selected deterministic decision object for the generated campaign. Candidate decisions remain derived response state and are not stored as a separate collection.

`CampaignCueCampaign.resultMemory` stores the latest structured result signal and compact useful/not-useful counters. The Opportunity Engine uses those fields to recommend `cue_repeat_worked_before` or `cue_adjust_after_not_useful` without scanning raw events.

## Mutation Behavior

The desk does not add new mutation APIs. It reuses:

- workspace PATCH for business details
- source POST for inputs
- asset POST for asset metadata
- location POST for locations
- campaign POST for pack creation
- campaign action POST for download/export/schedule/approval/mark-used/result

Client mutation responses are merged locally and the daily desk is recomputed from the updated state.

## Owner UI

The Home tab label is now Daily desk. The first screen shows:

- one primary action
- why-this recommendation evidence
- missing input inbox
- ready pack controls
- missing detail cards
- campaign pack review
- manual delivery cards
- manual delivery tasks
- quick result-memory choices
- asset-reuse tasks
- local visibility cues
- multi-format use list
- print/photo tasks
- saved facts

The Start navigation exposes `Inputs` for the Missing Input Inbox. The Operations navigation exposes `Visibility` for local search/profile readiness and manual Google-ready handoff fields.

The Creative Editor remains separate under Editor/Assets, but it no longer opens as a context-free design surface for CampaignCue. Campaign Pack Editor Mode wraps the shared editor with owner context:

- safe tasks from the Daily Desk and Missing Input Inbox
- protected business text from Business Brain and source facts
- one-design-many-output format reminders
- Trust Center status
- manual delivery cards
- result memory prompt
- mobile review guidance

CueLayers is surfaced as the owner action "Reuse old image". The implementation still uses the CueLayers upload/reconstruction path internally, but owner copy should describe old posters, screenshots, or flat images being reused safely.

The editor AI Tools drawer now starts with owner outcome actions:

- Check if ready to share
- Add missing business details
- Improve this design
- Ready for WhatsApp
- Ready for Google
- Ready for print

These actions are deterministic and run without a provider call.
