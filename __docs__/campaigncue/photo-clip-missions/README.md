# Photo And Clip Missions

**Status:** Implemented and locally verified; authenticated QA-device evidence pending
**Owner surfaces:** Daily Campaign Desk and Asset Library
**Persistence:** Existing CampaignCue Asset Library documents and private Storage paths

Photo and Clip Missions turn a recipe's requested real-world visual into a short owner task such as `Take one clear photo of today's lunch special`. The owner can capture or choose the media, confirm permission, and upload it into the existing private Asset Library. Campaign readiness changes only after the server verifies the stored object.

This feature does not introduce a mission collection, a second media pipeline, face recognition, direct posting, or a paid model call.

## Documents

- [Specification](./photo-clip-missions_spec.md)
- [Implementation](./photo-clip-missions_impl.md)
- [Firebase and cost](./photo-clip-missions_firebase.md)
- [Mobile support](./photo-clip-missions_mobile-support.md)
- [Test cases](./photo-clip-missions_test-cases.md)
- [Owner help](./photo-clip-missions_helpdoc.md)
- [Marketing boundary](./photo-clip-missions_marketing.md)
- [Website boundary](./photo-clip-missions_website.md)
- [Validation](./photo-clip-missions_validation.md)

## Governing Invariants

1. Missions are derived from campaign recipes and are not separate Firestore records.
2. An image or clip fulfills visual readiness only when its private source object is durably registered with Storage generation metadata.
3. Audio, documents, export records, and metadata-only Asset Library notes never satisfy photo readiness.
4. Rights status is explicit; `unknown` remains `needs_review`.
5. Client validation improves feedback, while the server and Storage rules remain authoritative.
6. The original file and bounded preview stay private and tenant-scoped.
7. Uploading media never posts, sends, or publishes it.
