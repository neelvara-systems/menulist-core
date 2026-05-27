# Context-Aware Support — Website Content

> **Status:** READY FOR IMPLEMENTATION
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Feature Flag:** `ENABLE_CANONICA_CONTEXT_AWARE`
> **Audience:** Website visitors (SaaS founders, developers)

---

## §1 — Feature Page Section

### Headline
**Your support system knows what your users are doing.**

### Subheadline
Canonica injects product context into every support query — delivering answers that match the user's exact page, plan, role, and workflow. Not just what they asked, but why they asked it.

### Body Copy
Most AI support tools treat every question like a Google search. Your user asks "why is this failing?" and the system returns five vaguely relevant articles.

Canonica is different. When your widget install passes safe product context — which page the user is on, what feature they're using, and what public role label applies — our canonical retrieval engine uses that context to deliver the exact right answer.

The result:
- **15-25% more queries** resolved by canonical answers
- **Zero additional database cost** — context processing is entirely in-memory
- **15-30 minute widget integration** — familiar pattern for any developer

### CTA
Start with context-aware support →

---

## §2 — How It Works (Visual Section)

### Without Context
```
User: "Why is this not working?"
→ System: searches all docs
→ Result: 5 vaguely related articles
```

### With Context
```
User: "Why is this not working?"
Context: { page: "stripe_settings", plan: "pro", role: "admin" }
→ System: Stripe integration troubleshooting for Pro admin
→ Result: Exact canonical answer
```

---

## §3 — Integration Code Example

```javascript
// 5 lines. 15 minutes. Product-aware support.
Canonica.init({
  apiKey: 'ck_your_api_key',
  context: {
    feature: 'integrations',
    page: 'stripe_integration_page',
    plan: 'pro',
    userRole: 'admin'
  }
});
```

Update context as users navigate:

```javascript
Canonica.updateContext({
  page: 'webhook_settings',
  workflow: 'configure_webhook'
});
```

---

## §4 — Key Stats (Post-Launch)

- **15-25%** increase in canonical answer resolution
- **<2ms** context processing overhead
- **0** additional database reads
- **15-30 min** widget integration time

---

## §5 — SEO Meta

```
Title: Context-Aware Support | Canonica
Description: Canonica's context-aware support delivers answers based on where your users are in your product — not just what they type. Widget-native, zero additional cost.
Keywords: context-aware support, product-aware help, AI support widget, canonical answers, SaaS support infrastructure
```

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial website content |
