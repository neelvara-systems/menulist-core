# @canonica/web

Typed browser helper for the Canonica widget runtime.

This package source is maintained in the Canonica repo. Public registry publishing is a release operation; private beta installs can use the exact snippet from the Canonica dashboard.

```ts
import { createCanonicaWebClient } from '@canonica/web';

const widgetKey = process.env.NEXT_PUBLIC_CANONICA_WIDGET_KEY;
if (!widgetKey) throw new Error('Missing Canonica widget key');

const canonica = createCanonicaWebClient({
  apiKey: widgetKey,
  scriptSrc: process.env.NEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC,
});

await canonica.init();

canonica.page({
  contextKey: 'billing_invoices',
  feature: 'billing',
  page: 'invoices',
  workflow: 'manage_subscription',
  entityHints: ['invoice', 'subscription'],
});
```

The helper only validates safe page context and wraps the existing `window.CanonicaWidget` runtime. It does not add backend reads or writes.

Recommended environment variables:

```bash
# Next.js / Vercel
NEXT_PUBLIC_CANONICA_WIDGET_KEY=cn_your_widget_key
NEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js

# Vite / React SPA
VITE_CANONICA_WIDGET_KEY=cn_your_widget_key
VITE_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js

# Nuxt
NUXT_PUBLIC_CANONICA_WIDGET_KEY=cn_your_widget_key
NUXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js
```

Only the public `cn_*` widget key and optional script URL belong in browser env. Do not put Firebase service accounts, Canonica admin credentials, private API keys, tenant IDs, store IDs, user IDs, or customer records in client-side env files.
