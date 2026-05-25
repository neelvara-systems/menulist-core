# Developer Install Pack Test Cases

## Static Website

- `/quickstarts` renders with Next.js, React, Vue/Nuxt, and vanilla examples.
- `/roi-calculator` updates estimates client-side without network requests.
- `/proof` labels examples as workloads, not case studies.
- `/security-one-pager` includes allowed origins, blocked routes, safe context, hashed keys, approval, rate limits, and incident contact.

## Dashboard

- Product Surfaces can add one missing template.
- Product Surfaces can add all missing templates and skip existing ones.
- Surface summary rebuild runs once after template application.
- Widget verifier shows key, loaded status, origin status, route status, and context status from existing settings data.
- KB Upload modal appends starter pack text and creates the same ingestion job shape as before.

## Cost

- Static public pages do not call Firestore.
- Verifier does not trigger new API reads beyond widget settings load.
- Surface template action remains bounded to six writes plus one summary rebuild.
