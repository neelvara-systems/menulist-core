# Design Cue - Spec

## Product Definition

Design Cue is an editor-side assistant for non-technical SMB owners. It lets an owner ask for changes in plain language or attach a comment to a visible design object, then reviews and applies safe editable changes through the shared Creative Editor.

The product promise is:

> Say what you want changed, review the proposed edit, then apply it safely.

## Problem

SMB owners usually do not think in design-tool terms like layers, padding, contrast, z-order, text hierarchy, or aspect ratios. They think in outcomes:

- Make the offer clearer.
- Add my WhatsApp number.
- Make this fit Instagram story.
- This looks too busy.
- Put the price near the item.
- Check if this is ready to post.

Classic editors expose too many controls. Fully automated AI editors hide too much. Design Cue must sit between those extremes.

## Target Users

| User | Need |
| --- | --- |
| Restaurant owner | Promote menu items, offers, events, and WhatsApp/order links without design vocabulary. |
| Salon owner | Promote services, booking links, packages, local reminders, and seasonal offers. |
| Agency operator | Quickly make client-safe revisions while preserving source facts and approval history. |
| Local manager | Suggest small changes without having full design responsibility. |

## Boundaries

Design Cue must not:

- post or send to social/WhatsApp/Google
- mutate ad spend
- invent prices, dates, locations, business names, or contact details
- directly persist model output as editor truth
- store Fabric runtime JSON as durable product truth
- store base64 screenshots or prompts in Firestore
- run a model for every click, layer select, or deterministic command
- become a generic Canva/Figma clone

Design Cue may:

- create patch previews
- add editable text layers
- update selected layer properties
- run business fact and brand checks
- prepare manual channel export guidance
- ask for owner confirmation when facts are missing
- call a model only for ambiguous intent, copy candidates, or critique candidates after deterministic preflight

## Product Model

Design Cue has two owner entry points:

1. **Command chips**
   - Bigger offer
   - Shorter text
   - Add location
   - Add contact line
   - Make it simpler
   - Make it premium
   - Check facts
   - Export checklist

2. **Click and comment**
   - Owner clicks a layer or area.
   - Owner writes a short comment.
   - Design Cue proposes one or more safe changes.
   - Owner applies, rejects, or asks for another version.

## Core Loop

1. Owner opens a CampaignCue design in the shared Creative Editor.
2. Design Cue builds a local context bundle from:
   - current `CreativeEditorDocument`
   - selected layer, if any
   - CampaignCue Business Brain
   - source facts
   - brand kit
   - active channel/export target
3. Owner chooses a chip or writes a comment.
4. Deterministic intent resolver handles known commands without model cost.
5. If intent is ambiguous, a model may classify the request or generate copy/critique candidates.
6. Programmatic patch resolver creates a `DesignCuePatchSet`.
7. Guardrails validate patch safety, source facts, layer ids, dimensions, and export boundary.
8. Owner sees before/after summary.
9. Owner applies or rejects.
10. Applied patch commits through the existing shared editor document state/history.

## What Is Programmatic

These must be programmatic first:

| Capability | Programmatic reason |
| --- | --- |
| Add business name/location/contact | Data exists in Business Brain. No model needed. |
| Add WhatsApp/booking CTA | Deterministic from contacts and channel. |
| Resize to square/story/poster | Geometry transform with known presets. |
| Move selected layer | Direct layer patch. |
| Increase/decrease text size | Direct selected text patch. |
| Shorten selected text to a limit | Deterministic truncation first; model only for nicer rewrite. |
| Check missing business name | Text scan. |
| Check unsupported prices/dates | Compare visible text to source facts. |
| Export checklist | Static rules from delivery boundary. |
| Comment anchoring | Layer id or canvas coordinate. |
| Patch preview/apply/revert | Document diff logic. |

## What May Use A Model

Model use is allowed only behind a capability registry, rate limit, safe mode, and cost gate:

| Use | Model role | Programmatic role |
| --- | --- | --- |
| Ambiguous request classification | Convert owner text to an intent candidate. | Validate and resolve to patch. |
| Rewrite selected text | Generate candidate wording. | Preserve facts, length, source refs, editable text layer. |
| Design critique | Describe likely visual issues. | Convert only approved known fixes to patch candidates. |
| Visual screenshot critique | Analyze screenshot when document structure is insufficient. | Never trust model geometry blindly; patch resolver owns changes. |
| Image generation/removal | Generate candidate asset only after explicit owner action. | Store through product asset/CueLayers pipeline and cost gates. |

## Owner UX Requirements

- The owner never sees raw model diagnostics.
- The owner sees short proposed changes, not JSON.
- Every change has Apply, Try another, and Cancel.
- Design Cue must explain when it cannot safely change a fact.
- Applied changes must remain editable layers.
- Mobile must use a bottom sheet, not a dense desktop panel.

## Acceptance

- Known commands run without provider calls.
- Model output never directly mutates the document.
- All applied changes are represented as allowed `CreativeEditorDocument` patches.
- Protected facts are not silently changed.
- No direct posting, sending, or ad spend action is introduced.
- Owner can complete a common change in under three taps after opening Design Cue.
