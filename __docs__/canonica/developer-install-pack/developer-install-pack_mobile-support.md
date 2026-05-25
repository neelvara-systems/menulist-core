# Developer Install Pack Mobile Support

## Product Owner Mobile

The affected dashboard surfaces already render inside Canonica mobile platform routes where enabled:

- Widget Management is used by mobile internal routes with `embeddedMobile`.
- Product Surfaces uses responsive Ant Design grid behavior.
- KB generation upload modal is shared and remains usable on small screens.

## Public Mobile

New public pages use existing Canonica website responsive sections and do not require separate mobile-specific code.

## Mobile Cost

No mobile real-time listeners or mobile-only Firebase reads were added.
