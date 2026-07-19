# Context-Aware Support — Customer Help Documentation

> **Status:** IMPLEMENTED
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-07-11
> **Feature Flag:** `ENABLE_ANSWERLATTICE_CONTEXT_AWARE`
> **Audience:** SaaS developers integrating Answerlattice

---

## §1 — Overview

Context-Aware Support allows your Answerlattice widget to understand **where** your users are in your product, not just **what** they're asking. By passing a small context payload with each support query, Answerlattice delivers more accurate, page-specific answers.

**Result:** Higher answer accuracy, fewer irrelevant results, better end-user experience.

---

## §2 — Quick Start

### Step 1: Initialize the Widget with Context

When embedding the Answerlattice widget, pass a `context` object:

```javascript
Answerlattice.init({
  apiKey: 'ck_your_api_key',
  context: {
    feature: 'integrations',
    page: 'stripe_integration_page',
    plan: 'pro',
    userRole: 'admin'
  }
});
```

### Step 2: Update Context on Navigation

As users move through your product, update the context:

```javascript
// User navigates to webhook settings
Answerlattice.updateContext({
  page: 'webhook_settings_page',
  workflow: 'configure_webhook',
  entityHints: ['webhook']
});
```

### Step 3: That's It

Context is automatically attached to every support query. No changes needed to your search calls.

---

## §3 — Context Fields Reference

All fields are **optional**. The system works without any context (existing behavior preserved).

| Field | Type | Max Length | Description | Example |
|-------|------|-----------|-------------|---------|
| `contextVersion` | number | — | Schema version (default: 1) | `1` |
| `contextKey` | string | 100 chars | Exact Product Surface key | `"billing_invoices"` |
| `path` | string | 180 chars | Transient current route for surface matching | `"/settings/integrations/stripe"` |
| `title` | string | 120 chars | Optional safe page title | `"Stripe settings"` |
| `feature` | string | 100 chars | Product subsystem | `"integrations"` |
| `page` | string | 100 chars | UI location identifier | `"stripe_integration_page"` |
| `workflow` | string | 100 chars | Current user action | `"connect_integration"` |
| `entityHints` | string[] | 5 items, 64 chars each | Entity references | `["stripe"]` |
| `role` | string | 80 chars | Public role alias, normalized into `userRole` | `"admin"` |
| `userRole` | string | 100 chars | User permission level | `"admin"` |
| `locale` | string | 24 chars | Public locale label | `"en_us"` |
| `plan` | string | 100 chars | Subscription tier | `"pro"` |
| `state` | string | 100 chars | Current product state | `"connection_failed"` |
| `version` | string | 32 chars | Numeric product version label | `"2.4.1"` |

### Best Practices for Field Values

- **Use `page` for stable identifiers and `path` for the transient route:** `page: "stripe_integration_page"`, `path: "/settings/integrations/stripe"`
- **Do not send wildcard paths:** configure `/settings/integrations/*` on the Product Surface; send the current exact path from the client
- **Use lowercase with underscores:** `"connect_integration"` not `"Connect Integration"`
- **entityHints should match your product entity names:** If your product has a "Stripe" integration, use `"stripe"` as a hint
- **Keep values simple:** Context should answer "what is the user doing?" not "who is the user?"

---

## §4 — API Reference

### Widget Search Endpoint

```
POST /api/widget/search
Headers: X-API-Key: ck_your_api_key

Body:
{
  "query": "Why is Stripe not connecting?",
  "context": {
    "contextVersion": 1,
    "feature": "integrations",
    "path": "/settings/integrations/stripe",
    "page": "stripe_integration_page",
    "workflow": "connect_integration",
    "entityHints": ["stripe"],
    "userRole": "admin",
    "plan": "pro",
    "state": "connection_failed",
    "version": "2.4.1"
  }
}
```

### Response (unchanged)

```json
{
  "answer": "To resolve Stripe connection issues...",
  "canonical": true,
  "confidence": "high",
  "references": []
}
```

### Validation Rules

- Total context payload must be < 2KB
- Unknown fields are silently dropped
- Invalid values are sanitized (lowercased, special characters removed)
- If validation fails entirely, context is dropped and query proceeds without it

---

## §5 — How Context Improves Results

### Example 1: Vague Query with Page Context

**Without context:**
```
Query: "Why is this failing?"
Result: Generic troubleshooting article (or no match)
```

**With context:**
```
Query: "Why is this failing?"
Context: { page: "stripe_integration_page" }
Result: Stripe integration troubleshooting (specific canonical answer)
```

### Example 2: Role-Aware Answers

**Without context:**
```
Query: "How do I add a team member?"
Result: Admin workflow for adding team members
```

**With context:**
```
Query: "How do I add a team member?"
Context: { userRole: "viewer" }
Result: "Only admins can add team members. Contact your admin."
```

### Example 3: Plan-Aware Answers

**Without context:**
```
Query: "How do I use advanced analytics?"
Result: Setup guide for advanced analytics
```

**With context:**
```
Query: "How do I use advanced analytics?"
Context: { plan: "free" }
Result: "Advanced analytics is available on the Pro plan."
```

---

## §6 — Frameworks Integration

### React

```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();

  useEffect(() => {
    // Map routes to context
    const contextMap: Record<string, object> = {
      '/settings/integrations/stripe': {
        feature: 'integrations',
        page: 'stripe_integration_page',
      },
      '/settings/billing': {
        feature: 'billing',
        page: 'billing_settings_page',
      },
    };

    const context = contextMap[location.pathname];
    if (context) {
      Answerlattice.updateContext(context);
    }
  }, [location.pathname]);

  return <>{/* your app */}</>;
}
```

### Next.js

```tsx
'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AnswerlatticeContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Update Answerlattice context on route change
    Answerlattice.updateContext({
      page: pathname.replace(/\//g, '_').slice(1) || 'home',
    });
  }, [pathname]);

  return <>{children}</>;
}
```

---

## §7 — Troubleshooting

### Context not affecting results?

1. **Check feature flag:** Context-aware support must be enabled for your tenant
2. **Check field names:** Values must use lowercase with underscores
3. **Check entityHints:** Hints should match entity names in your Answerlattice ontology
4. **Check payload size:** Total context must be < 2KB

### How do I know if context is being used?

The API response includes a `canonical: true` flag when a canonical answer is returned. Compare canonical hit rates with and without context to measure impact.

### What happens if I send bad context?

Context is validated and sanitized server-side. Invalid fields are silently dropped. The query still executes normally — just without context benefits. No errors are thrown.

---

## §8 — FAQ

**Q: Is context stored anywhere?**
A: No. Context is processed in memory only and never stored in any database. It is transient per request.

**Q: Does context cost extra?**
A: No. Context processing adds zero additional database operations. It may actually reduce costs by improving canonical hit rates (fewer expensive RAG fallbacks).

**Q: What if my product doesn't have clear page names?**
A: Start with `entityHints` only — that's the most impactful field. Add `page` and `feature` as you refine.

**Q: Can context be used with the authenticated search-kb endpoint too?**
A: Yes. Pass `productContext` inside the existing `context` object in the search-kb request body.

**Q: What's the performance impact?**
A: Less than 2ms overhead per request. Negligible compared to network latency.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial customer documentation |
