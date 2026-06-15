# Creative Studio - Documentation

Creative Studio covers static campaign creative: image briefs, captions, headlines, offer text, channel crops, and reusable variants.

| File | Audience | Purpose |
| --- | --- | --- |
| [creative-studio_spec.md](./creative-studio_spec.md) | Product, design | Static creative requirements and acceptance. |
| [creative-studio_impl.md](./creative-studio_impl.md) | Engineering | Generation, variant, and review implementation contract. |
| [creative-studio_marketing.md](./creative-studio_marketing.md) | GTM | Positioning and sales notes. |
| [creative-studio_website.md](./creative-studio_website.md) | Public website | Public copy boundaries. |
| [creative-studio_helpdoc.md](./creative-studio_helpdoc.md) | Customers | How to create static campaign assets. |
| [creative-studio_firebase.md](./creative-studio_firebase.md) | Engineering, finance | Firestore and Storage cost posture. |
| [creative-studio_mobile-support.md](./creative-studio_mobile-support.md) | Product, mobile | Mobile owner workflow. |

## Related Editor Plans

| Document | Relationship |
| --- | --- |
| [../design-cue/README.md](../design-cue/README.md) | Implemented conversation/comment assistant for editor-side changes. It builds on the deterministic AI Tools drawer and applies validated `CreativeEditorDocument` patches instead of making the model the editor truth. |
| [../../shared-creative-editor/README.md](../../shared-creative-editor/README.md) | Product-neutral editor runtime used by Creative Studio. It now includes the floating selected-layer toolbar, floating selected-item-first right properties drawer, drag-reorder Active Layers drawer, Styles shortcuts, My Stuff upload/recent assets, and top-bar Download for canvas-local edit, text readability checks, CTA/contact insertion, color, image replacement, QR edits, position, duplicate, delete, group, distribute, stack management, and Design Cue entry. |
