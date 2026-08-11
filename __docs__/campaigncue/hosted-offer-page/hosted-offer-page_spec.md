# Hosted Offer Page And QR - Spec

## Owner Job

An owner should be able to place one safe destination behind a WhatsApp message, Google draft, counter card, flyer, or QR code without opening a separate landing-page product.

## Publish Gate

Publishing requires:

- a generated Campaign Pack;
- Trust Center state `clear`;
- no required missing input;
- current source hash and unexpired freshness receipt;
- commercial gate `ready`;
- explicit owner publish action; and
- approved state when the workspace uses agency mode.

## Public Contract

The public record contains schema version, opaque slug, publication state, campaign title, business name, optional locality, bounded body, CTA label, validated `https` or `tel` destination, bounded terms, publish/expiry times, and internal workspace/campaign ownership fields. Internal IDs are never rendered.

Pages are `noindex`, expire no later than thirty days after publication, and show no visitor tracker. The CTA opens the owner-approved destination directly.

## Non-Goals

- No generic landing-page builder.
- No payment or checkout.
- No social publishing.
- No automatic QR placement.
- No visitor profiling, conversion attribution, or per-view Firestore write.
- No public rendering of raw source facts, comments, approval notes, or private assets.
