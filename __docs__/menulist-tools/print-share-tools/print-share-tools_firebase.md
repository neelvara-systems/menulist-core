# Print & Share Tools - Firebase & Cost Posture

**Last Updated:** July 16, 2026

---

## V0 Cost Table

| Operation | Count |
| --- | --- |
| Firestore reads | 0 |
| Firestore writes | 0 |
| Storage operations | 0 |
| Cloud Functions | 0 |
| AI/provider calls | 0 |
| External URL fetches | 0 |
| Report storage | 0 |
| Template-registry writes | 0 |

---

## Runtime Boundary

The public tools run in the browser and render assets browser-local from owner-entered fields.

The output is generated on the client:

- SVG preview
- PNG export
- PDF export
- print window
- text report
- shareable report URL hash

The shared public HTTPS parser and expanded raw-IPv6/hostname rejection remain browser-local and add zero Firebase, Storage, Function, provider, DNS, or network operations.

No generated asset, uploaded file, or report payload is persisted by V0.

---

## V1/V2 Rules

Any future owner-side or paid version must document:

- exact Firestore reads/writes
- retention policy
- entitlement boundary
- storage path if asset history is added
- cache invalidation if public MenuList truth is changed
- owner approval before any public truth mutation

Do not add storage or recurring checks without updating this file first.
