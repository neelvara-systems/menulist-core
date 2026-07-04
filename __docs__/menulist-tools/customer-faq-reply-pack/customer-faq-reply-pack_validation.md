# Customer FAQ Reply Pack - Validation

**Status:** V0 validation evidence; not current launch certification
**Last Updated:** July 4, 2026

---

## Source Gate

```bash
npm run verify:customer-faq-reply-pack
```

## Current Assertions

The verifier checks:

- route exists at `/tools/customer-faq-reply-pack`
- feature flag is present
- dedicated doc set exists under `__docs__/menulist-tools/customer-faq-reply-pack/`
- locale keys exist
- Tools Hub card exists
- discovery policy, sitemap, `llms.txt`, and `llms-full.txt` include the route
- report rows and FAQ blocks render explicit `evidenceText`
- shareable report support is wired with `toolId: 'customer-faq-reply-pack'`
- optional contact handoff uses existing `/api/public/contact`
- no conversation-log reading, chatbot creation, automation configuration, message sending, external fetch, report storage, AI/provider call, ranking claim, or external platform update exists in V0

## Manual Smoke

Open `/tools/customer-faq-reply-pack`, enter business name, repeated customer questions, source facts, and a current customer link, then create the FAQ pack. Expected result: report card appears with eight FAQ blocks, explicit evidence text, copy/download/share controls, and the optional contact handoff.
