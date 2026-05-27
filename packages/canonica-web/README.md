# @canonica/web

Optional typed browser helper for the Canonica widget runtime.

This package source is maintained in the Canonica repo. Public registry publishing is a release operation; private beta installs can use the exact snippet from the Canonica dashboard.

The SDK is not the Canonica runtime authority and is not required for installation. The stable public contract remains:

- Script URL: `https://canonica.app/widget/v1/canonica-widget.js`
- Public widget key: `cn_*`
- Browser global: `window.CanonicaWidget`
- Context methods: `setContext()` and `page()`

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
  path: window.location.pathname,
  title: document.title,
  feature: 'billing',
  workflow: 'manage_subscription',
  role: 'owner',
  locale: navigator.language || 'en',
});
```

The helper may load the script, queue context until the runtime is available, and validate/sanitize context before calling the runtime. Public website copy must describe it as an optional helper unless and until package publishing is confirmed.

Recommended environment variables:

```bash
# Next.js / Vercel
NEXT_PUBLIC_CANONICA_WIDGET_KEY=cn_your_widget_key
NEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/v1/canonica-widget.js

# Vite / React SPA
VITE_CANONICA_WIDGET_KEY=cn_your_widget_key
VITE_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/v1/canonica-widget.js

# Nuxt
NUXT_PUBLIC_CANONICA_WIDGET_KEY=cn_your_widget_key
NUXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/v1/canonica-widget.js
```

Only the public `cn_*` widget key and optional script URL belong in browser env. Do not put Firebase service accounts, Canonica admin credentials, private API keys, tenant IDs, store IDs, user IDs, emails, phones, billing data, or customer records in client-side env files.
