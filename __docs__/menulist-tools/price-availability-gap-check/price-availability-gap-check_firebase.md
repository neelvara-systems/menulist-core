# Price Availability Gap Check - Firebase and Cost

**Status:** V0 static/browser-local report path; V1 owner module uses existing owner data context.
**Last Updated:** July 4, 2026

## V0 Cost Table

| Operation | Count |
| --- | ---: |
| Firestore reads during report generation | 0 |
| Firestore writes during report generation | 0 |
| Storage uploads | 0 |
| Cloud Functions | 0 |
| External fetches | 0 |
| POS checks | 0 |
| Ordering provider checks | 0 |
| Live inventory checks | 0 |
| AI/provider calls | 0 |

The optional follow-up form uses the existing `/api/public/contact` enquiry path after consent. Price Availability Gap Check does not add a new collection, index, Storage path, Cloud Function, report API, POS connector, inventory connector, or ordering-provider connector.

## V1 Owner Cost Posture

The owner module reuses existing Business Health / Public Discovery owner context and selected/default MenuList project data. It writes no report state.

If the selected/default project is already loaded by the owner screen, this module adds no new read. If a surrounding owner surface chooses to load a project for deeper readiness, that read belongs to the existing owner readiness pattern, not to a new Price Availability collection.

## V2 Cost Rule

Recurring checks, saved history, monthly reports, multi-location reporting, or agency exports require a separate paid add-on spec with explicit read/write/storage caps.
