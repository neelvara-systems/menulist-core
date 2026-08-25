# MenuList Help Center — Test Cases

> **Version:** 1.0.3
> **Last Updated:** 2026-08-25
> **Audience:** Engineering, QA, Product

## Local Source Gate

```bash
npm run verify:help-center-boundary
```

The gate composes source assertions, runtime-contract tests and the ticket attachment boundary.

## Required Cases

| Area | Case | Expected result |
| --- | --- | --- |
| Entry | Signed-out user requests `/help-center` | Main layout redirects to sign-in; private content is not rendered |
| Scope | Session has no valid Answerlattice product account | Search/content/ticket work fails closed |
| Search recovery | Owner submits a question without a valid Answerlattice workspace | No request is admitted; the question remains in the input and a persistent account-availability error replaces local-empty results |
| Navigation | Unknown `tab` query or path segment | Route normalizes to Help Center home |
| Deep link | `/help-center/kb/articles/{id}` | Current scoped published article loads or shows not found |
| Deep link | `/help-center/changelog/{id}` | Current scoped published entry loads or shows not found |
| Search | Contact tab opens Help Chat | Product context uses `contact_support` |
| Search | Oversized/malformed request or response | Bounded parser rejects it with fixed customer-safe failure copy |
| FAQ | Management flag is off | Maintained static MenuList FAQ copy is shown intentionally |
| FAQ | Managed FAQ request fails | Failure is visible; Knowledge Base and ticket recovery actions remain |
| Landing content | Category, popular-article, or changelog request fails | The affected panel shows a persistent retryable failure and does not claim confirmed empty content |
| Landing tickets | Open-ticket summary request fails | A persistent retryable failure remains; the panel is hidden only after a successful confirmed-empty response |
| Cache | Workspace A cache exists and workspace B becomes active | A data is ignored; B performs its authoritative read/listener |
| Public content | Category/article/FAQ/changelog request starts in workspace A and session changes to B | Route rejects an A expectation under B before content reads, or the client rejects a non-A acknowledgement; no A/B response enters the wrong cache/UI |
| Cache | Platform ticket cache exists and customer Help Center opens | Platform data is ignored because the audience key differs |
| Cache | Two workspaces request categories/changelog concurrently | Each request uses its own in-flight promise and result |
| Changelog | Initial changelog fetch fails or persisted last-viewed timestamp is malformed/future | Marker does not advance; invalid state is evicted and future New badges remain eligible |
| Draft | User starts an unsent text question | Strict workspace/user-scoped envelope is stored, max 2,000 characters |
| Draft | Same user reloads within 24 hours | Valid text draft restores after hydration without autosave erasing it |
| Draft | Browser storage rejects removal while sending or parent clears the input | In-memory input still clears and bounded diagnostics are emitted without throwing |
| Draft | Draft is expired, malformed, legacy or from another scope | Value is removed and not rendered |
| Draft | Screenshot is selected | Screenshot data is never written to draft storage |
| Tickets | Customer opens history or direct ticket detail | Only exact workspace rows pass DAL and Firestore rules |
| Ticket recovery | Ticket create is rejected before persistence | Completed fields remain and a persistent `Request not sent` alert is shown; no success state appears |
| Feedback history | Latest-feedback read fails | A persistent retryable failure remains; missing history is not presented as a confirmed empty read |
| Feedback recovery | Valid active-step submission is rejected before persistence | Completed fields remain, a persistent localized failure appears, and no success/last-submitted state is fabricated |
| Tickets | Customer replies or changes allowed state | Transaction rechecks stored scope and append-only history |
| Attachments | File exceeds count, size, type or trusted path | Admission/opening fails before exposing or uploading unsafe data |
| Mobile | Direct Help Center article/changelog route opens on phone | MobileShell sub-screen retains tab and resource ID |
| Mobile recovery | Unpaid or payment-pending owner opens Help home, Knowledge Base, Tickets, or Changelog on phone | Help content renders inside MobileShell; the subscription card does not replace the recovery surface |
| Auth scope | MenuList owner with a valid Answerlattice product account opens `/help-center`, then returns to a MenuList route | Help Center triggers dedicated Answerlattice Firebase Auth sync; returning restores MenuList claims; store/bootstrap data remains MenuList-scoped throughout |
| Mobile | Customer uses back action | Returns to `/dashboard#mobile/more` |
| Localization | Non-English locale opens tabs, breadcrumb, feedback summary and mobile header | Maintained locale keys render; no fixed English labels from the audited paths |

## Release Evidence

Local gates do not prove deployed rules/indexes, Answerlattice product-account provisioning, Firebase Auth claim sync, provider/SMTP availability, hosted route behavior, device/browser layout, assistive-technology behavior or real customer resolution. Capture those separately on the authenticated QA environment before launch claims.
