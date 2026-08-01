# Design Cue - Test Cases

## Deterministic Commands

| Case | Expected result |
| --- | --- |
| Bigger offer with no selected layer | Adds editable offer text from CampaignCue context without model call. |
| Add location | Adds locality only when known; otherwise asks for review. |
| Add contact line | Uses approved WhatsApp, phone, booking, menu, or website contact; no send action appears. |
| Add contact line with missing contact | Shows a review finding and does not add placeholder contact text. |
| Make square | Canvas changes to square and layers scale safely. |
| Shorten selected text | Creates shorter editable text candidate without provider call. |
| Make it premium | Updates selected text style or adds a calm editable line without provider call. |
| Looks too busy | Returns review findings and does not delete layers automatically. |
| Check facts | Flags missing business name and unknown numbers. |
| Export checklist | Shows manual export and rights checklist. |
| “Make this WhatsApp ready” | Resolves to WhatsApp readiness, not Add Contact. |
| “Get this ready for print” | Resolves to print readiness, not Resize Poster. |
| Coercive or hostile context/patch input | No conversion hooks execute; context is empty/bounded and validation fails closed. |

## Model Boundary

| Case | Expected result |
| --- | --- |
| Unknown owner request | Deterministic resolver fails closed with a review finding. |
| Model route while model assist disabled | Auth/scope/rate/payload validation runs, then route returns fail-closed response without provider call. |
| Model returns unsupported operation | Patch validator rejects. |
| Model changes price | Protected fact validator blocks or marks needs review. |
| Model returns external URL | Rejected unless URL matches allowed source/contact rules. |
| Model returns Fabric JSON | Rejected. |

## Comment Anchoring

| Case | Expected result |
| --- | --- |
| Comment on selected text layer | Request target uses selected layer id. |
| Comment on blank canvas | Request target uses document-level target. |
| Delete target layer before applying patch | Patch cannot apply without conflict flow. |
| Apply patch after document revision changes | Patch requires current revision or conflict review. |

## Security

| Case | Expected result |
| --- | --- |
| Unauthenticated model route call | 401. |
| Wrong tenant/store route call | 403. |
| Oversized prompt | 400. |
| Raw signed URL in request | Rejected or stripped before model call. |
| Raw prompt in logs | Not present. |
| Unsupported command id | CampaignCue resolver fails closed instead of trusting product-neutral strings. |
| Unsupported canvas preset | Patch validation rejects it before apply; editor does not crash. |
| Empty layer patch | Patch validation rejects it instead of creating a no-op history entry. |
| Unsupported style value | Alignment, font style, and font weight patches must use the editor allowlist. |
| Unsupported text placement or unsafe layer name | Add-text patches are rejected before creating an editable layer. |

## Firebase Cost

| Case | Expected result |
| --- | --- |
| Run command chip | 0 reads, 0 writes, 0 provider calls. |
| Preview patch | 0 writes. |
| Apply transient patch | 0 writes unless existing autosave flow is active. |
| Model-backed turn | Rate-limited and accounted once after provider work. |

## UX

| Case | Expected result |
| --- | --- |
| Owner types “make this clearer” | Shows one or two proposed changes, not technical diagnostics. |
| Owner rejects patch | Document remains unchanged. |
| Owner applies patch | Existing undo/history can revert. |
| Mobile responsive drawer | Command chips and Apply/Cancel remain reachable with 44px actions. |
