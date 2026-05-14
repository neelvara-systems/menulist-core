# Item Truth Export Spec

## Purpose

Allow a single published menu item to become a canonical reference:
- share via native share
- copy a stable item link
- download a clean PNG item card
- render a structured OG preview when the link is shared

## User Surface

Primary surface: public item detail modal.

Actions:
- Share
- Copy link
- Download

No templates, captions, scheduling, platform selection, or card customization.

## URL Contract

Canonical item URL:

```text
/{projectSlug}?item={itemId}
```

Rules:
- `itemId` is identity.
- Item slug paths remain backward-compatible but are not the canonical output.
- If the item is unavailable or missing, open the menu and show `Item not available`.

## Rendering Contract

The image renderer is server-side, deterministic, and isolated from client UI components.

Inputs:
- published item snapshot
- category
- project metadata
- store identity
- resolved language

Outputs:
- 1200x630 PNG for OG and download
- no empty image box when the item has no image

