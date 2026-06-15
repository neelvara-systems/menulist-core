# Design Cue - Mobile Support

## Mobile Relevance

Design Cue is mobile-relevant because SMB owners often approve and adjust campaign assets from a phone.

The mobile experience must not expose the full dense desktop editor. Design Cue should reduce the need for layer-by-layer editing on mobile.

## Current Mobile Pattern

The current shared editor renders Design Cue inside the responsive AI Tools drawer. Command chips collapse to one column and Apply/Cancel actions meet the 44px touch target rule.

This is acceptable for local testing and desktop-first editor access. Before CampaignCue exposes Design Cue as a primary owner-phone workflow, add a dedicated bottom sheet wrapper so owners do not have to navigate the dense desktop editor shell.

## Target Mobile Pattern

Use a bottom sheet:

- command chips first
- one short text input
- selected layer summary
- proposed change card
- sticky Apply and Cancel buttons

Do not place Design Cue in a right inspector on mobile.

## Mobile Flows

### Quick command

1. Owner opens asset.
2. Taps Design Cue.
3. Taps `Add contact line` or `Check facts`.
4. Reviews proposed change.
5. Taps Apply.

### Comment flow

1. Owner taps a text/image area.
2. Taps comment.
3. Writes: `make this bigger`.
4. Reviews one proposed patch.
5. Taps Apply or Cancel.

## Touch Requirements

- Command chips minimum 44px height.
- Apply/Cancel sticky footer.
- Avoid tiny layer lists.
- Do not require drag handles for common changes.
- Show only one patch preview at a time.

## Mobile Cost

Mobile must use the same deterministic-first resolver. No mobile-specific provider route should be added.

## Admission Decision

Accepted with the current responsive drawer for shared-editor testing. A dedicated bottom sheet remains required before marketing Design Cue as a phone-first editing workflow.
