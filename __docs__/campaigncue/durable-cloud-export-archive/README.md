# Durable Cloud Export Archive

**Status:** Implemented in the local codebase. CampaignCue Firebase deployment and authenticated browser evidence remain external release gates.

This feature lets an authorized owner save the same Campaign Pack ZIP that CampaignCue can download locally, then retrieve the current saved copy later. It is deliberately bounded: each campaign has one current archive pointer, one reusable Asset Library record, and at most two rotating Storage object names.

## Owner Flow

```text
Review a Campaign Pack
-> Save cloud copy
-> CampaignCue builds the ZIP in the browser
-> Cloud Storage validates the signed checksum during upload
-> CampaignCue verifies and registers the exact object generation
-> Download saved copy later through a short-lived signed link
```

## Documents

- [Specification](durable-cloud-export-archive_spec.md)
- [Implementation](durable-cloud-export-archive_impl.md)
- [Firebase and cost](durable-cloud-export-archive_firebase.md)
- [Owner help](durable-cloud-export-archive_helpdoc.md)
- [Mobile support](durable-cloud-export-archive_mobile-support.md)
- [Marketing boundary](durable-cloud-export-archive_marketing.md)
- [Website boundary](durable-cloud-export-archive_website.md)
- [Test cases](durable-cloud-export-archive_test-cases.md)
- [Validation](durable-cloud-export-archive_validation.md)

## Fixed Boundaries

- The owner still downloads, copies, posts, sends, or prints manually.
- There is no social-provider integration or delivery mutation.
- There is no archive collection, realtime listener, background job, or unbounded version history.
- Signed URLs never enter Firestore, Asset Library records, or editor documents.
- Firebase clients cannot directly read, write, or delete `campaigncue/reports/**`.
- The active app exposes only the current archive. The second object name is a rotation slot, not an owner-facing version browser.

See the shared [file-upload security guide](../../security/file-upload/file-upload-security.md) for the global upload boundary.
