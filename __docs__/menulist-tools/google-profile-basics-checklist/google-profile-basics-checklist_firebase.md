# Google Profile Basics Checklist - Firebase and Cost

**Status:** V0 static/browser-local report path; V1 uses existing owner readiness context.
**Last Updated:** July 4, 2026

## Cost Table

| Operation | Count |
| --- | --- |
| Firestore reads | 0 |
| Firestore writes | 0 during check/report; 1 existing contact enquiry write per accepted optional follow-up |
| Firestore deletes | 0 |
| Storage operations | 0 |
| Cloud Functions | 0 |
| Google fetches | 0 |
| Google profile updates | 0 |
| Google/Maps/Search inspection | 0 |
| AI/provider calls | 0 |

## Storage

No report collection, report API, Storage path, Cloud Function, Google adapter, profile sync, ranking tracker, or review system is added.

The optional follow-up form uses the existing `/api/public/contact` enquiry path after consent.

## V1 Owner Cost

The owner-side `google_profile_handoff` module uses already-loaded MenuList store/public-link state. It writes no report state and does not scan Google.
