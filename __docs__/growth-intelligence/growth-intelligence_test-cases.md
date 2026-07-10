# Growth Intelligence Test Cases

1. Powered-by home and create-menu links contain only the fixed source, medium, and campaign values.
2. Unsupported query values are not submitted or stored.
3. Sign-in callback returns to the same allowlisted attributed create-menu URL.
4. Photo and menu-link drafts persist identical normalized attribution.
5. Reusing a draft does not overwrite its first-touch attribution or double-count a draft event.
6. Claim copies attribution and increments one claim event only.
7. Founder Monitor accepts empty growth summary state and renders source counts.
8. Desktop and mobile submit the same cancellation codes.
9. `other` cannot continue without detail.
10. Replaying a churn movement does not double-count its cancellation reason.
11. Founder payloads contain no cancellation free text.
12. `otherReason` is discarded when the selected code is not `other`.
13. A cached client sending legacy `mobile_cancellation` with consent can still cancel, but current mobile code never emits it.
14. Mobile reason-sheet copy and labels resolve from the active `Billing` locale.
