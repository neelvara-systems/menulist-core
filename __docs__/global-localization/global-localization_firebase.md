# Global Localization Firebase and Cost

**Status:** No Firebase operations
**Last updated:** July 19, 2026

## Operation Table

| Flow | Reads | Writes | Deletes | Listeners |
| --- | ---: | ---: | ---: | ---: |
| Resolve owner UI locale/timezone/format | 0 | 0 | 0 | 0 |
| Change owner UI preference | 0 | 0 | 0 | 0 |
| Format dates, numbers, relative time, or direction | 0 | 0 | 0 | 0 |
| Resolve fixed public-customer chrome | 0 | 0 | 0 | 0 |
| Switch public language or preserve `?lang=` | 0 | 0 | 0 | 0 |

UI preferences use browser/server cookies and the static locale registry.

Semantic locale generation is an explicit local maintainer workflow. The pinned models run outside the application and write static JSON plus hash evidence. It adds no Firebase operation and no runtime provider request.

The public customer translator reads a generated 337-message static bundle compiled from the 52 locale files. It does not read the canonical store again, call an API route, invoke a model, write an analytics event, create a listener, or persist a separate customer preference. Existing public page/store/project reads remain unchanged; the already-resolved owner-controlled language is passed through render props and URLs.

Store/business locale settings are not part of this zero-cost table. Their existing store-document save remains governed by the business-settings/store DAL documentation and public-cache invalidation rules. This hardening did not add or change any Firestore read, write, query, listener, collection, field, rule, or index.

## Scale Verdict

Formatting cost is local CPU only and grows with rendered values, not tenants or Firestore documents. No read model, cache collection, scheduler, or backfill is justified.
